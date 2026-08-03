'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

type Cat = 'anime'|'donghua'|'movie'|'live-action';
type G = { name:string; slug:string; icon:string; count:number };
const data: Record<Cat, G[]> = {
  anime: [
    ['Action','action','⚔️',425],['Romance','romance','❤️',219],['Comedy','comedy','😂',380],['Fantasy','fantasy','✨',310],['Adventure','adventure','🧭',260],['Isekai','isekai','🌀',140],['Horror','horror','👻',88],['School','school','🎒',170],['Mecha','mecha','🤖',74],['Drama','drama','🎭',210],['Sci-Fi','sci-fi','🚀',105],['Slice of Life','slice-of-life','🍃',130]
  ].map(([name,slug,icon,count])=>({name:String(name),slug:String(slug),icon:String(icon),count:Number(count)})),
  donghua: [
    ['Cultivation','cultivation','🧘',96],['Fantasy','fantasy','✨',130],['Martial Arts','martial-arts','🥋',105],['Action','action','⚔️',120],['Adventure','adventure','🧭',90],['Comedy','comedy','😂',50],['Xianxia','xianxia','☁️',70],['Wuxia','wuxia','🐉',68],['Historical','historical','🏯',45],['Romance','romance','❤️',42]
  ].map(([name,slug,icon,count])=>({name:String(name),slug:String(slug),icon:String(icon),count:Number(count)})),
  movie: [
    ['Action','action','⚔️',80],['Horror','horror','👻',35],['Comedy','comedy','😂',65],['Drama','drama','🎭',75],['Thriller','thriller','🔪',28],['Mystery','mystery','🕵️',32],['Sci-Fi','sci-fi','🚀',40],['Fantasy','fantasy','✨',55],['Romance','romance','❤️',48],['Adventure','adventure','🧭',52]
  ].map(([name,slug,icon,count])=>({name:String(name),slug:String(slug),icon:String(icon),count:Number(count)})),
  'live-action': [
    ['Romance','romance','❤️',60],['School','school','🎒',42],['Mystery','mystery','🕵️',25],['Action','action','⚔️',38],['Comedy','comedy','😂',47],['Slice of Life','slice-of-life','🍃',31],['Thriller','thriller','🔪',24],['Drama','drama','🎭',78],['Fantasy','fantasy','✨',22],['Adventure','adventure','🧭',18]
  ].map(([name,slug,icon,count])=>({name:String(name),slug:String(slug),icon:String(icon),count:Number(count)}))
};
const tabs: {id:Cat; label:string; stat:string}[] = [
  {id:'anime',label:'🎌 Anime',stat:'39 Genre'}, {id:'donghua',label:'🇨🇳 Donghua',stat:'26 Genre'}, {id:'movie',label:'🎬 Movie',stat:'18 Genre'}, {id:'live-action',label:'🎭 Live Action',stat:'21 Genre'}
];
function href(cat:Cat, slug:string){ if(cat==='anime') return `/genre/anime/${slug}`; if(cat==='donghua') return `/donghua/genre/${slug}`; if(cat==='movie') return `/movie/genre/${slug}`; return `/live-action/genre/${slug}`; }
export function GenreCategoryBrowser(){ const [cat,setCat]=useState<Cat>('anime'); const [q,setQ]=useState(''); const items=useMemo(()=>data[cat].filter(g=>g.name.toLowerCase().includes(q.toLowerCase())||g.slug.includes(q.toLowerCase())),[cat,q]); const label=tabs.find(t=>t.id===cat)?.label.split(' ').slice(1).join(' ')||'Anime'; return <section className="genre-category"><div className="genre-stat-tabs">{tabs.map(t=><button key={t.id} onClick={()=>setCat(t.id)} className={cat===t.id?'active':''}><b>{t.label}</b><span>{t.stat}</span></button>)}</div><label className="genre-live-search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari genre otomatis... contoh: Hor"/></label><div className="genre-grid v2">{items.map(g=><Link className="genre-card v2" href={href(cat,g.slug)} key={g.slug}><span className="genre-icon">{g.icon}</span><b>{g.name}</b><small>{g.count} {label}</small></Link>)}</div>{!items.length&&<div className="panel empty muted">Genre untuk kategori ini belum tersedia.</div>}</section> }
