import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bookmark, CalendarDays, Home, Menu, Search, UserRound, X } from 'lucide-react';

const PLACEHOLDER_IMAGE = 'https://placehold.co/300x450/191C2D/FFFFFF?text=No+Image';
const GENRES = ['Action','Romance','Fantasy','Comedy','Horror','School','Murim','Isekai','Completed','Ongoing','Latest','Popular'];
const KEYWORDS = ['Solo Leveling','Murim','Isekai','Romance','Manhwa'];
const NAV = [['/','Home'],['/anime','Anime'],['/donghua','Donghua'],['/movie','Movie'],['/drama','Drama'],['/manga','Manga'],['/profile','Profile']];
const BOTTOM = [['/','Home',Home],['/search','Search',Search],['/jadwal','Schedule',CalendarDays],['/favorite','Bookmark',Bookmark],['/profile','Profile',UserRound]];

const MOCK_COMICS = [
  { title: 'Solo Leveling', image: PLACEHOLDER_IMAGE, chapter: 'Chapter 200', source: 'Mock', updateBucket: 'Hari ini', updateTime: '1 jam lalu' },
  { title: 'Omniscient Reader Viewpoint', image: PLACEHOLDER_IMAGE, chapter: 'Chapter 196', source: 'Mock', updateBucket: 'Hari ini', updateTime: '2 jam lalu' },
  { title: 'One Piece', image: PLACEHOLDER_IMAGE, chapter: 'Chapter 1120', source: 'Mock', updateBucket: 'Hari ini', updateTime: '3 jam lalu' },
  { title: 'Jujutsu Kaisen', image: PLACEHOLDER_IMAGE, chapter: 'Chapter 271', source: 'Mock', updateBucket: 'Kemarin', updateTime: 'Kemarin' },
  { title: 'Nano Machine', image: PLACEHOLDER_IMAGE, chapter: 'Chapter 210', source: 'Mock', updateBucket: 'Kemarin', updateTime: 'Kemarin' }
];

