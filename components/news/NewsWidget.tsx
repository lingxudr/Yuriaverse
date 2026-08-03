'use client';
import Link from 'next/link';
import useSWR from 'swr';
import type { NewsResponse } from '../../types/news';
const fetcher = (u: string) => fetch(u).then((r)=>r.json());
export function NewsWidget() {
  const { data } = useSWR('/api/news?page=1&limit=5', fetcher, { dedupingInterval: 300000 });
  const news: NewsResponse | undefined = data?.data;
  if (!news?.items?.length) return null;
  return <section className="home-section news-widget"><div className="section-head"><div><h2>Berita Anime Terbaru</h2><p className="muted">Kabar terbaru dari dunia anime, manga, movie, dan donghua.</p></div><Link className="btn secondary" href="/news">Lihat Semua Berita →</Link></div><div className="news-widget-list">{news.items.slice(0,5).map((n)=><a href={n.url} target="_blank" rel="noreferrer" className="news-widget-item" key={n.id}><span>{n.sourceIcon}</span><div><b>{n.title}</b><small>{n.source}</small></div></a>)}</div></section>;
}
