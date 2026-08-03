export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  thumbnail: string;
  source: string;
  sourceIcon: string;
  publishedAt: string;
  url: string;
  content?: string;
  tags?: string[];
}

export interface NewsResponse {
  items: NewsItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  sources: string[];
}
