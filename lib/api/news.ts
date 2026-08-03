import type { NewsItem, NewsResponse } from '../../types/news';

const API = 'https://aninews.vercel.app/api/news';

const sourceIconMap: Record<string, string> = {
  MyAnimeList: 'MAL',
  'Anime Corner': 'AC',
  Crunchyroll: 'CR',
  'Anime News Network': 'ANN',
  'Comic Book': 'CB'
};

const dummy: NewsItem[] = [
  {
    id: 'dummy-season-preview',
    title: 'Panduan Anime Musim Ini: Judul Baru yang Wajib Masuk Watchlist',
    summary: 'Musim anime terbaru menghadirkan banyak judul action, romance, fantasy, dan donghua yang menarik untuk diikuti. Simpan berita ini sebagai panduan awal sebelum memilih tontonan berikutnya.',
    thumbnail: '/animesu-logo.png',
    source: 'Animesu Editorial',
    sourceIcon: 'AN',
    publishedAt: new Date().toISOString(),
    url: '/news'
  },
  {
    id: 'dummy-donghua-trend',
    title: 'Donghua Makin Populer di Indonesia, Genre Kultivasi Jadi Favorit',
    summary: 'Donghua bertema kultivasi, wuxia, dan xianxia semakin banyak dicari berkat visual sinematik dan jadwal episode yang konsisten.',
    thumbnail: '/animesu-logo.png',
    source: 'Animesu Editorial',
    sourceIcon: 'AN',
    publishedAt: new Date(Date.now() - 3600_000).toISOString(),
    url: '/donghua'
  }
];

function normalize(item: any, index: number): NewsItem {
  const source = item.source || 'Anime News';
  return {
    id: item.slug || item.id || `${source}-${index}-${item.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: item.title || 'Berita Anime',
    summary: item.excerpt || item.summary || item.description || 'Baca kabar terbaru seputar anime, manga, donghua, seiyuu, dan industri hiburan Jepang.',
    thumbnail: item.image || item.thumbnail || '',
    source,
    sourceIcon: sourceIconMap[source] || source.split(/\s+/).map((x: string) => x[0]).join('').slice(0, 3).toUpperCase(),
    publishedAt: item.date || item.publishedAt || new Date().toISOString(),
    url: item.link || item.url || '#',
    content: item.content,
    tags: item.tags || []
  };
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(API, { next: { revalidate: 300 }, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`AniNews ${res.status}`);
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const items = data.map(normalize).filter((x: NewsItem) => x.title && x.url);
    return items.length ? items : dummy;
  } catch {
    return dummy;
  }
}

export async function getLatestNews(page = 1, limit = 20, opts?: { query?: string; source?: string; sort?: string }): Promise<NewsResponse> {
  const all = await fetchAllNews();
  const query = (opts?.query || '').trim().toLowerCase();
  const source = (opts?.source || '').trim().toLowerCase();
  let items = all.filter((item) => {
    const matchQuery = !query || `${item.title} ${item.summary} ${item.source} ${item.tags?.join(' ')}`.toLowerCase().includes(query);
    const matchSource = !source || item.source.toLowerCase() === source;
    return matchQuery && matchSource;
  });
  if (opts?.sort === 'popular') items = items.sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0) || +new Date(b.publishedAt) - +new Date(a.publishedAt));
  else items = items.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const total = items.length;
  const start = (page - 1) * limit;
  const sources = Array.from(new Set(all.map((x) => x.source))).sort();
  return { items: items.slice(start, start + limit), page, limit, total, hasMore: start + limit < total, sources };
}

export async function searchNews(query: string) { return getLatestNews(1, 20, { query }); }
export async function getNewsBySource(source: string) { return getLatestNews(1, 20, { source }); }
export async function getTopHeadlines() { return getLatestNews(1, 5, { sort: 'popular' }); }
