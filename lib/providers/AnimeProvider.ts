import type { AnimeDetail, EpisodeDetail, Genre, HomePayload, ListPayload, SchedulePayload, ProviderHealth } from '../types';

export interface AnimeProvider {
  name: string;
  home(): Promise<HomePayload>;
  ongoing(page?: number): Promise<ListPayload>;
  complete(page?: number): Promise<ListPayload>;
  detail(slug: string): Promise<AnimeDetail>;
  episode(slug: string): Promise<EpisodeDetail>;
  search(keyword: string, page?: number): Promise<ListPayload>;
  genres(): Promise<Genre[]>;
  genre(slug: string, page?: number): Promise<ListPayload>;
  schedule(): Promise<SchedulePayload>;
  stream(serverId: string): Promise<{ url: string; serverId: string }>;
  batch(slug: string): Promise<{ title?: string; downloads: unknown[]; raw?: unknown }>;
  health(): Promise<ProviderHealth>;
}
