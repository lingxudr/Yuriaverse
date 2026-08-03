import { NextResponse } from 'next/server';
import { isDevAuthorized } from '../../../../lib/devAuth';

const { sendMangaAlert } = require('../../../../lib/manga-scraper/core/alert');
const { redisEnabled } = require('../../../../lib/manga-scraper/core/cache');
const { siteConfigs } = require('../../../../site-configs.js');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckResult = {
  group: 'External Source' | 'Internal API' | 'Reader';
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  latencyMs: number;
  title?: string;
  itemCount?: number;
  message?: string;
  skipped?: boolean;
  severity?: 'critical' | 'optional' | 'info';
};

const externalSources = siteConfigs.map((config: any) => ({
  name: config.name,
  url: config.url,
  enabled: config.enabled !== false,
  disabledReason: config.disabledReason || '',
  optional: config.enabled === false || !['Komiku', 'Kiryuu', 'WestManga', 'Komikcast'].includes(config.name)
}));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

function getTitle(html: string) {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
}

function isChallenge(html: string, title = '') {
  const haystack = `${title} ${html.slice(0, 5000)}`.toLowerCase();
  return /just a moment|cloudflare|attention required|cf-mitigated|checking your browser|enable javascript|cf-chl|turnstile|captcha|ddos-guard/.test(haystack);
}

function countMangaCards(html: string) {
  const patterns = [/article\s+class=["'][^"']*ls2/gi, /class=["'][^"']*\bbs\b/gi, /href=["'][^"']*\/manga\//gi, /href=["'][^"']*\/komik\//gi];
  return Math.max(...patterns.map((re) => (html.match(re) || []).length), 0);
}

async function checkExternal(source: any): Promise<CheckResult> {
  const name = source.name;
  const url = source.url;
  if (!source.enabled) return { group: 'External Source', name, url, ok: true, skipped: true, severity: 'info', latencyMs: 0, itemCount: 0, message: source.disabledReason || 'Disabled optional provider' };

  const started = Date.now();
  try {
    const res = await withTimeout(fetch(url, {
      cache: 'no-store',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }
    }), 8000);
    const html = await res.text();
    const title = getTitle(html);
    const challenged = isChallenge(html, title);
    const itemCount = countMangaCards(html);
    return {
      group: 'External Source', name, url, status: res.status,
      ok: (res.ok && !challenged && Boolean(title)) || (challenged && source.optional),
      latencyMs: Date.now() - started,
      title: title || '-',
      itemCount,
      skipped: challenged && source.optional,
      severity: source.optional ? 'optional' : 'critical',
      message: challenged ? (source.optional ? 'Optional provider blocked/challenge; skipped by scraper' : 'Blocked/challenge page detected') : !res.ok ? `HTTP ${res.status}` : undefined
    };
  } catch (error) {
    return { group: 'External Source', name, url, ok: Boolean(source.optional), skipped: Boolean(source.optional), severity: source.optional ? 'optional' : 'critical', latencyMs: Date.now() - started, message: source.optional ? `Optional provider fetch failed; skipped: ${error instanceof Error ? error.message : String(error)}` : (error instanceof Error ? error.message : String(error)) };
  }
}

async function checkJson(url: string, name: string, group: CheckResult['group'], validator: (json: any) => { ok: boolean; itemCount?: number; message?: string }): Promise<CheckResult> {
  const started = Date.now();
  try {
    const res = await withTimeout(fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } }), 12000);
    const json = await res.json().catch(() => null);
    const check = validator(json);
    return { group, name, url, status: res.status, ok: res.ok && check.ok, latencyMs: Date.now() - started, itemCount: check.itemCount, message: check.message };
  } catch (error) {
    return { group, name, url, ok: false, latencyMs: Date.now() - started, message: error instanceof Error ? error.message : String(error) };
  }
}

