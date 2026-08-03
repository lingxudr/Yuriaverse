import { NextResponse } from 'next/server';
import { config } from '../../../lib/config';
import { fetchJson } from '../../../lib/http';
import { listPayload } from '../../../lib/providers/normalizers';
import { toSlug } from '../../../lib/utils/slug';
import type { AnimeCard, ListPayload } from '../../../lib/types';
import { getAllAnimeList, getAnidongList, getAnidongSearchList, getLiveActionList, getMovieList } from '../../../lib/specialSources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const base = () => config.sankaBaseUrl.replace(/\/$/, '');
const empty = (page: number, source = 'empty'): ListPayload => ({ items: [], pagination: { page, hasNextPage: false }, source });

function providerFor(kind: string, tab: string, source: string) {
  if (kind === 'donghua') return 'donghua';
  if (kind === 'live-action') return 'animasu';
  if (kind === 'movie') return 'samehadaku';
  if (kind === 'anime' && tab === 'movie') return 'samehadaku';
  if (kind === 'anime' && tab === 'batch') return 'batch';
  if (kind === 'anime' && ['ova','ona','special'].includes(tab)) return 'kusonime';
  if (source.includes('animasu')) return 'animasu';
  if (source.includes('anidong')) return 'anidong';
  return 'otakudesu';
}
function cleanList<T extends ListPayload | (ListPayload & { totalItems?: number })>(data: T, kind = '', tab = ''): T {
  const sourceProvider = providerFor(kind, tab, data.source || '');
  const items = (data.items || [])
    .filter((item) => item.title && item.slug && item.poster)
    .map((item) => {
      const source = sourceProvider ? `?source=${sourceProvider}` : '';
      const encoded = encodeURIComponent(item.slug);
      return { ...item, sourceProvider, detailUrl: `/anime/${encoded}${source}`, watchUrl: `/anime/${encoded}${source}` };
    });
  return { ...data, items, pagination: { ...data.pagination, hasNextPage: items.length > 0 && Boolean(data.pagination?.hasNextPage) } };
}


function limitList<T extends ListPayload | (ListPayload & { totalItems?: number })>(data: T, limit: number): T {
  const items = data.items || [];
  if (items.length <= limit) return data;
  return { ...data, items: items.slice(0, limit), pagination: { ...data.pagination, hasNextPage: true } };
}

async function fetchList(path: string, page: number, source: string): Promise<ListPayload> {
  try { return listPayload(await fetchJson(`${base()}${path}`), source, page); }
  catch { return empty(page, source); }
}

async function firstNonEmpty(page: number, candidates: Array<[string, string]>): Promise<ListPayload> {
  for (const [path, source] of candidates) {
    const data = await fetchList(path, page, source);
    if (data.items.length) return data;
  }
  return empty(page, candidates[0]?.[1] || 'empty');
}

async function animeAll(page: number, limit: number): Promise<ListPayload & { totalItems: number }> {
  try {
    const json: any = await fetchJson(`${base()}/anime/unlimited`);
    const groups = json?.data?.list || json?.list || [];
    const items: AnimeCard[] = groups.flatMap((g: any) => (g?.animeList || []).map((a: any) => ({
      title: a.title || 'Tanpa judul', slug: toSlug(a.animeId || a.slug || a.href || a.title), href: a.href, type: 'Anime'
    })));
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), pagination: { page, hasNextPage: start + limit < items.length, totalPages: Math.ceil(items.length / limit) }, source: 'sanka-anime-unlimited', totalItems: items.length };
  } catch { return { ...empty(page, 'anime-all-empty'), totalItems: 0 }; }
}

async function donghuaAll(page: number): Promise<ListPayload> {
  const [ongoing, latest, completed] = await Promise.all([
    fetchList(`/anime/donghua/ongoing/${page}`, page, 'sanka-donghua-ongoing'),
    fetchList(`/anime/donghua/latest/${page}`, page, 'sanka-donghua-latest'),
    fetchList(`/anime/donghua/completed/${page}`, page, 'sanka-donghua-completed')
  ]);
  const items = [...ongoing.items, ...latest.items, ...completed.items].filter((a, i, arr) => arr.findIndex((b) => b.slug === a.slug) === i);
  return { items, pagination: { page, hasNextPage: true }, source: 'sanka-donghua-all' };
}

