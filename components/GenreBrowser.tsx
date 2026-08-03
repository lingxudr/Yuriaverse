'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Genre } from '../lib/types';
import { fuzzyMatch } from '../lib/fuzzy';
const icon = (s:string) => s.includes('action')?'⚔':s.includes('romance')?'❤':s.includes('comedy')?'😂':s.includes('horror')?'👻':s.includes('fantasy')?'✨':s.includes('school')?'🎒':s.includes('mecha')?'🤖':s.includes('sports')?'🏆':s.includes('music')?'🎵':'🎬';
export function GenreBrowser({ genres }: { genres: Genre[] }) {
  const [q,setQ]=useState(''); const items=useMemo(()=>genres.filter(g=>!q.trim() || fuzzyMatch(`${g.name} ${g.slug}`, q)),[genres,q]);
  return <><div className="search genre-search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari genre: action, romance, mecha, sport..."/><button className="btn" type="button">{items.length} Genre</button></div><div className="genre-grid">{items.map((g)=><Link className="genre-card" href={`/genre/${g.slug}`} key={g.slug}><span className="genre-icon">{icon(g.slug)}</span><b>{g.name}</b><small>{g.count ? `${g.count} anime` : 'Explore anime'}</small></Link>)}</div>{!items.length && <div className="panel muted">Genre tidak ditemukan. Coba kata lain seperti “sport”, “mecha”, atau “romance”.</div>}</> }
