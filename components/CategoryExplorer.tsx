'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Info, Play, Search } from 'lucide-react';
import type { AnimeCard } from '../lib/types';
import { SafeImage } from './SafeImage';

type Kind = 'anime'|'donghua'|'movie'|'live-action';
type Tab = { id: string; label: string };
type Props = { kind: Kind; title: string; eyebrow: string; description: string; bannerClass: string; placeholder: string; tabs: Tab[] };
const sourceMap: Record<Kind,string> = { anime:'', donghua:'donghua', movie:'samehadaku', 'live-action':'animasu' };
const sortOptions = ['Terbaru','A-Z','Rating Tertinggi','Populer','Episode Terbaru'];
function sourceFor(kind: Kind, tab: string, item?: AnimeCard) {
  if (item?.sourceProvider) return item.sourceProvider;
  if (kind === 'anime') {
    if (tab === 'movie') return 'samehadaku';
    if (tab === 'batch') return 'batch';
    if (['ova','ona','special'].includes(tab)) return 'kusonime';
  }
  return sourceMap[kind];
}
function href(item: AnimeCard, kind: Kind, tab: string){ const s=sourceFor(kind, tab, item); return `/anime/${encodeURIComponent(item.slug)}${s?`?source=${s}`:''}` }
function Skeleton(){return <div className="hub-rail">{Array.from({length:8}).map((_,i)=><div className="skeleton-card hub-skeleton" key={i}/>)}</div>}
function Empty(){return <div className="hub-empty big"><div>📭</div><b>Konten belum tersedia</b><p>Konten untuk tab ini belum tersedia dari provider saat ini.</p></div>}
function sortItems(items: AnimeCard[], sort: string){const arr=[...items]; if(sort==='A-Z') return arr.sort((a,b)=>a.title.localeCompare(b.title)); if(sort==='Rating Tertinggi') return arr.sort((a,b)=>Number(b.score||0)-Number(a.score||0)); if(sort==='Episode Terbaru') return arr.sort((a,b)=>Number(b.episode||0)-Number(a.episode||0)); return arr;}
function Card({item, kind, tab}:{item:AnimeCard; kind:Kind; tab:string}){return <article className="hub-card"><Link href={href(item,kind,tab)} className="hub-poster" prefetch><SafeImage src={item.poster} alt={item.title} fallbackText={item.title} fill sizes="190px" loading="lazy"/><span className="hub-badge">{item.status||item.type||'SUB'}</span>{item.score && <span className="hub-rating">⭐ {item.score}</span>}</Link><div className="hub-card-body"><h3>{item.title}</h3><p>{item.episode?`Episode ${item.episode}`:item.type||'Detail tersedia'}</p><div className="hub-actions"><Link className="btn" href={href(item,kind,tab)}><Play size={14}/> Tonton</Link><Link className="btn secondary" href={href(item,kind,tab)}><Info size={14}/> Detail</Link><button className="icon-btn" aria-label={`Bookmark ${item.title}`}><Bookmark size={15}/></button></div></div></article>}
export function CategoryExplorer({kind,title,eyebrow,description,bannerClass,placeholder,tabs}:Props){const [tab,setTab]=useState(tabs[0].id); const [sort,setSort]=useState('Terbaru'); const [q,setQ]=useState(''); const [page,setPage]=useState(1); const [items,setItems]=useState<AnimeCard[]>([]); const [hasMore,setHasMore]=useState(true); const [loading,setLoading]=useState(false); const sentinel=useRef<HTMLDivElement|null>(null); const abortRef=useRef<AbortController|null>(null); const requestedRef=useRef(new Set<string>());
 const load = useCallback(async (next=1, reset=false) => {
    const key = `${kind}:${tab}:${q}:${next}`;
    if (!reset && requestedRef.current.has(key)) return;
    requestedRef.current.add(key);
    if (reset) { abortRef.current?.abort(); abortRef.current = new AbortController(); requestedRef.current = new Set([key]); }
    setLoading(true);
    try{
      const res=await fetch(`/api/category?kind=${kind}&tab=${encodeURIComponent(tab)}&page=${next}&limit=24${q ? `&q=${encodeURIComponent(q)}` : ''}`, { signal: abortRef.current?.signal });
      const j=await res.json(); const d=j.data;
      setItems(prev=>reset?d.items:[...prev,...d.items]); setHasMore(Boolean(d.pagination?.hasNextPage) && (d.items || []).length > 0); setPage(next);
    } catch (error: any) { if (error?.name !== 'AbortError') setHasMore(false); }
    finally{setLoading(false)}
  }, [kind, tab, q]);
 useEffect(()=>{const t=setTimeout(()=>{setItems([]); setPage(1); setHasMore(true); load(1,true)}, q ? 300 : 0); return()=>{clearTimeout(t); abortRef.current?.abort();}},[tab,kind,q,load]);
 useEffect(()=>{const el=sentinel.current; if(!el)return; const ob=new IntersectionObserver(e=>{if(e[0].isIntersecting&&hasMore&&!loading)load(page+1)}, {rootMargin:'500px'}); ob.observe(el); return()=>ob.disconnect()},[hasMore,loading,page,tab,kind,load]);
 const visible=useMemo(()=>sortItems(items.filter(x=>!q||x.title.toLowerCase().includes(q.toLowerCase())),sort),[items,q,sort]);
 return <main className="wrap category-hub"><section className={`hub-hero ${bannerClass}`}><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p><div className="hub-search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder}/></div></div></section><div className="hub-filters">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={tab===t.id?'active':''}>{t.label}</button>)}</div><div className="hub-sort"><span>Sorting</span>{sortOptions.map(s=><button key={s} onClick={()=>setSort(s)} className={sort===s?'active':''}>{s}</button>)}</div>{visible.length?<div className="hub-grid-list">{visible.map((item,i)=><Card item={item} kind={kind} tab={tab} key={`${item.slug}-${i}`}/>)}</div>:!loading&&<Empty/>}{loading&&<Skeleton/>}<div ref={sentinel} style={{height:1}}/></main>}
