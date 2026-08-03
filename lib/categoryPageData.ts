import type { AnimeCard, ListPayload } from './types';

export type CategoryPageItem = {
  id: string;
  title: string;
  image?: string;
  href: string;
  episode?: string;
  score?: string;
  meta?: string;
  badge?: string;
  source?: string;
};

type Kind = 'anime' | 'donghua' | 'movie' | 'live-action';

const sourceMap: Record<Kind,string> = { anime:'', donghua:'donghua', movie:'samehadaku', 'live-action':'animasu' };

function sourceFor(kind: Kind, tab: string, item?: AnimeCard) {
  if (item?.sourceProvider) return item.sourceProvider;
  if (kind === 'anime') {
    if (tab === 'movie') return 'samehadaku';
    if (tab === 'batch') return 'batch';
    if (['ova','ona','special'].includes(tab)) return 'kusonime';
  }
  return sourceMap[kind];
}

export function categoryHref(item: AnimeCard, kind: Kind, tab: string) {
  const source = sourceFor(kind, tab, item);
  return `/anime/${encodeURIComponent(item.slug)}${source ? `?source=${source}` : ''}`;
}

export function toCategoryPageItems(items: AnimeCard[] = [], kind: Kind, tab = 'all'): CategoryPageItem[] {
  return items
    .filter((item) => item?.title && item?.slug)
    .map((item) => ({
      id: item.slug,
      title: item.title,
      image: item.poster,
      href: categoryHref(item, kind, tab),
      episode: item.episode ? `EP ${item.episode}` : undefined,
      score: item.score,
      meta: item.status || item.type || item.latestRelease || 'Detail tersedia',
      badge: item.status || item.type || 'SUB',
      source: item.sourceProvider
    }));
}

export type CategoryListPayload = ListPayload;
