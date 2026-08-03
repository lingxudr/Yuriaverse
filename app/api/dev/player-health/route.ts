import { NextResponse } from 'next/server';
import { isDevAuthorized } from '../../../../lib/devAuth';
import type { AnimeCard } from '../../../../lib/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AuditGroup = { kind: string; tab: string; source: string };
const groups: AuditGroup[] = [
  { kind: 'anime', tab: 'ongoing', source: '' },
  { kind: 'donghua', tab: 'ongoing', source: 'donghua' },
  { kind: 'movie', tab: 'all', source: 'samehadaku' },
  { kind: 'live-action', tab: 'all', source: 'animasu' },
  { kind: 'anime', tab: 'ova', source: 'kusonime' },
  { kind: 'anime', tab: 'batch', source: 'batch' }
];
const base = process.env.NEXTAUTH_URL || 'https://animesu.vercel.app';
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> { return Promise.race([p, new Promise<T>((_, rej)=>setTimeout(()=>rej(new Error('timeout')), ms))]); }
async function getJson(path: string) {
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const started = Date.now();
  try {
    const res = await withTimeout(fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } }), 6000);
    const text = await res.text(); let json: any;
    try { json = JSON.parse(text); } catch { json = { parseError: text.slice(0,160) }; }
    return { ok: res.ok && !json.parseError, status: res.status, json, latencyMs: Date.now()-started, url };
  } catch (e) { return { ok: false, status: 0, json: null, latencyMs: Date.now()-started, url, error: e instanceof Error ? e.message : String(e) }; }
}
async function auditItem(item: AnimeCard, source: string) {
  const qs = source ? `?source=${source}` : '';
  const detailPath = `/api/anime/detail/${encodeURIComponent(item.slug)}${qs}`;
  const detail = await getJson(detailPath);
  const d = detail.json?.data || {};
  const firstEp = d.episodes?.[0];
  const result: any = {
    title: item.title,
    slug: item.slug,
    source,
    detailOk: detail.ok && d.title && !/tidak tersedia|gagal/i.test(d.title),
    detailStatus: detail.status,
    detailLatencyMs: detail.latencyMs,
    detailTitle: d.title,
    poster: Boolean(d.poster),
    episodeCount: d.episodes?.length || 0,
    firstEpisode: firstEp?.slug,
    episodeOk: false,
    episodeStatus: null,
    episodeLatencyMs: null,
    serverCount: 0,
    downloadCount: 0,
    streamOk: false,
    streamStatus: null,
    streamUrl: null,
    issues: [] as string[]
  };
  if (!result.detailOk) result.issues.push('DETAIL_FAILED');
  if (!result.poster) result.issues.push('NO_POSTER');
  if (firstEp?.slug && source !== 'batch' && source !== 'kusonime') {
    const ep = await getJson(`/api/anime/episode/${encodeURIComponent(firstEp.slug)}${qs}`);
    const e = ep.json?.data || {};
    result.episodeOk = ep.ok && e.title && !/tidak tersedia|gagal/i.test(e.title);
    result.episodeStatus = ep.status;
    result.episodeLatencyMs = ep.latencyMs;
    result.serverCount = e.servers?.length || 0;
    result.downloadCount = e.downloads?.length || 0;
    if (!result.episodeOk) result.issues.push('EPISODE_FAILED');
    if (!result.serverCount && !result.downloadCount) result.issues.push('NO_SERVERS_OR_DOWNLOADS');
    const server = e.servers?.find((s: any)=>s.id);
    if (server) {
      if (/^https?:\/\//i.test(server.id)) { result.streamOk = true; result.streamStatus = 200; result.streamUrl = server.id; }
      else {
        const stream = await getJson(`/api/anime/stream?id=${encodeURIComponent(server.id)}`);
        result.streamStatus = stream.status;
        result.streamUrl = stream.json?.data?.url;
        result.streamOk = stream.ok && Boolean(result.streamUrl);
        if (!result.streamOk) result.issues.push('STREAM_RESOLVE_FAILED');
      }
    }
  } else if (source !== 'batch' && source !== 'kusonime') result.issues.push('NO_EPISODE_LIST');
  return result;
}
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key');
  if (!isDevAuthorized(key)) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  const started = Date.now();
  const max = Math.min(5, Math.max(1, Number(new URL(req.url).searchParams.get('max') || 2)));
  const report = [];
  for (const group of groups) {
    const list = await getJson(`/api/category?kind=${group.kind}&tab=${group.tab}&page=1&limit=${max}`);
    const items: AnimeCard[] = (list.json?.data?.items || []).slice(0, max);
    const results = [];
    for (const item of items) results.push(await auditItem(item, item.sourceProvider || group.source));
    report.push({ ...group, listOk: list.ok, listStatus: list.status, listLatencyMs: list.latencyMs, itemCount: items.length, results });
  }
  const flat = report.flatMap((g)=>g.results);
  return NextResponse.json({ ok: flat.every((x)=>!x.issues.length || x.source === 'batch' || x.source === 'kusonime'), at: new Date().toISOString(), latencyMs: Date.now()-started, summary: { groups: report.length, items: flat.length, failed: flat.filter((x)=>x.issues.length).length, serverless: flat.filter((x)=>!x.serverCount && !['batch','kusonime'].includes(x.source)).length }, report }, { headers: { 'cache-control': 'no-store' } });
}