async function animeAllDisplay(page: number): Promise<ListPayload> {
  const [ongoing, completed, animasuLatest] = await Promise.all([
    fetchList(`/anime/ongoing-anime?page=${page}`, page, 'sanka-anime-ongoing'),
    fetchList(`/anime/complete-anime?page=${page}`, page, 'sanka-anime-completed'),
    fetchList(`/anime/animasu/latest?page=${page}`, page, 'sanka-animasu-latest')
  ]);
  const items = [...ongoing.items, ...completed.items, ...animasuLatest.items]
    .filter((a, i, arr) => a.slug && a.title && a.poster && arr.findIndex((b) => b.slug === a.slug) === i)
    .map((a) => ({ ...a, sourceProvider: a.href?.includes('animasu') ? 'animasu' as const : undefined }));
  return { items, pagination: { page, hasNextPage: items.length > 0 }, source: 'sanka-anime-all-display' };
}


function filterByTab(data: ListPayload, tab: string): ListPayload {
  const f = tab.toLowerCase();
  if (f === 'all') return data;
  const items = data.items.filter((item) => {
    const text = `${item.title} ${item.status || ''} ${item.type || ''} ${item.episode || ''}`.toLowerCase();
    if (f === 'ongoing') return text.includes('ongoing') || Boolean(item.episode);
    if (f === 'completed') return text.includes('complete') || text.includes('finished') || text.includes('selesai');
    if (f === 'movie') return text.includes('movie');
    return text.includes(f);
  });
  return { ...data, items };
}

async function searchCategory(kind: string, tab: string, query: string, page: number): Promise<ListPayload> {
  if (kind === 'anime') {
    if (['ova','ona','special'].includes(tab)) return filterByTab(await fetchList(`/anime/kusonime/type/${tab}?page=${page}`, page, `sanka-anime-${tab}`), tab);
    if (tab === 'batch') return filterByTab(await fetchList(`/anime/samehadaku/batch?page=${page}`, page, 'sanka-anime-batch'), 'batch');
    if (tab === 'movie') return filterByTab(await firstNonEmpty(page, [[`/anime/samehadaku/search?q=${encodeURIComponent(query)}&page=${page}`, 'sanka-samehadaku-search'], [`/anime/animasu/search/${encodeURIComponent(query)}?page=${page}`, 'sanka-animasu-search']]), 'movie');
    const data = await firstNonEmpty(page, [[`/anime/search/${encodeURIComponent(query)}?page=${page}`, 'sanka-anime-search'], [`/anime/animasu/search/${encodeURIComponent(query)}?page=${page}`, 'sanka-animasu-search']]);
    if (data.items.length) return filterByTab(data, tab);
    return filterByTab(await getAnidongSearchList('anime', query, page), tab);
  }
  if (kind === 'donghua') {
    const data = await firstNonEmpty(page, [[`/anime/donghua/search/${encodeURIComponent(query)}/${page}`, 'sanka-donghua-search']]);
    if (data.items.length) return filterByTab(data, tab);
    return filterByTab(await getAnidongSearchList('donghua', query, page), tab);
  }
  if (kind === 'movie') {
    return filterByTab(await firstNonEmpty(page, [[`/anime/samehadaku/search?q=${encodeURIComponent(query)}&page=${page}`, 'sanka-samehadaku-search'], [`/anime/animasu/search/${encodeURIComponent(query)}?page=${page}`, 'sanka-animasu-search']]), 'movie');
  }
  if (kind === 'live-action') {
    return filterByTab(await fetchList(`/anime/animasu/search/${encodeURIComponent(query)}?page=${page}`, page, 'sanka-animasu-search'), 'live action');
  }
  return empty(page, 'search-empty');
}

