'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import type { AnimeCard } from '../lib/types';
const fetcher=(u:string)=>fetch(u).then(r=>r.json());
export function LiveSearch({ initial = '' }: { initial?: string }) {
  const [q, setQ] = useState(initial); const [history,setHistory]=useState<string[]>([]); const query = useMemo(() => q.trim(), [q]);
  const { data, isLoading } = useSWR(query.length > 1 ? `/api/anime/suggest?q=${encodeURIComponent(query)}` : null, fetcher, { dedupingInterval: 15000 });
  const items: AnimeCard[] = data?.data?.items || [];
  useEffect(()=>setHistory(JSON.parse(localStorage.getItem('animesu:search-history')||'[]')),[]);
  function save(term:string){ if(!term.trim()) return; const next=[term.trim(),...history.filter(x=>x!==term.trim())].slice(0,10); localStorage.setItem('animesu:search-history',JSON.stringify(next)); setHistory(next); }
  function voice() { const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) return alert('Voice search belum didukung browser ini.'); const rec = new SR(); rec.lang='id-ID'; rec.onresult=(e:any)=>setQ(e.results[0][0].transcript); rec.start(); }
  const trending=['One Piece','Naruto','Jujutsu Kaisen','Dandadan','Solo Leveling','Kimetsu no Yaiba','Chainsaw Man','Donghua'];
  return <div className="live-search"><div className="search"><input autoFocus value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter')save(query)}} placeholder="Ketik: Narut, One, Dandadan..."/><button className="btn secondary" onClick={voice}>🎙</button></div>
    <div className="server-list"><span className="chip">Trending Search</span>{trending.map(x=><button className="btn secondary" onClick={()=>{setQ(x);save(x)}} key={x}>{x}</button>)}</div>
    {history.length>0 && <div className="server-list"><span className="chip">Riwayat</span>{history.map(x=><button className="btn secondary" onClick={()=>setQ(x)} key={x}>{x}</button>)}</div>}
    {isLoading && <div className="skeleton-list"><i/><i/><i/></div>}<AnimatePresence>{items.length>0 && <motion.div className="search-results" initial={{opacity:0,y:18,filter:'blur(8px)'}} animate={{opacity:1,y:0,filter:'blur(0)'}} exit={{opacity:0,y:10}}>{items.map((a)=><Link className="search-item" href={`/anime/${a.slug}`} onClick={()=>save(query)} key={a.slug}>{a.poster && <Image src={a.poster} alt={a.title} width={74} height={104} sizes="74px" quality={68} className="object-cover"/>}<div><b>{a.title}</b><span>{a.episode ? `Episode ${a.episode}` : 'Anime'}</span></div></Link>)}</motion.div>}</AnimatePresence></div>;
}
