import { config } from './config';
import { fetchJson } from './http';
import { getCached, setCached } from './cache';
import { listPayload } from './providers/normalizers';
import type { AnimeCard, DownloadLink, Genre, ListPayload } from './types';
import { fuzzyMatch, fuzzyScore } from './fuzzy';

const base = () => config.sankaBaseUrl.replace(/\/$/, '');

async function cachedList(key: string, ttl: number, path: string, page: number, source: string): Promise<ListPayload> {
  const fresh = await getCached<ListPayload>(key);
  if (fresh) return fresh.value;
  try {
    const json = await fetchJson(`${base()}${path}`);
    const data = listPayload(json, source, page);
    await setCached(key, data, ttl);
    return data;
  } catch (error) {
    const stale = await getCached<ListPayload>(key, true);
    if (stale) return stale.value;
    throw error;
  }
}

export function getMovieList(page = 1, order = 'update') {
  return cachedList(`movie:${order}:${page}:v2`, config.cacheTtl.medium, `/anime/samehadaku/movies?page=${page}&order=${encodeURIComponent(order)}`, page, 'sanka-samehadaku-movies');
}
export function getPopularList(page = 1) {
  return cachedList(`popular:${page}:v1`, config.cacheTtl.medium, `/anime/samehadaku/popular?page=${page}`, page, 'sanka-samehadaku-popular');
}
export function getDonghuaList(type = 'ongoing', page = 1) {
  const clean = ['ongoing','completed','complete','latest','movie'].includes(type) ? type : 'ongoing';
  const endpoint = clean === 'complete' ? 'completed' : clean === 'movie' ? 'latest' : clean;
  return cachedList(`donghua:${clean}:${page}:v2`, config.cacheTtl.medium, `/anime/donghua/${endpoint}/${page}`, page, `sanka-donghua-${clean}`);
}
import type { AnimeDetail, EpisodeDetail } from './types';
import { detailPayload, episodePayload } from './providers/normalizers';
import { toSlug } from './utils/slug';

export async function getSamehadakuDetail(slug: string): Promise<AnimeDetail> {
  const key = `detail:samehadaku:${slug}:v2`;
  const fresh = await getCached<AnimeDetail>(key);
  if (fresh) return fresh.value;
  const json = await fetchJson(`${base()}/anime/samehadaku/anime/${encodeURIComponent(slug)}`);
  const data = detailPayload(json);
  await setCached(key, data, config.cacheTtl.medium);
  return data;
}

export async function getDonghuaDetail(slug: string): Promise<AnimeDetail> {
  const clean = toSlug(slug);
  const key = `detail:donghua:${clean}:v2`;
  const fresh = await getCached<AnimeDetail>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(`${base()}/anime/donghua/detail/${encodeURIComponent(clean)}`);
  const data: AnimeDetail = {
    title: raw?.title || 'Donghua tidak tersedia',
    slug: clean,
    poster: raw?.poster,
    synopsis: raw?.synopsis,
    status: raw?.status,
    rating: raw?.rating,
    duration: raw?.duration,
    studio: raw?.studio,
    released: raw?.released || raw?.released_on,
    genres: (raw?.genres || []).map((g: any) => ({ name: g.name || g.title, slug: g.slug || g.genreId || toSlug(g.name || g.title || ''), href: g.href })),
    episodes: (raw?.episodes_list || []).map((e: any) => ({ title: e.episode || e.title, slug: toSlug(e.slug || e.href || e.episode), episode: String(e.episode || '').match(/Episode\s+(\d+)/i)?.[1], href: e.href })),
    raw: { ...raw, source: 'Donghua', japanese: raw?.alter_title, producers: raw?.network, episodes: raw?.episodes_count, season: raw?.season, type: raw?.type, country: raw?.country }
  };
  await setCached(key, data, config.cacheTtl.medium);
  return data;
}


