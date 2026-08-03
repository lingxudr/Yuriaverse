export type AnimeCard = {
  title: string;
  slug: string;
  poster?: string;
  episode?: string;
  score?: string;
  status?: string;
  type?: string;
  releaseDay?: string;
  latestRelease?: string;
  href?: string;
  sourceProvider?: 'otakudesu' | 'samehadaku' | 'donghua' | 'animasu' | 'kusonime' | 'batch' | 'anidong';
  detailUrl?: string;
  watchUrl?: string;
};

export type Genre = { name: string; slug: string; href?: string; count?: number };
export type Pagination = { page: number; hasNextPage?: boolean; totalPages?: number };

export type EpisodeItem = {
  title: string;
  slug: string;
  episode?: string;
  date?: string;
  href?: string;
  sourceProvider?: 'otakudesu' | 'samehadaku' | 'donghua' | 'animasu' | 'kusonime' | 'batch' | 'anidong';
  detailUrl?: string;
  watchUrl?: string;
};

export type StreamServer = {
  id: string;
  name: string;
  quality?: string;
  type?: string;
};

export type DownloadLink = {
  quality?: string;
  server?: string;
  url: string;
  size?: string;
};

export type AnimeDetail = {
  title: string;
  slug: string;
  poster?: string;
  synopsis?: string;
  status?: string;
  rating?: string;
  duration?: string;
  studio?: string;
  released?: string;
  genres: Genre[];
  episodes: EpisodeItem[];
  batchSlug?: string;
  raw?: unknown;
};

export type EpisodeDetail = {
  title: string;
  slug: string;
  animeSlug?: string;
  poster?: string;
  previousEpisode?: string;
  nextEpisode?: string;
  servers: StreamServer[];
  downloads: DownloadLink[];
  raw?: unknown;
};

export type HomePayload = {
  ongoing: AnimeCard[];
  complete: AnimeCard[];
  popular?: AnimeCard[];
  source: string;
  cached?: boolean;
};

export type ListPayload = {
  items: AnimeCard[];
  pagination: Pagination;
  source: string;
  cached?: boolean;
};

export type SchedulePayload = {
  days: { day: string; items: AnimeCard[] }[];
  source: string;
  cached?: boolean;
};

export type ProviderHealth = {
  name: string;
  ok: boolean;
  latencyMs?: number;
  message?: string;
};
