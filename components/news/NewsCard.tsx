'use client';
import Image from 'next/image';
import type { NewsItem } from '../../types/news';
import { Bookmark, ExternalLink, Share2 } from 'lucide-react';
import { useState } from 'react';

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit yang lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam yang lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'kemarin';
  return `${d} hari yang lalu`;
}

export function NewsCard({ item }: { item: NewsItem }) {
  const [bad, setBad] = useState(!item.thumbnail);
  function bookmark() {
    const old = JSON.parse(localStorage.getItem('animesu:news-bookmarks') || '[]');
    const next = [item, ...old.filter((x: NewsItem) => x.id !== item.id)].slice(0, 80);
    localStorage.setItem('animesu:news-bookmarks', JSON.stringify(next));
    alert('Berita disimpan ke bookmark.');
  }
  function share() {
    navigator.share?.({ title: item.title, url: item.url }).catch(() => navigator.clipboard?.writeText(item.url));
  }
  return <article className="news-card">
    <a href={item.url} target="_blank" rel="noreferrer" className="news-thumb" aria-label={item.title} style={{position:'relative'}}>{!bad ? <Image src={item.thumbnail} alt={item.title} fill sizes="(max-width: 768px) 92vw, (max-width: 1024px) 46vw, 30vw" quality={70} className="object-cover" onError={() => setBad(true)}/> : <div>{item.sourceIcon}</div>}</a>
    <div className="news-body"><div className="news-meta"><span className="source-icon">{item.sourceIcon}</span><b>{item.source}</b><span>{relativeTime(item.publishedAt)}</span></div>
      <a href={item.url} target="_blank" rel="noreferrer"><h3>{item.title}</h3></a>
      <p>{item.summary}</p>
      <div className="news-actions"><a className="btn secondary" href={item.url} target="_blank" rel="noreferrer">Baca Selengkapnya <ExternalLink size={15}/></a><button className="icon-btn" onClick={bookmark} aria-label="Bookmark berita"><Bookmark size={17}/></button><button className="icon-btn" onClick={share} aria-label="Bagikan berita"><Share2 size={17}/></button></div>
    </div>
  </article>;
}