function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export async function getAllAnimeList(page = 1, limit = 48, q = ''): Promise<ListPayload & { totalItems: number }> {
  const key = `all-anime:anime-only-rich:v6`;
  const fresh = await getCached<AnimeCard[]>(key);
  let all: AnimeCard[];
  if (fresh) all = fresh.value;
  else {
    const [homeJson, unlimitedJson] = await Promise.all([
      withTimeout(fetchJson<any>(`${base()}/anime/home`), 2200, { data: {} }),
      withTimeout(fetchJson<any>(`${base()}/anime/unlimited`), 2600, { data: { list: [] } })
    ]);
    const home = homeJson?.data || {};
    const homeRich: AnimeCard[] = [...(home?.ongoing?.animeList || []), ...(home?.completed?.animeList || [])].map((a: any) => ({
      title: a.title,
      slug: toSlug(a.animeId || a.href || a.title),
      poster: a.poster,
      episode: String(a.episodes || ''),
      score: a.score,
      releaseDay: a.releaseDay,
      latestRelease: a.latestReleaseDate || a.lastReleaseDate,
      href: a.href,
      status: a.status,
      type: a.type || 'Anime'
    }));
    const groups = unlimitedJson?.data?.list || unlimitedJson?.list || [];
    const unlimited: AnimeCard[] = groups.flatMap((g: any) => (g?.animeList || []).map((a: any) => ({
      title: a.title || 'Tanpa judul',
      slug: toSlug(a.animeId || a.slug || a.href || a.title),
      href: a.href,
      type: 'Anime'
    })));
    const ordered = [...homeRich, ...unlimited];
    const map = new Map<string, AnimeCard>();
    for (const item of ordered) {
      if (!item?.slug) continue;
      const prev = map.get(item.slug);
      if (!prev) map.set(item.slug, item);
      else if (!prev.poster && item.poster) map.set(item.slug, { ...prev, ...item });
    }
    all = Array.from(map.values());
    await setCached(key, all, config.cacheTtl.long);
  }
  const query = q.trim().toLowerCase();
  const filtered = query ? all.filter((a) => fuzzyMatch(a.title, query)).sort((a,b)=>fuzzyScore(b.title, query)-fuzzyScore(a.title, query)) : all;
  const start = (page - 1) * limit;
  return { items: filtered.slice(start, start + limit), pagination: { page, hasNextPage: start + limit < filtered.length, totalPages: Math.ceil(filtered.length / limit) }, source: 'sanka-unlimited-rich', totalItems: filtered.length };
}


export const curatedGenres: Genre[] = [
  'Action','Adventure','Comedy','Drama','Fantasy','Romance','Sci-Fi','Slice of Life','Supernatural','Mystery','Horror','Mecha','Sports','Music','School','Shounen','Shoujo','Seinen','Josei','Isekai','Magic','Martial Arts','Military','Psychological','Thriller','Historical','Game','Demons','Vampire','Samurai','Police','Parody','Kids','Donghua'
].map((name) => ({ name, slug: toSlug(name) }));

export async function getMergedGenres(providerGenres: Genre[] = []) {
  const map = new Map<string, Genre>();
  for (const g of [...providerGenres, ...curatedGenres]) if (g?.slug) map.set(g.slug, { ...g, name: g.name || g.slug });
  return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
}


export async function getDonghuaMultiList(type = 'ongoing', pages = 2): Promise<ListPayload> {
  const lists = await Promise.all(Array.from({ length: pages }, (_, i) => getDonghuaList(type, i + 1).catch(() => ({ items: [], pagination: { page: i + 1 }, source: `donghua-${type}` }))));
  const items = lists.flatMap((x) => x.items).filter((a, i, arr) => arr.findIndex((b) => b.slug === a.slug) === i);
  return { items, pagination: { page: 1, hasNextPage: true }, source: `sanka-donghua-${type}-multi` };
}

export async function getDonghuaSchedule() {
  const key = 'donghua:schedule:v2';
  const fresh = await getCached<any>(key);
  if (fresh) return fresh.value;
  let days: any[] = [];
  try {
    const raw: any = await fetchJson(`${base()}/anime/donghua/schedule`);
    const source = raw?.schedule || raw?.data || raw?.days || raw;
    const arr = Array.isArray(source) ? source : Object.entries(source || {}).map(([day, items]) => ({ day, items }));
    days = arr.map((d: any) => ({ day: d.day || d.title || d.name || 'Hari', items: (d.items || d.animeList || d.anime || d.list || []).map((a: any) => ({ title: a.title || a.name, slug: toSlug(a.slug || a.href || a.title), poster: a.poster, status: a.status, releaseDay: d.day || d.title, href: a.href, type: 'Donghua' })) }));
  } catch {}
  // Some Sanka donghua schedule responses contain only day names without items.
  // Fallback to latest/ongoing donghua so the schedule page is never empty.
  if (!days.some((d) => d.items?.length)) {
    const [ongoing, latest] = await Promise.all([getDonghuaList('ongoing', 1).catch(() => ({ items: [] as AnimeCard[] } as any)), getDonghuaList('latest', 1).catch(() => ({ items: [] as AnimeCard[] } as any))]);
    const pool = [...(ongoing.items || []), ...(latest.items || [])].filter((a, i, arr) => arr.findIndex((b) => b.slug === a.slug) === i);
    const labels = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
    days = labels.map((day, idx) => ({ day, items: pool.filter((_, i) => i % 7 === idx).map((a) => ({ ...a, releaseDay: day, status: a.status || 'Airing', type: 'Donghua' })) })).filter((d) => d.items.length);
  }
  const value = { days, source: 'sanka-donghua-schedule' };
  await setCached(key, value, config.cacheTtl.medium);
  return value;
}

