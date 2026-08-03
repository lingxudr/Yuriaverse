export function valueText(value: unknown, fallback = 'Belum tersedia'): string {
  if (value == null || value === '' || value === 'N/A' || value === '-') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.length ? String(value.length) : fallback;
  if (typeof value === 'object') {
    const v: any = value;
    return valueText(v.total_episode ?? v.totalEpisodes ?? v.episode_count ?? v.episodes_count ?? v.count ?? v.value ?? v.total, fallback);
  }
  return fallback;
}
export function episodeCount(value: unknown, episodes?: unknown[]): string {
  const raw = valueText(value, '');
  if (raw) return /episode/i.test(raw) || raw === 'Movie' ? raw : `${raw} Episode`;
  if (episodes?.length) return `${episodes.length} Episode`;
  return 'Belum tersedia';
}
export function rating(value: unknown): string { return valueText(value, 'Belum ada rating'); }
export function status(value: unknown): string { return valueText(value, 'Belum tersedia'); }
export function duration(value: unknown): string { return valueText(value, 'Belum tersedia'); }
export function releaseDate(value: unknown): string { return valueText(value, 'Belum tersedia'); }
export function studio(value: unknown): string { return valueText(value, 'Belum tersedia'); }
export function genres(list: unknown): string {
  if (!Array.isArray(list) || !list.length) return 'Belum tersedia';
  return list.map((g: any) => g?.name || g?.title || g).filter(Boolean).join(', ') || 'Belum tersedia';
}
