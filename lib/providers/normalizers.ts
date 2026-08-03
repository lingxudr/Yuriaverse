import type { AnimeCard, AnimeDetail, DownloadLink, EpisodeDetail, EpisodeItem, Genre, ListPayload, SchedulePayload, StreamServer } from '../types';
import { toSlug } from '../utils/slug';

const asArray = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const str = (v: unknown) => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v && typeof v === 'object') {
    const o = v as any;
    return String(o.value ?? o.total_episode ?? o.totalEpisodes ?? o.episode_count ?? o.episodes_count ?? o.count ?? o.total ?? '');
  }
  return v == null ? undefined : String(v);
};
const first = (...v: unknown[]) => v.find((x) => x !== undefined && x !== null && x !== '' && x !== 'N/A');

function providerSlug(input: unknown, fallback = ''): string {
  let raw = str(input) || fallback;
  raw = raw.split('?')[0].replace(/\/$/, '').split('/').pop() || raw;
  try { raw = decodeURIComponent(raw); } catch {}
  // If the value came from provider slug/id, preserve unicode characters such as ∞.
  if (/[-_]/.test(raw) && !/\s/.test(raw)) return raw.replace(/\/+$/g, '');
  return toSlug(raw);
}
const firstUrl = (...v: unknown[]) => str(first(...v))?.trim();
const pickImage = (o: any) => firstUrl(o?.poster, o?.thumbnail, o?.image, o?.cover, o?.banner, o?.img, o?.imageUrl, o?.coverUrl, o?.posterUrl, o?.images?.jpg?.image_url, o?.images?.webp?.image_url);

export function unwrap(json: any) { return json?.data ?? json?.result ?? json?.detail ?? json; }

export function card(item: any): AnimeCard {
  const title = str(first(item?.title, item?.judul, item?.anime, item?.name, item?.animeTitle)) || 'Tanpa judul';
  const rawSlug = str(first(item?.animeId, item?.slug, item?.endpoint, item?.id, item?.href, item?.url, title)) || title;
  const genres = asArray(item?.genreList ?? item?.genres ?? item?.genre).map((g: any) => str(g?.title ?? g?.name ?? g)).filter(Boolean).join(', ');
  return {
    title,
    slug: providerSlug(rawSlug, title),
    poster: pickImage(item),
    episode: str(first(item?.episode, item?.episodes, item?.eps, item?.latestEpisode, item?.latest_episode, item?.episode_count, item?.episodes_count, item?.total_episode)),
    score: str(first(item?.score?.value, item?.score, item?.rating, item?.mal_score)),
    status: str(first(item?.status, item?.status_or_day)),
    type: str(first(item?.type, item?.format, genres)),
    releaseDay: str(first(item?.releaseDay, item?.day)),
    latestRelease: str(first(item?.latestReleaseDate, item?.lastReleaseDate, item?.date, item?.updatedAt, item?.released, item?.released_on)),
    href: str(item?.href)
  };
}

export function genre(item: any): Genre {
  const name = str(first(item?.title, item?.name, item?.genre, item)) || 'Genre';
  return { name, slug: providerSlug(first(item?.genreId, item?.slug, item?.id, item?.href), name), href: str(item?.href), count: Number(item?.count) || undefined };
}

export function episodeItem(item: any): EpisodeItem {
  const title = str(first(item?.title, item?.name, item?.episode)) || 'Episode';
  return {
    title,
    slug: providerSlug(first(item?.episodeId, item?.slug, item?.id, item?.href), title),
    episode: str(first(item?.eps, item?.episode, item?.number, title.match(/episode\s*(\d+)/i)?.[1])),
    date: str(first(item?.date, item?.releaseDate, item?.released)),
    href: str(item?.href)
  };
}

function arraysFromObject(data: any) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.values(data).filter(Array.isArray);
}

export function listPayload(json: any, source: string, page = 1): ListPayload {
  const data = unwrap(json);
  const candidates = [data?.animeList, data?.anime_list, data?.batchList, data?.animes, data?.ongoing_donghua, data?.completed_donghua, data?.latest_donghua, data?.movies, data?.results, data?.items, data?.list, data?.anime, ...arraysFromObject(data)];
  const arr = asArray(candidates.find(Array.isArray) ?? data);
  return {
    items: arr.map(card).filter((x) => x.slug && x.title !== 'Tanpa judul'),
    pagination: {
      page: Number(data?.pagination?.currentPage ?? data?.pagination?.current_page ?? data?.pagination?.currentPage ?? json?.pagination?.currentPage ?? page),
      hasNextPage: Boolean(data?.pagination?.hasNextPage ?? data?.pagination?.hasNext ?? json?.pagination?.hasNextPage ?? data?.hasNextPage),
      totalPages: Number(data?.pagination?.totalPages ?? json?.pagination?.totalPages) || undefined
    },
    source
  };
}

