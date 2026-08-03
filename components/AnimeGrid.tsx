'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { AnimeCard } from '../lib/types';
import { FavoriteButton } from './FavoriteButton';
import { SafeImage } from './SafeImage';
function sourceOf(a: AnimeCard) { const h = `${a.href || ''} ${a.type || ''}`.toLowerCase(); if (h.includes('donghua')) return 'donghua'; if (h.includes('live action')) return 'animasu'; if (h.includes('samehadaku') || h.includes('movie')) return 'samehadaku'; return ''; }
function detailHref(a: AnimeCard) { const s = sourceOf(a); return `/anime/${encodeURIComponent(a.slug)}${s ? `?source=${s}` : ''}`; }
function Poster({src,title}:{src?:string;title:string}){
  const [failed,setFailed]=useState(false);
  const valid = Boolean(src && /^https?:\/\//i.test(src) && !failed);
  return <div className="poster poster-clean">{valid ? <SafeImage src={src} alt={title} fallbackText={title} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 23vw, 15vw" loading="lazy" onError={()=>setFailed(true)}/> : <div className="poster-title-placeholder"><div className="poster-neutral-icon" aria-hidden>▧</div><b>{title}</b><span>Poster belum tersedia</span></div>}</div>
}
export function AnimeGrid({ items }: { items: AnimeCard[] }) {
  if (!items?.length) return <div className="panel empty muted">Data belum tersedia. Sistem tetap mencoba provider cadangan dan cache otomatis.</div>;
  return <div className="grid premium-grid">{items.map((a) => <article className="card anime-premium" key={`${a.slug}-${a.title}`}>
    <Link href={detailHref(a)} prefetch={false}><div className="poster-wrap"><Poster src={a.poster} title={a.title}/>{a.score && <span className="score-badge">{a.score}★</span>}</div>
    <div className="card-body"><div className="title">{a.title}</div><div className="chips">{a.episode && <span className="chip cyan">Episode {a.episode}</span>}<span className="chip">Detail</span>{a.releaseDay && <span className="chip green">{a.releaseDay}</span>}</div></div></Link>
    <FavoriteButton anime={a}/>
  </article>)}</div>;
}
