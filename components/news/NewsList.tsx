'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NewsItem, NewsResponse } from '../../types/news';
import { NewsCard } from './NewsCard';
import { NewsFilter } from './NewsFilter';
import { NewsSkeleton } from './NewsSkeleton';

export function NewsList({ initial }: { initial: NewsResponse }) {
  const [items, setItems] = useState<NewsItem[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState('latest');
  const sentinel = useRef<HTMLDivElement | null>(null);
  const sources = useMemo(() => initial.sources || [], [initial.sources]);

  async function load(nextPage = 1, reset = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '20', q: query, source, sort });
      const res = await fetch(`/api/news?${params}`);
      const json = await res.json();
      const data = json.data as NewsResponse;
      setItems((prev) => reset ? data.items : [...prev, ...data.items]);
      setPage(data.page); setHasMore(data.hasMore);
    } finally { setLoading(false); }
  }
  useEffect(() => { const t = setTimeout(() => load(1, true), 300); return () => clearTimeout(t); }, [query, source, sort]);
  useEffect(() => { const el = sentinel.current; if (!el) return; const obs = new IntersectionObserver((e)=>{ if(e[0].isIntersecting && hasMore && !loading) load(page + 1); }, { rootMargin: '500px' }); obs.observe(el); return () => obs.disconnect(); }, [hasMore, loading, page, query, source, sort]);
  return <section><NewsFilter query={query} source={source} sort={sort} sources={sources} onChange={(v)=>{ if(v.query!==undefined)setQuery(v.query); if(v.source!==undefined)setSource(v.source); if(v.sort!==undefined)setSort(v.sort); }}/>{items.length ? <div className="news-grid">{items.map((item)=><NewsCard item={item} key={item.id}/>)}</div> : !loading && <div className="panel empty muted">Berita tidak ditemukan.</div>}{loading && <NewsSkeleton count={6}/>}<div ref={sentinel} style={{ height: 1 }}/></section>;
}