export function detailPayload(json: any): AnimeDetail {
  const data = unwrap(json);
  const synopsis = Array.isArray(data?.synopsis?.paragraphs) ? data.synopsis.paragraphs.join('\n\n') : str(first(data?.synopsis, data?.description, data?.desc, data?.summary));
  return {
    title: str(first(data?.title, data?.judul, data?.english, data?.japanese, data?.synonym, data?.name)) || 'Tanpa judul',
    slug: providerSlug(first(data?.animeId, data?.slug, data?.endpoint, data?.href), str(data?.title) || ''),
    poster: pickImage(data),
    synopsis,
    status: str(first(data?.status, data?.status_or_day)),
    rating: str(first(data?.score?.value, data?.score, data?.rating, data?.mal_score)),
    duration: str(first(data?.duration, data?.durasi)),
    studio: str(first(data?.studios, data?.studio, data?.studio_name)),
    released: str(first(data?.aired, data?.released, data?.release_date, data?.released_on, data?.updated_on)),
    genres: asArray(data?.genreList ?? data?.genres ?? data?.genre).map(genre),
    episodes: asArray(data?.episodeList ?? data?.episodes ?? data?.episodes_list).map(episodeItem),
    batchSlug: data?.batch?.batchId || data?.batchList?.[0]?.batchId || data?.batches?.[0]?.slug || (data?.batch?.href ? toSlug(data.batch.href) : undefined),
    raw: data
  };
}

export function episodePayload(json: any): EpisodeDetail {
  const data = unwrap(json);
  const servers: StreamServer[] = [];
  const defaultUrl = str(first(data?.defaultStreamingUrl, data?.streaming?.main_url?.url));
  if (defaultUrl && /^https?:\/\//.test(defaultUrl)) servers.push({ id: defaultUrl, name: str(data?.streaming?.main_url?.name) || 'Default', quality: 'Auto', type: 'direct-url' });
  for (const rawQ of asArray(data?.server?.qualities ?? data?.servers ?? data?.streams ?? data?.streaming?.servers)) {
    const q: any = rawQ;
    const quality = str(q?.title ?? q?.quality ?? q?.name?.match?.(/(360|480|720|1080|4k)/i)?.[0]);
    for (const rawS of asArray(q?.serverList ?? q?.servers ?? q?.urls ?? (q?.url || q?.serverId ? [q] : []))) {
      const s: any = rawS;
      const id = str(first(s?.serverId, s?.id, s?.dataId, s?.url));
      if (!id || id.length < 3) continue;
      servers.push({ id, name: (str(first(s?.title, s?.name)) || 'Server').trim(), quality, type: str(s?.type) });
    }
  }
  const downloads: DownloadLink[] = [];
  const downloadSources = [
    ...asArray(data?.downloadUrl?.qualities),
    ...asArray(data?.downloadUrl?.formats).flatMap((f:any)=>asArray(f?.qualities).map((q:any)=>({...q, format:f?.title}))),
    ...asArray(data?.downloadLinks),
    ...asArray(data?.downloads),
    ...asArray(data?.download_url)
  ];
  for (const rawQ of downloadSources) {
    const q: any = rawQ;
    for (const rawU of asArray(q?.urls ?? q?.links ?? (q?.url ? [q] : []))) {
      const u: any = rawU;
      const url = str(u?.url);
      if (!url || !/^https?:\/\//.test(url)) continue;
      downloads.push({ quality: str(first(q?.title, q?.quality, q?.resolution, q?.format)), server: str(first(u?.title, u?.server, u?.name, u?.host)), url, size: str(q?.size ?? u?.size) });
    }
  }
  return {
    title: str(first(data?.title, data?.episode)) || 'Episode',
    slug: providerSlug(first(data?.episodeId, data?.slug, data?.href), str(data?.title) || ''),
    animeSlug: str(first(data?.animeId, data?.animeSlug, data?.donghua_details?.slug)),
    poster: pickImage(data) || pickImage(data?.donghua_details),
    previousEpisode: data?.prevEpisode?.episodeId || data?.navigation?.previous_episode?.slug || (data?.prevEpisode?.href ? toSlug(data.prevEpisode.href) : undefined),
    nextEpisode: data?.nextEpisode?.episodeId || data?.navigation?.next_episode?.slug || (data?.nextEpisode?.href ? toSlug(data.nextEpisode.href) : undefined),
    servers,
    downloads,
    raw: data
  };
}

export function schedulePayload(json: any, source: string): SchedulePayload {
  const data = unwrap(json);
  const rawDays = Array.isArray(data?.days ?? data?.schedule ?? data?.list) ? (data?.days ?? data?.schedule ?? data?.list) : Object.entries(data?.schedule || data || {}).map(([day, items]) => ({ day, items }));
  const days = asArray(rawDays).map((d: any) => ({
    day: str(first(d?.day, d?.title, d?.name)) || 'Hari',
    items: asArray(d?.animeList ?? d?.items ?? d?.anime ?? d?.list ?? d?.[1]).map(card)
  })).filter((d) => d.items.length || d.day);
  return { days, source };
}

export function isValidEmbedUrl(url?: string): url is string {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    const u = new URL(url);
    const bad = ['javascript:', 'data:', 'file:'];
    return !bad.includes(u.protocol) && !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u.hostname);
  } catch { return false; }
}
