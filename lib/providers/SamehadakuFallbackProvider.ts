import { config } from '../config';
import { fetchJson } from '../http';
import type { AnimeProvider } from './AnimeProvider';
import type { Genre, HomePayload, ListPayload, ProviderHealth, SchedulePayload } from '../types';
import { card, detailPayload, episodePayload, genre, isValidEmbedUrl, listPayload, schedulePayload, unwrap } from './normalizers';

export class SamehadakuFallbackProvider implements AnimeProvider {
  name = 'sanka-samehadaku-fallback';
  constructor(private baseUrl = config.sankaBaseUrl) {}
  private url(path: string) { return `${this.baseUrl.replace(/\/$/, '')}${path}`; }
  private get<T>(path: string) { return fetchJson<T>(this.url(path)); }

  async home(): Promise<HomePayload> {
    const json: any = await this.get('/anime/samehadaku/home');
    const data = unwrap(json);
    const recent = data?.recent?.animeList ?? data?.recent ?? data?.latest ?? [];
    const popular = data?.popular?.animeList ?? data?.popular ?? [];
    return { ongoing: recent.map(card), complete: popular.map(card), popular: popular.map(card), source: this.name };
  }
  async ongoing(page = 1): Promise<ListPayload> { return listPayload(await this.get(`/anime/samehadaku/ongoing?page=${page}&order=latest`), this.name, page); }
  async complete(page = 1): Promise<ListPayload> { return listPayload(await this.get(`/anime/samehadaku/completed?page=${page}&order=latest`), this.name, page); }
  async detail(slug: string) { return detailPayload(await this.get(`/anime/samehadaku/anime/${encodeURIComponent(slug)}`)); }
  async episode(slug: string) { return episodePayload(await this.get(`/anime/samehadaku/episode/${encodeURIComponent(slug)}`)); }
  async search(keyword: string, page = 1) { return listPayload(await this.get(`/anime/samehadaku/search?q=${encodeURIComponent(keyword)}&page=${page}`), this.name, page); }
  async genres(): Promise<Genre[]> { return (unwrap(await this.get('/anime/samehadaku/genres'))?.genreList ?? unwrap(await this.get('/anime/samehadaku/genres')) ?? []).map(genre); }
  async genre(slug: string, page = 1) { return listPayload(await this.get(`/anime/samehadaku/genres/${encodeURIComponent(slug)}?page=${page}`), this.name, page); }
  async schedule(): Promise<SchedulePayload> { return schedulePayload(await this.get('/anime/samehadaku/schedule'), this.name); }
  async stream(serverId: string) {
    const json: any = await this.get(`/anime/samehadaku/server/${encodeURIComponent(serverId)}`);
    const url = unwrap(json)?.url ?? unwrap(json)?.streamUrl;
    if (!isValidEmbedUrl(url)) throw new Error('Invalid fallback stream server URL');
    return { url, serverId };
  }
  async batch(slug: string) {
    const data = unwrap(await this.get(`/anime/samehadaku/batch/${encodeURIComponent(slug)}`));
    return { title: data?.title, downloads: data?.downloads ?? data?.downloadUrl?.qualities ?? [], raw: data };
  }
  async health(): Promise<ProviderHealth> {
    const started = Date.now();
    try { await this.get('/anime/samehadaku/genres'); return { name: this.name, ok: true, latencyMs: Date.now() - started }; }
    catch (e) { return { name: this.name, ok: false, latencyMs: Date.now() - started, message: e instanceof Error ? e.message : String(e) }; }
  }
}
