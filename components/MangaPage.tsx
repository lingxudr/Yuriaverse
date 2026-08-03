'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MangaErrorBoundary } from './MangaErrorBoundary';

export type MangaItem = {
  id: string;
  title: string;
  poster: string;
  type?: 'Manga' | 'Manhwa' | 'Manhua';
  status?: string;
  latestChapter?: string;
};

function posterUrl(title: string, type?: string) {
  return `/api/manga/poster?title=${encodeURIComponent(title || 'Comic')}&type=${encodeURIComponent(type || 'Comic')}`;
}

function MangaPageContent({ items }: { items: MangaItem[]; degraded?: boolean }) {
  const safeItems = Array.isArray(items) ? items : [];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Manga' | 'Manhwa' | 'Manhua'>('All');
  const visible = useMemo(() => {
    return safeItems.filter((item) => {
      const matchesType = filter === 'All' || item.type === filter;
      const matchesQuery = !query || String(item.title || '').toLowerCase().includes(query.toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [safeItems, query, filter]);

  return <motion.main
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: .45 }}
    className="relative min-h-screen bg-[#0B0D17] pb-28 text-[#F0F4FF]"
  >
    <div className="pointer-events-none absolute left-[-90px] top-[-80px] h-72 w-72 rounded-full bg-[#E53935]/20 blur-3xl" />
    <div className="relative z-10 mx-auto max-w-md px-4 py-4">
      <Link href="/" prefetch={false} aria-label="Kembali" className="mb-3 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#191C2D] text-[#F0F4FF] shadow-[0_12px_35px_rgba(0,0,0,.24)] active:scale-95">
        <ArrowLeft size={21}/>
      </Link>

      <section className="relative overflow-hidden rounded-[28px] bg-[#191C2D] shadow-[0_22px_70px_rgba(0,0,0,.35)]">
        <img src="/home/category-manga-2026.webp" alt="Maskot Animesu untuk halaman Manga" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0B0D17_0%,rgba(11,13,23,.86)_38%,rgba(11,13,23,.36)_72%,rgba(11,13,23,.10)_100%),radial-gradient(circle_at_82%_18%,rgba(229,57,53,.24),transparent_34%)]" />
        <div className="relative z-10 p-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E53935]/15 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-[#F0F4FF] ring-1 ring-[#E53935]/25"><BookOpen size={14}/> Comic Library</span>
          <h1 className="mt-4 text-5xl font-black leading-none tracking-[-.06em] text-[#F0F4FF]">Manga & Comic</h1>
          <p className="mt-3 max-w-[300px] text-sm leading-6 text-gray-300">Jelajahi komik, Manhwa, dan Manhua favoritmu.</p>
          <label className="relative mt-5 block">
            <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#E53935]" />
            <input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              placeholder="Cari manga, manhwa, manhua..."
              className="h-12 w-full rounded-full border-0 bg-[#1f2330]/95 pl-11 pr-4 text-sm text-[#F0F4FF] outline-none placeholder:text-[#8A92B2] focus:ring-2 focus:ring-[#E53935]/50"
            />
          </label>
        </div>
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['All','Manga','Manhwa','Manhua'] as const).map((tab)=><button
          key={tab}
          onClick={()=>setFilter(tab)}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition active:scale-95 ${filter===tab?'bg-[#E53935] text-white':'bg-[#191C2D] text-[#8A92B2]'}`}
        >{tab === 'All' ? 'Semua' : tab}</button>)}
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3">
        {visible.map((item, index)=>{
          const title = String(item?.title || 'Comic');
          const type = item?.type ? String(item.type) : undefined;
          const poster = String(item?.poster || posterUrl(title, type));
          const latestChapter = item?.latestChapter ? String(item.latestChapter) : '';
          const status = item?.status ? String(item.status) : '';
          return <motion.article key={String(item?.id || `${title}-${index}`)} whileTap={{ scale: .95 }} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#191C2D] shadow-[0_18px_45px_rgba(0,0,0,.25)]">
            <div className="relative aspect-[2/3] overflow-hidden bg-[#0B0D17]">
              <img src={poster} alt={title} className="h-full w-full object-cover" loading="lazy" onError={(event)=>{ const img = event.currentTarget; if (img.dataset.fallback === '1') return; img.dataset.fallback = '1'; img.src = posterUrl(title, type); }} />
              {type && <span className="absolute left-2 top-2 rounded-full bg-[#E53935] px-2.5 py-1 text-[10px] font-black text-white shadow-lg">{type}</span>}
            </div>
            <div className="p-3">
              <h2 className="line-clamp-2 min-h-[40px] text-sm font-black leading-tight text-white">{title}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-gray-400">
                {latestChapter && <span className="rounded-full bg-[#0B0D17] px-2 py-1">{latestChapter}</span>}
                {status && <span className="rounded-full bg-[#0B0D17] px-2 py-1">{status}</span>}
              </div>
            </div>
          </motion.article>;
        })}
      </section>

      {!visible.length && <div className="mt-5 rounded-3xl border border-gray-700 bg-[#191C2D] p-8 text-center text-gray-400">
        <BookOpen className="mx-auto text-[#E53935]" size={36}/>
        <b className="mt-3 block text-white">Komik tidak ditemukan</b>
        <p className="mt-2 text-sm">Coba kata kunci atau filter lain.</p>
      </div>}
    </div>
  </motion.main>;
}

export function MangaPage(props: { items: MangaItem[]; degraded?: boolean }) {
  return <MangaErrorBoundary><MangaPageContent {...props} /></MangaErrorBoundary>;
}