async function liveAction(page: number): Promise<ListPayload> {
  const json: any = await fetchJson(`${base()}/anime/animasu/search/live%20action?page=${page}`).catch(() => null);
  if (!json) return empty(page, 'live-action-empty');
  const arr = json?.animes || json?.data?.animes || [];
  const items = arr.filter((a: any) => `${a.type}`.toLowerCase().includes('live action')).map((a: any) => ({
    title: a.title, slug: toSlug(a.slug || a.href || a.title), poster: a.poster, episode: a.episode, status: a.status_or_day, type: a.type || 'Live Action'
  }));
  return { items, pagination: { page, hasNextPage: Boolean(json?.pagination?.hasNext) }, source: 'sanka-animasu-live-action' };
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const kind = u.searchParams.get('kind') || 'anime';
  const tab = (u.searchParams.get('tab') || 'all').toLowerCase();
  const page = Math.max(1, Number(u.searchParams.get('page') || 1));
  const limit = Math.min(60, Math.max(1, Number(u.searchParams.get('limit') || 24)));
  const query = (u.searchParams.get('q') || '').trim();
  let data: ListPayload | (ListPayload & { totalItems?: number }) = empty(page);

  if (query) {
    data = await searchCategory(kind, tab, query, page);
    return NextResponse.json({ ok: true, data: limitList(cleanList(data, kind, tab), limit) }, { headers: { 'cache-control': 'no-store' } });
  }

  if (kind === 'anime') {
    if (tab === 'all') { data = await animeAllDisplay(page); if (!data.items.length) data = await getAllAnimeList(page, limit); }
    else if (tab === 'ongoing') { data = await firstNonEmpty(page, [[`/anime/ongoing-anime?page=${page}`, 'sanka-anime-ongoing'], [`/anime/animasu/ongoing?page=${page}`, 'sanka-animasu-ongoing']]); if (!data.items.length) data = await getAnidongList('anime','ongoing',page); }
    else if (tab === 'completed') { data = await firstNonEmpty(page, [[`/anime/complete-anime?page=${page}`, 'sanka-anime-completed'], [`/anime/animasu/completed?page=${page}`, 'sanka-animasu-completed']]); if (!data.items.length) data = await getAnidongList('anime','completed',page); }
    else if (tab === 'movie') { data = await getMovieList(page, 'update').catch(() => empty(page, 'sanka-anime-movie')); if (!data.items.length) data = await firstNonEmpty(page, [[`/anime/samehadaku/movies?page=${page}&order=update`, 'sanka-anime-movie'], [`/anime/animasu/movies?page=${page}`, 'sanka-animasu-movie']]); }
    else if (['ova','ona','special'].includes(tab)) data = await fetchList(`/anime/kusonime/type/${tab}?page=${page}`, page, `sanka-anime-${tab}`);
    else if (tab === 'batch') data = await fetchList(`/anime/samehadaku/batch?page=${page}`, page, 'sanka-anime-batch');
  }

  if (kind === 'donghua') {
    if (tab === 'all') { data = await donghuaAll(page); if (!data.items.length) data = await getAnidongList('donghua','all',page); }
    else if (tab === 'ongoing') { data = await firstNonEmpty(page, [[`/anime/donghua/ongoing/${page}`, 'sanka-donghua-ongoing'], [`/anime/donghua/latest/${page}`, 'sanka-donghua-latest']]); if (!data.items.length) data = await getAnidongList('donghua','ongoing',page); }
    else if (tab === 'completed') { data = await fetchList(`/anime/donghua/completed/${page}`, page, 'sanka-donghua-completed'); if (!data.items.length) data = await getAnidongList('donghua','completed',page); }
    else if (tab === 'movie' || tab === 'batch') data = empty(page, `sanka-donghua-${tab}-not-available`);
  }

  if (kind === 'movie') {
    if (tab === 'all' || tab === 'anime movie') { data = await getMovieList(page, 'update').catch(() => empty(page, 'sanka-movie-all')); if (!data.items.length) data = await firstNonEmpty(page, [[`/anime/samehadaku/movies?page=${page}&order=update`, 'sanka-movie-all'], [`/anime/animasu/movies?page=${page}`, 'sanka-animasu-movie']]); }
    else data = empty(page, `sanka-movie-${tab}-not-available`);
  }

  if (kind === 'live-action') {
    if (tab === 'all') { data = await getLiveActionList(page).catch(() => empty(page, 'live-action-empty')); if (!data.items.length) data = await liveAction(page); }
    else data = empty(page, `sanka-live-action-${tab}-not-available`);
  }

  return NextResponse.json({ ok: true, data: limitList(cleanList(data, kind, tab), limit) }, { headers: { 'cache-control': 'no-store' } });
}
