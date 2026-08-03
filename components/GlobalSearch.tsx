'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LightIcon } from './LightIcon';

type Tab = 'all' | 'anime' | 'donghua' | 'movie' | 'manga';
type ResultItem = {
  id: string;
  title: string;
  poster?: string;
  href: string;
  type: Exclude<Tab, 'all'>;
  badge?: string;
  meta?: string;
  source?: string;
};

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'anime', label: 'Anime' },
  { id: 'donghua', label: 'Donghua' },
  { id: 'movie', label: 'Movie' },
  { id: 'manga', label: 'Manga' }
];

const examples = ['One Piece', 'Solo Leveling', 'Dandadan', 'Murim', 'Isekai', 'Romance'];

async function json(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(url);
  return res.json();
}

function slugify(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function mangaPoster(url = '', title = 'Manga') {
  return `/api/manga/poster?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&type=Manga`;
}

function animeHref(item: any, fallbackSource = '') {
  const source = item?.sourceProvider || item?.source || fallbackSource;
  const slug = item?.slug || item?.id || slugify(item?.title || 'anime');
  return `/anime/${encodeURIComponent(slug)}${source && !['anime','sanka-anime-all-display'].includes(source) ? `?source=${encodeURIComponent(source)}` : ''}`;
}

function mapCategory(kind: Exclude<Tab, 'all'|'manga'>, payload: any): ResultItem[] {
  const items = payload?.data?.items || payload?.items || [];
  return items.slice(0, 18).map((item: any, i: number) => ({
    id: `${kind}-${item.slug || item.id || i}`,
    title: item.title || 'Tanpa judul',
    poster: item.poster || item.image || item.thumbnail,
    href: animeHref(item, kind === 'donghua' ? 'donghua' : kind === 'movie' ? 'samehadaku' : ''),
    type: kind,
    badge: item.episode ? `EP ${item.episode}` : item.status || item.type || kind.toUpperCase(),
    meta: item.status || item.latestRelease || item.type || item.sourceProvider || 'Detail tersedia',
    source: item.sourceProvider || item.source
  }));
}

function mapManga(payload: any): ResultItem[] {
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items.slice(0, 18).map((item: any, i: number) => ({
    id: `manga-${item.id || i}`,
    title: item.title || 'Tanpa judul',
    poster: mangaPoster(item.image || item.cover || item.poster || '', item.title || 'Manga'),
    href: `/manga/${encodeURIComponent(item.id || slugify(item.title || 'manga'))}`,
    type: 'manga',
    badge: item.displayChapter || item.latestChapter || item.chapter || item.sourceBadge || 'Manga',
    meta: item.hasFreshMirror ? `Update via ${item.latestProvider || item.displayProvider || 'mirror'}` : (item.updateTime || item.genre || item.source || 'Update manga'),
    source: item.source || 'Manga'
  }));
}

function uniq(items: ResultItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ResultCard({ item }: { item: ResultItem }) {
  const [bad, setBad] = useState(!item.poster);
  const tone = item.type === 'anime' ? 'bg-red-500' : item.type === 'donghua' ? 'bg-yellow-400 text-black' : item.type === 'movie' ? 'bg-orange-500' : 'bg-violet-500';
  return <Link href={item.href} prefetch={false} className="global-search-card">
    <div className="global-search-poster">
      {!bad && item.poster ? <Image src={item.poster} alt={item.title} fill sizes="(max-width:640px) 44vw, (max-width:1024px) 180px, 210px" quality={70} className="object-cover" onError={()=>setBad(true)}/> : <div className="global-search-fallback"><span>{item.type}</span></div>}
      <b className={`global-search-type ${tone}`}>{item.type}</b>
    </div>
    <div className="global-search-body">
      <h3>{item.title}</h3>
      <p>{item.meta}</p>
      <span>{item.badge}</span>
    </div>
  </Link>;
}

export function GlobalSearch({ initial = '' }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const [active, setActive] = useState<Tab>('all');
  const [items, setItems] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const query = q.trim();

  useEffect(() => {
    if (!query || query.length < 2) { setItems([]); setLoading(false); setError(''); return; }
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      const calls = await Promise.allSettled([
        json(`/api/category?kind=anime&tab=all&q=${encodeURIComponent(query)}&page=1&limit=24`),
        json(`/api/category?kind=donghua&tab=all&q=${encodeURIComponent(query)}&page=1&limit=24`),
        json(`/api/category?kind=movie&tab=all&q=${encodeURIComponent(query)}&page=1&limit=24`),
        json(`/api/manga/search?q=${encodeURIComponent(query)}&limit=30`)
      ]);
      if (!alive) return;
      const next = uniq([
        ...(calls[0].status === 'fulfilled' ? mapCategory('anime', calls[0].value) : []),
        ...(calls[1].status === 'fulfilled' ? mapCategory('donghua', calls[1].value) : []),
        ...(calls[2].status === 'fulfilled' ? mapCategory('movie', calls[2].value) : []),
        ...(calls[3].status === 'fulfilled' ? mapManga(calls[3].value) : [])
      ]);
      setItems(next);
      if (!next.length) setError('Tidak ada hasil yang cocok. Coba kata kunci lain.');
      setLoading(false);
    }, 260);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);

  const filtered = useMemo(() => active === 'all' ? items : items.filter((item) => item.type === active), [active, items]);
  const counts = useMemo(() => ({
    all: items.length,
    anime: items.filter((x)=>x.type==='anime').length,
    donghua: items.filter((x)=>x.type==='donghua').length,
    movie: items.filter((x)=>x.type==='movie').length,
    manga: items.filter((x)=>x.type==='manga').length
  }), [items]);

  return <section className="global-search-page">
    <div className="global-search-hero">
      <span>GLOBAL SEARCH</span>
      <h1>Cari semua koleksi Animesu</h1>
      <p>Anime, donghua, movie, dan manga dalam satu pencarian.</p>
      <form action="/search" className="global-search-box">
        <LightIcon name="search" size={22}/>
        <input name="q" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari One Piece, Solo Leveling, Murim..." autoFocus />
        <button>Cari</button>
      </form>
      <div className="global-search-examples">{examples.map((x)=><button key={x} onClick={()=>setQ(x)} type="button">{x}</button>)}</div>
    </div>

    <div className="global-search-tabs">{tabs.map((tab)=><button key={tab.id} onClick={()=>setActive(tab.id)} className={active===tab.id?'active':''}>{tab.label}<small>{counts[tab.id]}</small></button>)}</div>

    {loading && <div className="global-search-skeleton">{Array.from({length:10}).map((_,i)=><i key={i}/>)}</div>}
    {!loading && error && query.length > 1 && <div className="global-search-empty">{error}</div>}
    {!query && <div className="global-search-empty">Ketik judul untuk mencari anime, donghua, movie, dan manga.</div>}
    {!loading && filtered.length > 0 && <div className="global-search-grid">{filtered.map((item)=><ResultCard key={`${item.type}-${item.href}`} item={item}/>)}</div>}
  </section>;
}
