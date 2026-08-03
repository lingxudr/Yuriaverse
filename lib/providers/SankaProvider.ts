import { config } from '../config';
import { fetchJson } from '../http';
import type { AnimeProvider } from './AnimeProvider';
import type { Genre, HomePayload, ListPayload, ProviderHealth, SchedulePayload } from '../types';
import { card, detailPayload, episodePayload, genre, isValidEmbedUrl, listPayload, schedulePayload, unwrap } from './normalizers';

export class SankaProvider implements AnimeProvider {
  name = 'sanka-otakudesu';
  constructor(private baseUrl = config.sankaBaseUrl) {}
  private url(path: string) { return `${this.baseUrl.replace(/\/$/, '')}${path}`; }
  private get<T>(path: string) { return fetchJson<T>(this.url(path)); }

  async home(): Promise<HomePayload> {
    const json: any = await this.get('/anime/home');
    const data = unwrap(json);
    return {
      ongoing: (data?.ongoing?.animeList ?? []).map(card),
      complete: (data?.completed?.animeList ?? data?.complete?.animeList ?? []).map(card),
      popular: (data?.popular?.animeList ?? []).map(card),
      source: this.name
    };
  }
  async ongoing(page = 1): Promise<ListPayload> { return listPayload(await this.get(`/anime/ongoing-anime?page=${page}`), this.name, page); }
  async complete(page = 1): Promise<ListPayload> { return listPayload(await this.get(`/anime/complete-anime?page=${page}`), this.name, page); }
  async detail(slug: string) {
    const candidates = Array.from(new Set([slug, slug.replace(/-e2-88-9e/g, '∞')]));
    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const detail = detailPayload(await this.get(`/anime/anime/${encodeURIComponent(candidate)}`));
        if (detail.title && detail.title !== 'Anime tidak tersedia') return detail;
      } catch (error) { lastError = error; }
    }
    throw lastError instanceof Error ? lastError : new Error('Detail not found');
  }
  async episode(slug: string) { return episodePayload(await this.get(`/anime/episode/${encodeURIComponent(slug)}`)); }
  async search(keyword: string, page = 1) { return listPayload(await this.get(`/anime/search/${encodeURIComponent(keyword)}?page=${page}`), this.name, page); }
  async genres(): Promise<Genre[]> { return (unwrap(await this.get('/anime/genre'))?.genreList ?? unwrap(await this.get('/anime/genre')) ?? []).map(genre); }
  async genre(slug: string, page = 1) { return listPayload(await this.get(`/anime/genre/${encodeURIComponent(slug)}?page=${page}`), this.name, page); }
  async schedule(): Promise<SchedulePayload> { return schedulePayload(await this.get('/anime/schedule'), this.name); }
  async stream(serverId: string) {
    const json: any = await this.get(`/anime/server/${encodeURIComponent(serverId)}`);
    const url = unwrap(json)?.url;
    if (!isValidEmbedUrl(url)) throw new Error('Invalid stream server URL');
    return { url, serverId };
  }
  async batch(slug: string) {
    const json: any = await this.get(`/anime/batch/${encodeURIComponent(slug)}`);
    const data = unwrap(json);
    return { title: data?.title, downloads: data?.downloadUrl?.qualities ?? data?.downloads ?? [], raw: data };
  }
  async health(): Promise<ProviderHealth> {
    const started = Date.now();
    try { await this.get('/anime/genre'); return { name: this.name, ok: true, latencyMs: Date.now() - started }; }
    catch (e) { return { name: this.name, ok: false, latencyMs: Date.now() - started, message: e instanceof Error ? e.message : String(e) }; }
  }
}