export async function getDonghuaEpisode(slug: string): Promise<EpisodeDetail> {
  const clean = toSlug(slug);
  const key = `episode:donghua:${clean}:v1`;
  const fresh = await getCached<EpisodeDetail>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(`${base()}/anime/donghua/episode/${encodeURIComponent(clean)}`);
  const servers = (raw?.streaming?.servers || []).map((s: any, i: number) => ({ id: s.url, name: s.name || `Server ${i + 1}`, quality: s.name?.match(/(360|480|720|1080)/)?.[0] || 'Auto', type: 'direct-url' })).filter((s: any) => /^https?:\/\//.test(s.id));
  const downloads: any[] = [];
  for (const [qualityKey, links] of Object.entries(raw?.download_url || {})) {
    const quality = qualityKey.replace('download_url_', '').toUpperCase();
    for (const [server, url] of Object.entries(links as Record<string, string>)) if (/^https?:\/\//.test(String(url))) downloads.push({ quality, server, url: String(url) });
  }
  const data: EpisodeDetail = {
    title: raw?.episode || clean,
    slug: clean,
    animeSlug: raw?.donghua_details?.slug,
    poster: raw?.donghua_details?.poster,
    previousEpisode: raw?.navigation?.previous_episode?.slug,
    nextEpisode: raw?.navigation?.next_episode?.slug,
    servers,
    downloads,
    raw
  };
  await setCached(key, data, config.cacheTtl.short);
  return data;
}

export function getLiveActionList(page = 1) {
  return cachedList(`live-action:${page}:v1`, config.cacheTtl.medium, `/anime/animasu/search/live%20action?page=${page}`, page, 'sanka-animasu-live-action');
}

export async function getAnimasuSchedule() {
  const key = 'schedule:animasu:v1';
  const fresh = await getCached<any>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(`${base()}/anime/animasu/schedule`);
  const source = raw?.schedule || raw?.data || raw;
  const days = Object.entries(source || {}).map(([day, items]) => ({
    day,
    items: (Array.isArray(items) ? items : []).map((a: any) => ({
      title: a.title || a.name,
      slug: toSlug(a.slug || a.href || a.title),
      poster: a.poster,
      episode: a.status_or_day && a.status_or_day !== '??' ? String(a.status_or_day) : undefined,
      status: a.episode || 'Airing',
      releaseDay: day,
      href: a.href,
      type: a.type || 'Anime'
    }))
  })).filter((d) => d.items.length);
  const value = { days, source: 'sanka-animasu-schedule' };
  await setCached(key, value, config.cacheTtl.medium);
  return value;
}

export async function getAnimasuDetail(slug: string): Promise<AnimeDetail> {
  const clean = toSlug(slug);
  const key = `detail:animasu:${clean}:v2`;
  const fresh = await getCached<AnimeDetail>(key);
  if (fresh) return fresh.value;

  let d: any = null;
  try {
    const raw: any = await withTimeout(fetchJson(`${base()}/anime/animasu/detail/${encodeURIComponent(clean)}`), 4500, null as any);
    d = raw?.detail || raw?.data || raw;
  } catch {}

  // Compatible fallback: use list/search item so detail page never 504s.
  if (!d?.title) {
    const list = await getLiveActionList(1).catch(() => ({ items: [] as AnimeCard[] } as any));
    const found = (list.items || []).find((x: AnimeCard) => x.slug === clean) || (list.items || [])[0];
    d = found ? { title: found.title, poster: found.poster, status: found.status, type: found.type, episodes: found.episode ? [{ name: found.episode, slug: clean }] : [], synopsis: 'Detail lengkap sedang dimuat dari provider.' } : { title: clean, episodes: [] };
  }

  const data: AnimeDetail = {
    title: d?.title || d?.synonym || clean,
    slug: clean,
    poster: d?.poster,
    synopsis: d?.synopsis,
    status: d?.status,
    rating: d?.rating,
    duration: d?.duration,
    studio: d?.studio,
    released: d?.aired || d?.release,
    genres: (d?.genres || []).map((g: any) => ({ name: g.name || g.title || g, slug: g.slug || toSlug(g.name || g.title || g) })),
    episodes: (d?.episodes || []).map((e: any) => ({ title: e.name || e.title || 'Episode', slug: toSlug(e.slug || e.href || e.name || clean), episode: String(e.name || '').match(/(\d+)/)?.[1] })),
    raw: { ...d, source: 'Animasu', japanese: d?.synonym, producers: d?.author, season: d?.season, trailer: d?.trailer, batches: d?.batches }
  };
  await setCached(key, data, config.cacheTtl.medium);
  return data;
}

export async function getAnimasuEpisode(slug: string): Promise<EpisodeDetail> {
  const clean = toSlug(slug);
  const key = `episode:animasu:${clean}:v1`;
  const fresh = await getCached<EpisodeDetail>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(`${base()}/anime/animasu/episode/${encodeURIComponent(clean)}`);
  const servers = (raw?.streams || raw?.streaming?.servers || []).map((s: any, i: number) => ({ id: s.url, name: s.name || `Server ${i + 1}`, quality: s.name?.match(/(360|480|720|1080)/)?.[0] || 'Auto', type: 'direct-url' })).filter((s: any) => /^https?:\/\//.test(s.id));
  const downloads = (raw?.downloads || []).map((d: any) => ({ quality: d.resolution || d.quality, server: d.name || d.server, url: d.url, size: d.size })).filter((d: any) => /^https?:\/\//.test(d.url));
  const data: EpisodeDetail = { title: raw?.title || clean, slug: clean, servers, downloads, raw };
  await setCached(key, data, config.cacheTtl.short);
  return data;
}

export function getDonghuaGenreList(slug: string, page = 1) {
  return cachedList(`donghua-genre:${slug}:${page}:v1`, config.cacheTtl.medium, `/anime/donghua/genres/${encodeURIComponent(slug)}/${page}`, page, `sanka-donghua-genre-${slug}`);
}

export async function getMovieGenreList(slug: string, page = 1): Promise<ListPayload> {
  const key = `movie-genre:${slug}:${page}:v1`;
  const fresh = await getCached<ListPayload>(key);
  if (fresh) return fresh.value;
  try {
    const data = await cachedList(key + ':raw', config.cacheTtl.medium, `/anime/samehadaku/genres/${encodeURIComponent(slug)}?page=${page}`, page, `sanka-movie-genre-${slug}`);
    const items = data.items.filter((x) => `${x.type} ${x.title}`.toLowerCase().includes('movie'));
    const value = { ...data, items, source: `sanka-movie-genre-${slug}` };
    await setCached(key, value, config.cacheTtl.medium);
    return value;
  } catch {
    return { items: [], pagination: { page }, source: `movie-genre-empty-${slug}` };
  }
}

export async function getLiveActionGenreList(slug: string, page = 1): Promise<ListPayload> {
  const key = `live-action-genre:${slug}:${page}:v1`;
  const fresh = await getCached<ListPayload>(key);
  if (fresh) return fresh.value;
  try {
    const data = await cachedList(key + ':raw', config.cacheTtl.medium, `/anime/animasu/advanced-search?genres=${encodeURIComponent(slug)}&page=${page}`, page, `sanka-live-action-genre-${slug}`);
    const items = data.items.filter((x) => `${x.type} ${x.title}`.toLowerCase().includes('live action'));
    const fallback = items.length ? items : (slug === 'action' || slug === 'comedy' || slug === 'romance' ? (await getLiveActionList(page)).items : []);
    const value = { ...data, items: fallback, source: `sanka-live-action-genre-${slug}` };
    await setCached(key, value, config.cacheTtl.medium);
    return value;
  } catch {
    return { items: [], pagination: { page }, source: `live-action-genre-empty-${slug}` };
  }
}

export function getBatchList(page = 1) {
  return cachedList(`batch:${page}:v1`, config.cacheTtl.medium, `/anime/samehadaku/batch?page=${page}`, page, 'sanka-samehadaku-batch');
}

export function getKusonimeTypeList(type = 'ova', page = 1) {
  const clean = ['ova','ona','special'].includes(type.toLowerCase()) ? type.toLowerCase() : 'ova';
  return cachedList(`kusonime-type:${clean}:${page}:v1`, config.cacheTtl.medium, `/anime/kusonime/type/${clean}?page=${page}`, page, `sanka-kusonime-${clean}`);
}

export async function getKusonimeDetail(slug: string): Promise<AnimeDetail> {
  const clean = toSlug(slug);
  const key = `detail:kusonime:${clean}:v1`;
  const fresh = await getCached<AnimeDetail>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(`${base()}/anime/kusonime/detail/${encodeURIComponent(clean)}`);
  const d = raw?.detail || raw?.data || raw;
  const data: AnimeDetail = {
    title: d?.title || clean,
    slug: clean,
    poster: d?.poster,
    synopsis: d?.synopsis,
    status: d?.info?.status || d?.status,
    rating: d?.info?.score || d?.score || d?.rating,
    duration: d?.info?.duration || d?.duration,
    studio: d?.info?.studio || d?.studio,
    released: d?.info?.released || d?.released,
    genres: (d?.genres || []).map((g: any) => ({ name: g.name || g.title || g, slug: g.slug || toSlug(g.name || g.title || g) })),
    episodes: (d?.download_links || []).map((x: any, i: number) => ({ title: x.resolution || `Episode ${i + 1}`, slug: clean, episode: String(i + 1) })),
    raw: { ...d, source: 'Kusonime', japanese: d?.info?.japanese, producers: d?.info?.producers, episodes: d?.info?.total_episode, type: d?.info?.type, downloads: d?.download_links }
  };
  await setCached(key, data, config.cacheTtl.medium);
  return data;
}

export async function getSamehadakuBatchDetail(slug: string): Promise<AnimeDetail> {
  const clean = toSlug(slug);
  const key = `detail:batch:${clean}:v1`;
  const fresh = await getCached<AnimeDetail>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(`${base()}/anime/samehadaku/batch/${encodeURIComponent(clean)}`);
  const d = raw?.data || raw?.detail || raw;
  const data: AnimeDetail = {
    title: d?.title || clean,
    slug: clean,
    poster: d?.poster,
    synopsis: d?.synopsis || d?.description,
    status: d?.status || 'Completed',
    rating: d?.score || d?.rating,
    duration: d?.duration,
    studio: d?.studio || d?.studios,
    released: d?.released || d?.aired,
    genres: (d?.genreList || d?.genres || []).map((g: any) => ({ name: g.title || g.name || g, slug: g.genreId || g.slug || toSlug(g.title || g.name || g) })),
    episodes: [{ title: d?.title || clean, slug: clean, episode: 'Batch' }],
    raw: { ...d, source: 'Samehadaku Batch' }
  };
  await setCached(key, data, config.cacheTtl.medium);
  return data;
}

export async function getSamehadakuEpisode(slug: string): Promise<EpisodeDetail> {
  const clean = toSlug(slug);
  const key = `episode:samehadaku:${clean}:v1`;
  const fresh = await getCached<EpisodeDetail>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(`${base()}/anime/samehadaku/episode/${encodeURIComponent(clean)}`);
  const data = episodePayload(raw);
  await setCached(key, data, config.cacheTtl.short);
  return data;
}

const anidongBase = () => (process.env.ANIDONG_BASE_URL || 'https://dh.zhadev.my.id').replace(/\/$/, '');
function anidongKey(kind: 'anime' | 'donghua' = 'anime') {
  return kind === 'donghua' ? (process.env.ANIDONG_DONGHUA_API_KEY || process.env.ANIDONG_API_KEY || '') : (process.env.ANIDONG_ANIME_API_KEY || process.env.ANIDONG_API_KEY || '');
}
function anidongPath(path: string, kind: 'anime' | 'donghua' = 'anime') {
  const key = anidongKey(kind);
  const join = path.includes('?') ? '&' : '?';
  return `${anidongBase()}${path}${key ? `${join}apikey=${encodeURIComponent(key)}` : ''}`;
}

export async function getAnidongList(kind: 'anime' | 'donghua', tab = 'ongoing', page = 1): Promise<ListPayload> {
  const endpoint = tab === 'completed' ? 'completed' : tab === 'latest' ? 'home' : tab === 'all' ? 'a-z' : 'ongoing';
  const key = `anidong:${kind}:${endpoint}:${page}:v1`;
  const fresh = await getCached<ListPayload>(key);
  if (fresh) return fresh.value;
  const json: any = await fetchJson(anidongPath(`/api/v1/${kind}/${endpoint}?page=${page}`, kind));
  const data = listPayload(json, `anidong-${kind}-${endpoint}`, page);
  await setCached(key, data, config.cacheTtl.medium);
  return data;
}

export async function getAnidongDetail(slug: string, kind: 'anime' | 'donghua' = 'anime'): Promise<AnimeDetail> {
  const clean = toSlug(slug.split('::')[0]);
  const key = `detail:anidong:${kind}:${clean}:v1`;
  const fresh = await getCached<AnimeDetail>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(anidongPath(`/api/v1/${kind}/detail/${encodeURIComponent(clean)}`, kind));
  const d = raw?.data || raw?.detail || raw;
  const info = d?.information || {};
  const episodes = (d?.episode?.list || d?.episodes || []).map((e: any) => ({ title: e.title || e.name || `Episode ${e.number}`, slug: `${clean}::${e.number || toSlug(e.title || e.name || '')}`, episode: String(e.number || '').replace(/^0+/, '') || undefined, date: e.release_date }));
  const data: AnimeDetail = {
    title: d?.title || clean,
    slug: clean,
    poster: d?.cover?.thumbnail || d?.thumbnail || d?.poster,
    synopsis: d?.synopsis,
    status: info.status,
    rating: d?.rating || d?.score,
    duration: info.duration,
    studio: info.studio,
    released: info.released || info.released_on,
    genres: (d?.genre || d?.genres || []).map((g: any) => ({ name: g.title_genre || g.name || g.title || g, slug: toSlug(g.slug || g.title_genre || g.name || g) })),
    episodes,
    raw: { ...d, source: `Anidong ${kind}`, japanese: d?.alter_title, season: info.season, type: info.type, network: info.network, country: info.country }
  };
  await setCached(key, data, config.cacheTtl.medium);
  return data;
}

function iframeSrcFromBase64(input?: string) {
  if (!input) return '';
  try {
    const html = Buffer.from(input, 'base64').toString('utf8');
    return html.match(/src=["']([^"']+)/i)?.[1] || '';
  } catch { return ''; }
}

export async function getAnidongEpisode(composite: string, kind: 'anime' | 'donghua' = 'anime'): Promise<EpisodeDetail> {
  const [seriesSlug, epRaw] = composite.split('::');
  const clean = toSlug(seriesSlug);
  const episode = epRaw || '1';
  const key = `episode:anidong:${kind}:${clean}:${episode}:v1`;
  const fresh = await getCached<EpisodeDetail>(key);
  if (fresh) return fresh.value;
  const raw: any = await fetchJson(anidongPath(`/api/v1/${kind}/watch/${encodeURIComponent(clean)}/${encodeURIComponent(episode)}`, kind));
  const d = raw?.data || raw;
  const servers = (d?.server || d?.servers || []).map((s: any, i: number) => ({ id: iframeSrcFromBase64(s.server_url) || s.url || s.server_url, name: s.server_name || s.name || `Server ${i + 1}`, quality: 'Auto', type: 'direct-url' })).filter((s: any) => /^https?:\/\//.test(s.id));
  const downloads: DownloadLink[] = [];
  const data: EpisodeDetail = { title: d?.title || `${clean} Episode ${episode}`, slug: composite, animeSlug: clean, poster: d?.thumbnail, servers, downloads, raw: d };
  await setCached(key, data, config.cacheTtl.short);
  return data;
}

export async function getAnidongSearchList(kind: 'anime' | 'donghua', query: string, page = 1): Promise<ListPayload> {
  const key = `anidong-search:${kind}:${query}:${page}:v1`;
  const fresh = await getCached<ListPayload>(key);
  if (fresh) return fresh.value;
  const json: any = await fetchJson(anidongPath(`/api/v1/${kind}/search?s=${encodeURIComponent(query)}&page=${page}`, kind));
  const data = listPayload(json, `anidong-${kind}-search`, page);
  await setCached(key, data, config.cacheTtl.medium);
  return data;
}
