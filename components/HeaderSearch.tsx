'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import type { AnimeCard } from '../lib/types';

function saveHistory(q:string){ if(!q.trim()) return; const old=JSON.parse(localStorage.getItem('animesu:search-history')||'[]'); localStorage.setItem('animesu:search-history', JSON.stringify([q.trim(), ...old.filter((x:string)=>x!==q.trim())].slice(0,10))); }

export function HeaderSearch(){
  const [q,setQ]=useState(''); const [items,setItems]=useState<AnimeCard[]>([]); const [focus,setFocus]=useState(false); const r=useRouter();
  useEffect(()=>{ if(q.trim().length<2){setItems([]);return} const t=setTimeout(async()=>{try{const res=await fetch(`/api/anime/suggest?q=${encodeURIComponent(q.trim())}`); const j=await res.json(); setItems((j?.data?.items||[]).slice(0,5));}catch{}},180); return()=>clearTimeout(t)},[q]);
  function go(e:FormEvent){e.preventDefault(); if(q.trim()){saveHistory(q); r.push(`/search?q=${encodeURIComponent(q.trim())}`)}}
  return <form className="header-search" onSubmit={go}><input value={q} onFocus={()=>setFocus(true)} onChange={e=>setQ(e.target.value)} placeholder="Cari anime, movie, donghua..."/><button aria-label="Cari anime">⌕</button>{focus&&items.length>0&&<div className="header-suggest">{items.map(a=><Link key={a.slug} href={`/anime/${a.slug}`} onClick={()=>{saveHistory(q);setFocus(false)}}>{a.poster&&<Image src={a.poster} alt="" width={44} height={60} sizes="44px" quality={60} className="object-cover"/>}<span>{a.title}</span></Link>)}<Link className="all" href={`/search?q=${encodeURIComponent(q)}`} onClick={()=>saveHistory(q)}>Lihat semua hasil</Link></div>}</form>
}
