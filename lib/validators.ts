import type { AnimeDetail, EpisodeDetail, EpisodeItem } from './types';
export function validDetail(d?: Partial<AnimeDetail> | null) {
  if (!d) return false;
  if (!d.title || /tidak tersedia|gagal mengambil/i.test(d.title)) return false;
  if (!d.slug) return false;
  return Boolean(d.poster || d.synopsis || d.genres?.length || d.episodes?.length);
}
export function validEpisodeItem(e?: Partial<EpisodeItem> | null) { return Boolean(e?.title && e?.slug); }
export function validEpisode(d?: Partial<EpisodeDetail> | null) {
  if (!d) return false;
  if (!d.title || /tidak tersedia|gagal mengambil/i.test(d.title)) return false;
  return Boolean(d.servers?.length || d.downloads?.length);
}
