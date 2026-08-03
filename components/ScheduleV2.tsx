'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Bookmark, CalendarDays, ChevronDown, Clock, Info, Play, Search, Star, X } from 'lucide-react';
import type { AnimeCard, SchedulePayload } from '../lib/types';
import { SafeImage } from './SafeImage';

type Category = 'all' | 'anime' | 'donghua' | 'movie' | 'live';
type Item = AnimeCard & { category: Category; day: string; index: number };

const dayOrder = ['senin','selasa','rabu','kamis','jumat','sabtu','minggu'];
const dayLabels = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
const categories: { id: Category; label: string; icon: string }[] = [
  { id: 'all', label: 'Semua', icon: '✨' },
  { id: 'anime', label: 'Anime', icon: '🎌' },
  { id: 'donghua', label: 'Donghua', icon: '🇨🇳' },
  { id: 'movie', label: 'Movie', icon: '🎬' },
  { id: 'live', label: 'Live Action', icon: '🎭' }
];
const filters = ['Semua','Ongoing','Sudah Rilis','Belum Rilis','Sub Indo','Batch','Movie','TV'];
function norm(day=''){return day.toLowerCase().replace(/[^a-z]/g,'').replace('jumat','jumat')}
function dayIndex(day=''){const n=norm(day); const idx=dayOrder.findIndex(d=>n.includes(d)); return idx < 0 ? 0 : idx}
function todayLabel(){return new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(new Date())}
function timeFor(i:number){return `${String(17 + (i % 6)).padStart(2,'0')}:${i % 2 ? '30':'00'} WIB`}
function targetFor(day:string,i:number){const now=new Date(); const today=now.getDay(); const jsTarget=(dayIndex(day)+1)%7; let add=(jsTarget-today+7)%7; const [hh,mm]=timeFor(i).split(' ')[0].split(':').map(Number); const d=new Date(now); d.setDate(now.getDate()+add); d.setHours(hh,mm,0,0); if(d.getTime()<now.getTime()) d.setDate(d.getDate()+7); return d}
function countdown(target:Date){const diff=target.getTime()-Date.now(); if(diff<=0) return '✔ Sudah Rilis'; const h=Math.floor(diff/3600000); const m=Math.floor(diff%3600000/60000); const s=Math.floor(diff%60000/1000); return `${h} Jam ${m} Menit ${s} Detik`;}
function statusOf(item:Item,target:Date){const txt=`${item.status||''} ${item.episode||''}`.toLowerCase(); if(txt.includes('sudah')||target.getTime()<=Date.now()) return 'Sudah Rilis'; if(target.getTime()-Date.now()<7200000) return '2 Jam Lagi'; return 'Belum Rilis'}
function scheduleHref(item: Item) {
  const raw = String((item as any).detailUrl || (item as any).watchUrl || (item as any).href || '');
  if (raw.startsWith('/anime/')) return raw;
  const source = (item as any).sourceProvider || (item.category === 'donghua' ? 'donghua' : raw.includes('animasu') ? 'animasu' : raw.includes('samehadaku') ? 'samehadaku' : raw.includes('anidong') ? 'anidong' : raw.includes('otakudesu') ? 'otakudesu' : '');
  return `/anime/${encodeURIComponent(item.slug)}${source ? `?source=${encodeURIComponent(source)}` : ''}`;
}
function saveReminder(item:Item,target:Date){const old=JSON.parse(localStorage.getItem('animesu:reminders')||'[]'); const reminder={id:`${item.category}-${item.slug}-${item.day}`,title:item.title,slug:item.slug,day:item.day,time:timeFor(item.index),category:item.category,at:target.toISOString()}; localStorage.setItem('animesu:reminders',JSON.stringify([reminder,...old.filter((x:any)=>x.id!==reminder.id)].slice(0,100))); if('vibrate' in navigator) navigator.vibrate?.(30); if('Notification' in window) Notification.requestPermission().then(p=>{if(p==='granted') new Notification('Reminder Animesu aktif',{body:`${item.title} • ${item.day} ${timeFor(item.index)}`, icon:'/animesu-logo-192.png'});}); alert('Reminder berhasil disimpan.');}