function slugify(value = '') { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function hrefFor(item) { return `/manga/${encodeURIComponent(item?.id || slugify(item?.title || 'comic'))}`; }
function proxyImage(url = '', title = 'Comic', type = 'Manga') { return `/api/manga/poster?url=${encodeURIComponent(url || '')}&title=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}`; }
function ratingFor(title='') { const n = [...String(title)].reduce((a,c)=>a+c.charCodeAt(0),0); return (8 + (n % 19) / 10).toFixed(1); }
function statusFor(item) { return /complete|tamat|end/i.test(`${item?.status || ''} ${item?.chapter || ''}`) ? 'Completed' : 'Ongoing'; }
function updateFor(index=0) { return index < 3 ? 'Baru saja' : `${index + 1} jam lalu`; }
function latestChapterText(item) { const chapter = String(item?.displayChapter || item?.latestChapter || item?.chapter || 'Chapter terbaru').replace(/^Terbaru:?\s*/i,'').trim(); return chapter || 'Chapter terbaru'; }
function firstChapterText() { return 'Awal: Chapter 1'; }
function isTodayUpdate(item) { return item?.updateBucket === 'Hari ini' || /menit\s+lalu|jam\s+lalu|baru saja/i.test(String(item?.updateTime || '')); }
function normalizeComic(item, index) {
  const title = String(item?.title || item?.name || `Comic ${index + 1}`);
  const fallbackBucket = index < 20 ? 'Hari ini' : index < 40 ? 'Kemarin' : `${Math.floor(index / 20)} hari lalu`;
  return { id:item?.id || slugify(title), title, image:item?.image || item?.cover || item?.poster || item?.thumbnail || item?.thumb || PLACEHOLDER_IMAGE, chapter:item?.displayChapter || item?.latestChapter || item?.chapter || item?.latest_chapter || 'Chapter terbaru', genre:item?.genre || item?.genres || '', source:item?.source || 'Manga', sourceBadge:item?.sourceBadge || String(item?.source || 'MG').slice(0,3).toUpperCase(), detailUrl:item?.detailUrl || '', rating: ratingFor(title), status: statusFor(item), updateTime: item?.updateTime || item?.update_time || updateFor(index), updateBucket:item?.updateBucket || item?.update_bucket || fallbackBucket, latestChapter:item?.latestChapter || item?.displayChapter || item?.chapter || '', displayChapter:item?.displayChapter || item?.latestChapter || item?.chapter || '', latestProvider:item?.latestProvider || item?.displayProvider || item?.source || '', displayProvider:item?.displayProvider || item?.latestProvider || item?.source || '', hasFreshMirror:Boolean(item?.hasFreshMirror || item?.freshness?.chapterIsNewer), mirrorCount:Number(item?.mirrorCount || item?.mirrors?.length || 0), mirrors:Array.isArray(item?.mirrors)?item.mirrors:[], progress: 0 };
}
function safeImage(item) { const image = item?.image || ''; return proxyImage(image, item?.title || 'Comic', item?.source || 'Manga'); }
function setFallbackImage(event) { const img = event.currentTarget; if (img.dataset.fallback === '1') return; img.dataset.fallback = '1'; img.src = proxyImage('', img.alt || 'Comic', 'Manga'); }
function shuffle(items) { const arr=[...items]; for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
function chunk(items, size = 20) { const out=[]; for(let i=0;i<items.length;i+=size) out.push(items.slice(i,i+size)); return out; }
function matchesGenre(item, genre) { if (!genre) return true; const aliases = { Action:['action','aksi'], Romance:['romance','romantis'], Fantasy:['fantasy','fantasi'], Comedy:['comedy','komedi'], Horror:['horror','horor'], School:['school','sekolah','gakuen'], Murim:['murim','martial arts'], Isekai:['isekai'], Completed:['completed','complete','tamat'], Ongoing:['ongoing','berjalan'], Latest:['latest','baru','jam lalu','menit lalu','hari lalu'], Popular:['popular','populer','jt views','rb views'] }[genre] || [genre.toLowerCase()]; const haystack = `${item.title} ${item.chapter} ${item.latestChapter} ${item.displayChapter} ${item.genre} ${item.status} ${item.updateTime} ${item.source}`.toLowerCase(); return aliases.some((alias)=>haystack.includes(alias)); }

function BrandHeader() {
  const [open,setOpen] = useState(false);
  return <>
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0B0D17]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-3 no-underline text-white">
          <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-[#191C2D] ring-1 ring-red-500/25"><Image src="/brand/yuriaverse/avatar-v2.png" alt="YuriaVerse" fill sizes="44px" className="object-contain" /></span>
          <span className="grid leading-none"><b className="text-[23px] font-black tracking-[-.05em] text-white">YuriaVerse</b><small className="mt-1 text-[10px] font-bold tracking-[.22em] text-violet-200">ユリアバース</small></span>
        </Link>
        <nav className="hidden items-center gap-2 lg:flex">{NAV.slice(1,6).map(([href,label])=><Link key={href} href={href} className="rounded-full px-4 py-2 text-sm font-black text-gray-300 no-underline hover:bg-white/[0.06] hover:text-white">{label}</Link>)}</nav><div className="flex items-center gap-3"><Link href="/search" className="grid h-11 w-11 place-items-center rounded-full text-white no-underline active:scale-95"><Search size={22}/></Link><button onClick={()=>setOpen(true)} className="grid h-11 w-11 place-items-center rounded-full border-0 bg-transparent text-white active:scale-95" aria-label="Menu"><Menu size={24}/></button></div>
      </div>
    </header>
    {open && <aside className="fixed inset-0 z-[1000] bg-[#0B0D17] p-5 text-white"><div className="mx-auto max-w-md lg:max-w-6xl"><div className="flex items-center justify-between"><b className="text-2xl font-black">Menu</b><button onClick={()=>setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-gray-700 bg-[#191C2D]"><X size={22}/></button></div><nav className="mt-8 grid grid-cols-2 gap-4">{NAV.map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="rounded-3xl border border-gray-700/50 bg-[#191C2D] p-5 text-center text-lg font-semibold text-white no-underline transition hover:bg-[#2A3145] active:scale-95">{label}</Link>)}</nav></div></aside>}
  </>;
}
function BottomNav(){return <nav className="fixed bottom-0 left-0 right-0 z-50 border-t lg:hidden border-gray-800 bg-[#0B0D17] px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2"><div className="mx-auto flex max-w-md lg:max-w-6xl items-center justify-between">{BOTTOM.map(([href,label,Icon])=><Link key={href} href={href} className="flex min-h-[52px] min-w-[54px] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-gray-400 no-underline active:scale-95"><Icon size={21}/><small className="text-[10px] font-semibold leading-none">{label}</small></Link>)}</div></nav>}

function MangaCard({ item, index, large=false, compact=false }) {
  const [saved,setSaved]=useState(false);
  useEffect(()=>{ try{ const fav=JSON.parse(localStorage.getItem('animesu:manga:favorites')||'[]'); setSaved(fav.includes(item.id)); }catch{} },[item.id]);
  function toggle(e){ e.preventDefault(); e.stopPropagation(); const key='animesu:manga:favorites'; const old=JSON.parse(localStorage.getItem(key)||'[]'); const next=saved?old.filter(x=>x!==item.id):[item.id,...old]; localStorage.setItem(key,JSON.stringify(next.slice(0,100))); setSaved(!saved); }
  if (compact) return <Link href={hrefFor(item)} className="no-underline text-white"><article className="flex min-h-[136px] gap-3 rounded-2xl border border-gray-800 bg-[#191C2D] p-3 shadow-[0_14px_35px_rgba(0,0,0,.22)] transition active:scale-[.98]"><div className="relative grid h-32 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0B0D17]"><Image src={safeImage(item)} alt={item.title} fill sizes="96px" quality={70} className="object-cover" /></div><div className="flex min-w-0 flex-1 flex-col justify-center"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">{item.sourceBadge}</span><span className="rounded-full bg-[#0B0D17] px-2 py-0.5 text-[10px] font-bold text-gray-400">{item.updateBucket}</span>{item.hasFreshMirror && <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-black text-white">Fresh {item.latestProvider}</span>}</div><h3 className="line-clamp-2 text-[15px] font-black leading-tight text-white">{item.title}</h3><div className="mt-3 grid gap-1.5"><p className="line-clamp-1 text-xs font-semibold text-gray-400">{firstChapterText()}</p><p className="line-clamp-1 text-xs font-black text-red-300">🔥 Terbaru: {latestChapterText(item)}</p></div><div className="mt-2 flex flex-wrap items-center gap-2"><span className="line-clamp-1 text-[11px] text-gray-500">{item.updateTime || item.updateBucket}</span>{item.genre && <span className="rounded-full bg-[#0B0D17] px-2 py-0.5 text-[10px] font-bold text-gray-400">{item.genre}</span>}</div></div></article></Link>;
  return <Link href={hrefFor(item)} className="no-underline text-white"><article className={`group relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#191C2D] shadow-[0_18px_45px_rgba(0,0,0,.25)] transition duration-200 hover:-translate-y-1 hover:border-red-400/40 active:scale-[.98] ${large?'min-w-[142px] lg:min-w-0':'h-full'}`}><div className={`relative overflow-hidden bg-[#0B0D17] ${large?'aspect-[3/4]':'aspect-[2/3]'}`}><Image src={safeImage(item)} alt={item.title} fill sizes={large ? "(max-width: 1024px) 142px, 25vw" : "(max-width: 1024px) 50vw, 220px"} quality={72} className="object-contain transition duration-300 group-hover:scale-105" /><span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">{large ? `#${index+1}` : item.sourceBadge}</span><button onClick={toggle} aria-label="Bookmark manga" className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full backdrop-blur-md ${saved?'bg-red-500 text-white':'bg-black/45 text-white'}`}>♥</button></div><div className="p-3"><h3 className="line-clamp-2 text-sm font-black leading-tight text-white">{item.title}</h3><div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-gray-400"><span>⭐ {item.rating}</span><span>{item.status}</span></div><p className="mt-2 line-clamp-1 text-[12px] font-bold text-gray-300">{latestChapterText(item)}</p>{item.hasFreshMirror && <p className="mt-1 line-clamp-1 text-[10px] font-black text-violet-300">Update via {item.latestProvider}</p>}<p className="mt-1 text-[11px] text-gray-500">{item.updateTime}</p></div></article></Link>;
}

export default function MangaPage({ initialItems = [] }) {
  const [items,setItems]=useState((initialItems.length ? initialItems : MOCK_COMICS).map(normalizeComic));
  const [remoteItems,setRemoteItems]=useState(null);
  const [searching,setSearching]=useState(false);
  const [query,setQuery]=useState('');
  const [genre,setGenre]=useState('');
  const [loading,setLoading]=useState(true);
  const [recent,setRecent]=useState([]);
  const [page,setPage]=useState(1);
  useEffect(()=>{ try{setRecent(JSON.parse(localStorage.getItem('animesu:manga:recent-search')||'[]'))}catch{}; let active=true; fetch('/api/manga/latest',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(json=>{ if(!active)return; const data=Array.isArray(json?.data)?json.data:[]; const mapped=data?.map?.((it,i)=>normalizeComic(it,i))||[]; if(mapped.length) setItems(mapped); else return fetch('/data/latest-manga.json',{cache:'no-store'}).then(r=>r.ok?r.json():[]).then(data2=>{ if(!active)return; const mapped2=data2?.map?.((it,i)=>normalizeComic(it,i))||[]; setItems(mapped2.length?mapped2:MOCK_COMICS.map(normalizeComic));});}).catch(()=>active&&setItems(MOCK_COMICS.map(normalizeComic))).finally(()=>active&&setLoading(false)); return()=>{active=false}; },[]);
  useEffect(()=>{
    const q=query.trim();
    if(!q && !genre){ setRemoteItems(null); setSearching(false); return; }
    let active=true;
    setSearching(true);
    const timer=setTimeout(()=>{
      fetch(`/api/manga/search?q=${encodeURIComponent(q)}&genre=${encodeURIComponent(genre)}&limit=80`,{cache:'no-store'})
        .then(r=>r.ok?r.json():Promise.reject())
        .then(json=>{ if(!active)return; const data=Array.isArray(json?.data)?json.data:[]; setRemoteItems(data.map((it,i)=>normalizeComic(it,i))); })
        .catch(()=>active&&setRemoteItems(null))
        .finally(()=>active&&setSearching(false));
    },250);
    return()=>{ active=false; clearTimeout(timer); };
  },[query,genre]);
  function setSearch(v){ setQuery(v); setPage(1); if(v.trim().length>2){ const next=[v.trim(),...recent.filter(x=>x!==v.trim())].slice(0,5); setRecent(next); localStorage.setItem('animesu:manga:recent-search',JSON.stringify(next)); }}
  function setGenreFilter(g){ setGenre(genre===g?'':g); setPage(1); }
  const sourceItems=remoteItems || items;
  const filtered=useMemo(()=>sourceItems.filter(it=>{ const haystack=`${it.title} ${it.chapter} ${it.latestChapter} ${it.displayChapter} ${it.genre} ${it.status} ${it.updateTime} ${it.source}`.toLowerCase(); const q=query.trim().toLowerCase(); return (!q||haystack.includes(q)) && matchesGenre(it, genre); }),[sourceItems,query,genre]);
  const pageGroups=useMemo(()=>{ const today=filtered.filter(isTodayUpdate); const rest=filtered.filter(it=>!isTodayUpdate(it)); const groups=[]; if(today.length) groups.push(today); chunk(rest, 12).forEach(g=>groups.push(g)); return groups.length?groups:[[]]; },[filtered]);
  const pageItems=pageGroups[Math.min(page-1,pageGroups.length-1)]||[];
  const popular=useMemo(()=>shuffle(items).slice(0,4),[items]);
  const releases=useMemo(()=>items.slice(0,6),[items]);
  return <main className="min-h-screen bg-[#0B0D17] pb-28 text-white"><BrandHeader/><div className="px-4 py-5"><section className="relative mx-auto max-w-md lg:max-w-6xl overflow-hidden rounded-[30px] border border-white/[0.07] bg-[#191C2D] p-5 shadow-[0_22px_70px_rgba(0,0,0,.35)]"><Image src="/home/category-manga-2026.webp" alt="" fill priority sizes="(max-width: 1024px) 92vw, 1180px" className="object-cover opacity-30"/><div className="absolute inset-0 bg-gradient-to-r from-[#0B0D17] via-[#0B0D17]/80 to-transparent"/><div className="relative"><span className="inline-flex rounded-full border border-red-500/25 bg-red-500/15 px-3 py-1.5 text-xs font-black text-white">YuriaVerse Manga</span><h1 className="mt-4 text-[44px] font-black leading-none tracking-[-.06em] text-white">Manga</h1><p className="mt-2 text-sm leading-6 text-gray-300">Baca manga, manhwa, dan manhua favoritmu dengan pengalaman premium.</p><input value={query} onChange={e=>setSearch(e.target.value)} placeholder="Search manga..." className="mt-5 h-12 w-full rounded-full border border-gray-700 bg-[#0F1324]/95 px-5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20" />{(recent.length>0 || !query) && <div className="mt-4 flex flex-wrap gap-2">{(query?recent:KEYWORDS).map(k=><button key={k} onClick={()=>setSearch(k)} className="rounded-full bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-300 active:scale-95">{k}</button>)}</div>}</div></section>{loading && <p className="mx-auto mt-4 max-w-md lg:max-w-6xl text-sm font-bold text-gray-400">Memuat koleksi manga...</p>}<section className="mx-auto mt-8 max-w-md lg:max-w-6xl"><h2 className="mb-3 text-xl font-black text-white">▶ Continue Reading</h2><div className="rounded-2xl border border-gray-700 bg-[#191C2D] p-4 text-sm text-gray-400">Belum ada riwayat baca manga di perangkat ini.</div></section><section className="mx-auto mt-8 max-w-md lg:max-w-6xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-white">🔥 Popular Today</h2><span className="text-xs font-bold text-gray-400">Swipe</span></div><div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{popular.map((it,i)=><MangaCard key={`${it.id}-pop-${i}`} item={it} index={i} large />)}</div></section><section className="mx-auto mt-6 max-w-md lg:max-w-6xl"><h2 className="mb-3 text-xl font-black text-white">Genres</h2><div className="flex flex-wrap gap-2">{GENRES.map(g=><button key={g} onClick={()=>setGenreFilter(g)} className={`rounded-full px-3 py-2 text-xs font-black transition active:scale-95 ${genre===g?'bg-red-500 text-white':'bg-[#191C2D] text-gray-300 border border-gray-800'}`}>{g}</button>)}</div></section><section className="mx-auto mt-8 max-w-md lg:max-w-6xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-white">📦 Latest Updates</h2><span className="text-xs font-bold text-gray-400">{page===1?'Update 24 jam':`Halaman ${page}`}</span></div>{filtered.length?<><div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{pageItems.map((it,i)=><MangaCard key={`${it.id}-${i}`} item={it} index={i} compact />)}</div><div className="mt-5 flex items-center justify-center gap-2">{pageGroups.map((_,i)=><button key={i+1} onClick={()=>setPage(i+1)} className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black transition active:scale-95 ${page===i+1?'bg-red-500 text-white':'border border-gray-700 bg-[#191C2D] text-gray-300'}`}>{i+1}</button>)}</div></>:<div className="rounded-2xl border border-gray-700 bg-[#191C2D] p-8 text-center text-gray-400">Tidak ada hasil. Coba kata kunci lain.</div>}</section><section className="mx-auto mt-10 max-w-md lg:max-w-6xl"><h2 className="mb-4 text-xl font-black text-white">✨ New Releases</h2><div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{releases.slice(0,3).map((it,i)=><Link href={hrefFor(it)} key={`${it.id}-new-${i}`} className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-[#191C2D] p-3 text-white no-underline active:scale-[.98]"><span className="relative block h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-[#0B0D17]"><Image src={safeImage(it)} alt="" fill sizes="48px" quality={68} className="object-contain"/></span><div className="min-w-0"><b className="line-clamp-1 text-sm">{it.title}</b><p className="mt-1 text-xs text-gray-400">{latestChapterText(it)}</p></div></Link>)}</div></section><footer className="mx-auto mt-10 max-w-md lg:max-w-6xl border-t border-gray-800 pt-6 text-center text-xs font-bold text-gray-500">© 2026 YuriaVerse Manga</footer></div><BottomNav/></main>;
}

export async function getServerSideProps({ res }) {
  try {
    const { fetchMergedMangaLatest } = require('../lib/manga-latest-source');
    const data = await fetchMergedMangaLatest();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return { props: { initialItems: Array.isArray(data) ? data : [] } };
  } catch {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const file = path.join(process.cwd(), 'public', 'data', 'latest-manga.json');
      const json = JSON.parse(await fs.readFile(file, 'utf8'));
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return { props: { initialItems: Array.isArray(json) ? json : [] } };
    } catch {
      return { props: { initialItems: [] } };
    }
  }
}