function badReaderImages(images: string[] = []) {
  const badToken = /logo|avatar|flag|banner|advert|facebook|twitter|instagram|discord|telegram|emoji|sprite|placeholder|favicon|tracking|pixel|lazy\.jpg|thumbnail|komikuplus|asset\/img/i;
  const badAdPath = /(^|[\/._-])ads?([\/._-]|$)|(^|[\/._-])iklan([\/._-]|$)/i;
  return images.filter((url) => badToken.test(url) || badAdPath.test(url));
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const key = requestUrl.searchParams.get('key');
  if (!isDevAuthorized(key)) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });

  const origin = requestUrl.origin;
  const started = Date.now();
  const external = await Promise.all(externalSources.map((source: any) => checkExternal(source)));

  const latest = await checkJson(`${origin}/api/manga/latest`, 'Manga Latest API', 'Internal API', (json) => {
    const data = Array.isArray(json?.data) ? json.data : [];
    return { ok: json?.ok === true && data.length > 0, itemCount: data.length, message: data.length ? undefined : 'No latest manga items' };
  });

  const latestJson = await checkJson(`${origin}/data/latest-manga.json`, 'latest-manga.json', 'Internal API', (json) => {
    const data = Array.isArray(json) ? json : [];
    return { ok: data.length > 0, itemCount: data.length, message: data.length ? undefined : 'latest-manga.json empty/missing' };
  });

  let firstDetailUrl = '';
  try {
    const json = await fetch(`${origin}/api/manga/latest`, { cache: 'no-store' }).then((r) => r.json());
    firstDetailUrl = json?.data?.[0]?.detailUrl || '';
  } catch {}

  const detail = firstDetailUrl ? await checkJson(`${origin}/api/scrape-detail?url=${encodeURIComponent(firstDetailUrl)}`, 'Sample Detail Scrape', 'Internal API', (json) => {
    const chapters = Array.isArray(json?.data?.chapters) ? json.data.chapters : [];
    const genres = Array.isArray(json?.data?.genres) ? json.data.genres : [];
    return { ok: json?.ok === true && chapters.length > 0 && Boolean(json?.data?.synopsis), itemCount: chapters.length, message: chapters.length ? `genres=${genres.length}` : 'No chapters in detail' };
  }) : { group: 'Internal API' as const, name: 'Sample Detail Scrape', url: '', ok: false, latencyMs: 0, message: 'No sample detailUrl' };

  let firstChapterUrl = '';
  if (detail.ok && firstDetailUrl) {
    try {
      const json = await fetch(`${origin}/api/scrape-detail?url=${encodeURIComponent(firstDetailUrl)}`, { cache: 'no-store' }).then((r) => r.json());
      firstChapterUrl = (json?.data?.chapters || []).find((chapter: any) => chapter?.url && chapter.url !== firstDetailUrl && /chapter|ch\-|\/\d+\/?$/i.test(String(chapter.url)))?.url || '';
    } catch {}
  }

  const reader = firstChapterUrl ? await checkJson(`${origin}/api/scrape-chapter?url=${encodeURIComponent(firstChapterUrl)}`, 'Sample Reader Images', 'Reader', (json) => {
    const images = Array.isArray(json?.images) ? json.images : [];
    const bad = badReaderImages(images);
    return { ok: images.length >= 3 && bad.length === 0, itemCount: images.length, message: bad.length ? `Bad image detected: ${bad[0]}` : images.length < 3 ? 'Less than 3 reader images' : undefined };
  }) : { group: 'Reader' as const, name: 'Sample Reader Images', url: '', ok: true, skipped: true, severity: 'info' as const, latencyMs: 0, message: 'No real sample chapterUrl; reader check skipped for this provider sample' };

  const checks = [...external, latest, latestJson, detail, reader];
  const critical = [latest, latestJson, detail, reader];
  const summary = {
    total: checks.length,
    ok: checks.filter((x) => x.ok).length,
    failed: checks.filter((x) => !x.ok).length,
    criticalOk: critical.filter((x) => x.ok).length,
    criticalFailed: critical.filter((x) => !x.ok).length,
    externalOk: external.filter((x) => x.ok).length,
    externalSkipped: external.filter((x) => x.skipped).length,
    externalTotal: external.length,
    externalActiveTotal: external.filter((x) => !x.skipped).length,
    cache: redisEnabled() ? 'redis+memory+disk' : 'memory+disk'
  };

  const ok = critical.every((x) => x.ok);
  if (!ok) {
    const failed = critical.filter((x) => !x.ok).map((x) => `${x.group}/${x.name}: ${x.message || 'failed'}`).join('\n');
    await sendMangaAlert('critical-manga-health', `[Animesu Manga] Critical health failed\n${failed}`);
  }

  return NextResponse.json({ ok, at: new Date().toISOString(), latencyMs: Date.now() - started, summary, checks }, { headers: { 'cache-control': 'no-store' } });
}