export function ScheduleV2({ anime, donghua }: { anime: SchedulePayload; donghua: SchedulePayload }){
  const today = todayLabel();
  const todayRef = useRef<HTMLDivElement>(null);
  const [cat,setCat]=useState<Category>('all');
  const [day,setDay]=useState(today);
  const [filter,setFilter]=useState('Semua');
  const [query,setQuery]=useState('');
  const [tick,setTick]=useState(0);
  const [selected,setSelected]=useState<Item|null>(null);
  const [date,setDate]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),1000); return()=>clearInterval(t)},[]);
  const all = useMemo(()=>{
    const rows: Item[] = [];
    const push = (payload: SchedulePayload, category: Category) => (payload.days||[]).forEach(d => (d.items||[]).forEach((it,idx)=>rows.push({...it, category, day:d.day, index:idx})));
    push(anime,'anime'); push(donghua,'donghua'); return rows;
  },[anime,donghua]);
  const todayItems = all.filter(x=>dayIndex(x.day)===dayIndex(today));
  const current = useMemo(()=> all.filter(x=>(cat==='all'||x.category===cat) && dayIndex(x.day)===dayIndex(day)).filter(x=>!query || x.title.toLowerCase().includes(query.toLowerCase())).filter(x=>{
    const st=statusOf(x,targetFor(x.day,x.index)).toLowerCase(); const f=filter.toLowerCase();
    if(filter==='Semua') return true; if(f==='sub indo') return true; if(f==='movie') return x.type?.toLowerCase().includes('movie') || x.category==='movie'; if(f==='tv') return !x.type || x.type.toLowerCase().includes('tv') || x.category==='anime'; return st.includes(f) || `${x.status} ${x.type}`.toLowerCase().includes(f);
  }),[all,cat,day,query,filter,tick]);
  const stats = [
    ['🔥 Hari ini', todayItems.length], ['🎌 Anime', todayItems.filter(x=>x.category==='anime').length], ['🇨🇳 Donghua', todayItems.filter(x=>x.category==='donghua').length], ['🎬 Movie', 0], ['🎭 Live Action', 0]
  ];
  const week = Array.from({length:7},(_,i)=>{const d=new Date(); d.setDate(d.getDate()+i); return d});
  const monthDays = Array.from({length:new Date(date.getFullYear(),date.getMonth()+1,0).getDate()},(_,i)=>i+1);
  return <main className="wrap schedule-v2">
    <section className="schedule-hero"><div><span className="chip">📅 Kalender Rilis</span><h1>Kalender Rilis</h1><p>Lihat jadwal Anime, Donghua, Movie, dan Live Action yang sedang tayang.</p><b>Hari ini ada {todayItems.length} judul yang dijadwalkan rilis.</b></div><div className="calendar-art" aria-hidden><CalendarDays size={92}/><span>{new Date().getDate()}</span></div></section>
    <div className="schedule-stats">{stats.map(([label,val])=><article key={label as string}><b>{val}</b><span>{label}</span></article>)}</div>
    <div className="schedule-tabs">{categories.map(c=><button key={c.id} onClick={()=>setCat(c.id)} className={cat===c.id?'active':''}>{c.icon}<span>{c.label}</span></button>)}</div>
    <div className="week-strip">{week.map(d=><button key={d.toISOString()} className={dayIndex(new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(d))===dayIndex(day)?'active':''} onClick={()=>setDay(new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(d))}><b>{d.getDate()} Jul</b><span>{new Intl.DateTimeFormat('id-ID',{weekday:'short'}).format(d)}</span>{dayIndex(new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(d))===dayIndex(today)&&<i>Hari Ini</i>}</button>)}</div>
    <div className="day-tabs schedule-day-tabs">{dayLabels.map(d=><button key={d} onClick={()=>setDay(d)} className={dayIndex(d)===dayIndex(day)?'active':''}>{d}{dayIndex(d)===dayIndex(today)&&<small>Hari Ini</small>}</button>)}</div>
    <div className="schedule-tools"><div className="schedule-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari anime berdasarkan judul..."/></div><div className="filter-row">{filters.map(f=><button key={f} onClick={()=>setFilter(f)} className={filter===f?'active':''}>{f}</button>)}</div></div>
    <div className="schedule-layout"><section className="schedule-cards" ref={dayIndex(day)===dayIndex(today)?todayRef:undefined}>{current.length?current.map(item=>{const target=targetFor(item.day,item.index); const st=statusOf(item,target); const progress=Math.min(100,Math.max(10,Number(item.episode||item.index+1)%13/12*100)); return <article className="release-card" key={`${item.category}-${item.slug}-${item.index}`} onClick={()=>setSelected(item)}><div className="release-poster"><SafeImage src={item.poster} alt={item.title} fill sizes="104px" fallbackText={item.title}/></div><div className="release-info"><div className="release-title"><h3>{categories.find(c=>c.id===item.category)?.icon} {item.title}</h3><span className={`status-badge ${st==='Sudah Rilis'?'done':st==='2 Jam Lagi'?'soon':'wait'}`}>{st}</span></div><p>Episode {item.episode||item.index+1}</p><div className="release-meta"><span>🕕 {timeFor(item.index)}</span><span>⏳ {countdown(target)}</span><span>⭐ {(8 + (item.index%10)/10).toFixed(1)}</span><span>🎭 Action • Comedy</span><span>📺 {item.type||'TV'}</span><span>🏢 {item.category==='donghua'?'Anichin Studio':'Studio TBA'}</span></div><div className="episode-progress"><b>Episode</b><i><em style={{width:`${progress}%`}}/></i><span>{item.episode||item.index+1} / 12 Episode</span></div><div className="release-actions" onClick={e=>e.stopPropagation()}><Link className="btn secondary" href={scheduleHref(item)}><Info size={16}/> Detail</Link><Link className="btn" href={scheduleHref(item)}><Play size={16}/> Tonton</Link><button className="btn secondary" onClick={()=>saveReminder(item,target)}><Bell size={16}/> Reminder</button><button className="icon-btn" aria-label="Bookmark"><Bookmark size={16}/></button></div></div></article>}) : <div className="schedule-empty"><div>📭</div><h2>Belum ada jadwal untuk kategori ini.</h2><p>Coba pilih hari lain.</p></div>}</section><aside className="mini-calendar"><h3>Kalender Mini</h3><div className="mini-month"><button aria-label="Bulan sebelumnya" onClick={()=>setDate(new Date(date.getFullYear(),date.getMonth()-1,1))}>‹</button><b>{new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(date)}</b><button aria-label="Bulan berikutnya" onClick={()=>setDate(new Date(date.getFullYear(),date.getMonth()+1,1))}>›</button></div><div className="mini-days">{monthDays.map(n=><button aria-label={`Pilih tanggal ${n}`} key={n} onClick={()=>setDay(dayLabels[(n+2)%7])} className={n===new Date().getDate()?'active':''}>{n}<i/></button>)}</div></aside></div>
    <button className="floating-today" onClick={()=>{setDay(today); setTimeout(()=>todayRef.current?.scrollIntoView({behavior:'smooth',block:'center'}),80)}}>📅<span>Hari ini</span><b>{todayItems.length} Episode</b></button>
    {selected&&<div className="sheet-backdrop" onClick={()=>setSelected(null)}><div className="schedule-sheet" onClick={e=>e.stopPropagation()}><button className="sheet-close" aria-label="Tutup detail jadwal" onClick={()=>setSelected(null)}><X size={18}/></button><div className="sheet-poster"><SafeImage src={selected.poster} alt={selected.title} fill sizes="240px" fallbackText={selected.title}/></div><div><h2>{selected.title}</h2><p className="muted">Sinopsis dan trailer mengikuti data provider jika tersedia. Jadwal berikutnya: {selected.day} {timeFor(selected.index)}.</p><div className="server-list"><span className="chip">⭐ 8.9</span><span className="chip">Action</span><span className="chip">Studio TBA</span><span className="chip">12 Episode</span></div><Link className="btn" href={scheduleHref(selected)}>Tonton</Link></div></div></div>}
  </main>
}
