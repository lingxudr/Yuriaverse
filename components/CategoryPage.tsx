'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnimeCard } from '../lib/types';
import { SafeImage } from './SafeImage';

type Theme = 'anime' | 'donghua' | 'movie' | 'drama';
type Kind = 'anime' | 'donghua' | 'movie' | 'live-action';
type Filter = { id: string; label: string; href?: string };
type CategoryItem = { id: string; title: string; image?: string; href: string; episode?: string; score?: string; meta?: string; badge?: string; source?: string };

type Props = {
  theme: Theme;
  kind?: Kind;
  title: string;
  subtitle: string;
  bannerUrl: string;
  placeholder: string;
  filters: Filter[];
  initialItems?: CategoryItem[];
  activeFilter?: string;
  staticMode?: boolean;
  allowMockFallback?: boolean;
};

const sortOptions = ['Terbaru', 'A-Z', 'Rating', 'Update'];
const sourceMap: Record<Kind,string> = { anime:'', donghua:'donghua', movie:'samehadaku', 'live-action':'animasu' };

const cfg = {
  anime: {
    accent: '#E53935', accentBg: 'bg-[#E53935]', accentText: 'text-[#E53935]', ring: 'focus:ring-[#E53935]/50',
    font: 'font-sans', hero: 'from-[#E53935]/90 via-[#0B0D17]/48 to-[#0B0D17]/95', glow: 'bg-[#E53935]/20',
    grid: 'grid-cols-2', card: 'aspect-[2/3] rounded-xl bg-[#191C2D] ring-1 ring-white/[0.06]', title: 'font-black text-[#F0F4FF]', meta: 'font-bold text-[#8A92B2]'
  },
  donghua: {
    accent: '#FBBF24', accentBg: 'bg-[#FBBF24]', accentText: 'text-[#FBBF24]', ring: 'focus:ring-[#FBBF24]/50',
    font: 'font-serif', hero: 'from-[#FBBF24]/85 via-[#2a1c08]/42 to-[#0B0D17]/95', glow: 'bg-[#FBBF24]/20',
    grid: 'grid-cols-2', card: 'aspect-[2/3] rounded-xl bg-[#191C2D] ring-1 ring-[#FBBF24]/55', title: 'font-bold text-[#F0F4FF]', meta: 'font-semibold text-[#C8B77A]'
  },
  movie: {
    accent: '#F97316', accentBg: 'bg-[#F97316]', accentText: 'text-[#F97316]', ring: 'focus:ring-[#F97316]/50',
    font: 'font-sans', hero: 'from-[#F97316]/90 via-[#2c1407]/40 to-[#0B0D17]/95', glow: 'bg-[#F97316]/20',
    grid: 'grid-cols-1', card: 'aspect-[16/9] rounded-2xl bg-[#191C2D] ring-1 ring-white/[0.06]', title: 'font-black text-[#F0F4FF]', meta: 'font-bold text-[#FDBA74]'
  },
  drama: {
    accent: '#3B82F6', accentBg: 'bg-[#3B82F6]', accentText: 'text-[#3B82F6]', ring: 'focus:ring-[#3B82F6]/50',
    font: 'font-sans', hero: 'from-[#3B82F6]/85 via-[#0c1c3a]/38 to-[#0B0D17]/95', glow: 'bg-[#3B82F6]/20',
    grid: 'grid-cols-2', card: 'aspect-[2/3] rounded-2xl bg-white/[0.05]', title: 'font-semibold text-[#F0F4FF]', meta: 'font-normal text-[#8A92B2]'
  }
} as const;

const MOCK_ITEMS: Partial<Record<Theme, CategoryItem[]>> = {
  anime: [
    { id: 'mock-anime-1', title: 'Sousou no Frieren: Journey Beyond the End', image: '/home/category-anime-2026.webp', href: '#', episode: 'EP 12', score: '9.1', meta: 'Fantasy • Adventure', badge: 'Mock' },
    { id: 'mock-anime-2', title: 'Kimetsu no Yaiba Infinity Castle Arc', image: '/home/hero-animesu-2026.webp', href: '#', episode: 'EP 08', score: '8.8', meta: 'Action • Supernatural', badge: 'Mock' },
    { id: 'mock-anime-3', title: 'Jujutsu Kaisen Shibuya Incident Very Long Title Example', image: '/placeholder-poster.svg', href: '#', episode: 'EP 24', score: '8.7', meta: 'Action • Dark Fantasy', badge: 'Mock' },
    { id: 'mock-anime-4', title: 'One Piece New World', image: '/home/category-movie-2026.webp', href: '#', episode: 'EP 1100', score: '9.0', meta: 'Adventure • Shounen', badge: 'Mock' }
  ],
  donghua: [
    { id: 'mock-donghua-1', title: 'Soul Land Season 2', image: '/home/category-donghua-2026.webp', href: '#', episode: 'EP 260', score: '8.6', meta: 'Cultivation • Fantasy', badge: 'Mock' },
    { id: 'mock-donghua-2', title: 'Battle Through the Heavens', image: '/home/animesu-home-art-set-2026-v2.webp', href: '#', episode: 'EP 89', score: '8.5', meta: 'Xuanhuan • Action', badge: 'Mock' },
    { id: 'mock-donghua-3', title: 'The Eternal Supreme: Li Yunxiao Long Placeholder Title', image: '/placeholder-poster.svg', href: '#', episode: 'EP 40', score: '8.4', meta: 'Martial Arts • Magic', badge: 'Mock' },
    { id: 'mock-donghua-4', title: 'A Will Eternal', image: '/home/hero-animesu-artbook-2026-v2.webp', href: '#', episode: 'EP 106', score: '8.2', meta: 'Comedy • Cultivation', badge: 'Mock' }
  ]
};

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: .45, staggerChildren: .06 } }
};
const cardVariants: Variants = { hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 20 } } };

function sourceFor(kind: Kind, tab: string, item?: AnimeCard) {
  if (item?.sourceProvider) return item.sourceProvider;
  if (kind === 'anime') {
    if (tab === 'movie') return 'samehadaku';
    if (tab === 'batch') return 'batch';
    if (['ova','ona','special'].includes(tab)) return 'kusonime';
  }
  return sourceMap[kind];
}
function hrefFor(item: AnimeCard, kind: Kind, tab: string) {
  const s = sourceFor(kind, tab, item);
  return `/anime/${encodeURIComponent(item.slug)}${s ? `?source=${s}` : ''}`;
}
function normalizeItem(item: AnimeCard, kind: Kind, tab: string): CategoryItem {
  return { id: item.slug, title: item.title, image: item.poster, href: hrefFor(item, kind, tab), episode: item.episode ? `EP ${item.episode}` : undefined, score: item.score, meta: item.status || item.type || item.latestRelease || 'Detail tersedia', badge: item.status || item.type || 'SUB' };
}
function sortItems(items: CategoryItem[], sort: string) {
  const arr = [...items];
  if (sort === 'A-Z') return arr.sort((a,b)=>a.title.localeCompare(b.title));
  if (sort === 'Rating') return arr.sort((a,b)=>Number(b.score||0)-Number(a.score||0));
  if (sort === 'Update') return arr.sort((a,b)=>String(b.episode||'').localeCompare(String(a.episode||'')));
  return arr;
}

function legacyFallbackPath(kind: Kind, tab: string) {
  if (kind === 'anime') {
    if (tab === 'ongoing') return '/api/anime/ongoing';
    if (tab === 'completed') return '/api/anime/complete';
    if (tab === 'movie') return '/api/anime/movie';
    if (tab === 'all') return '/api/anime/all';
  }
  if (kind === 'donghua') return '/api/anime/donghua';
  if (kind === 'movie') return '/api/anime/movie';
  return '';
}

async function fetchLegacyFallback(kind: Kind, tab: string, signal?: AbortSignal): Promise<AnimeCard[]> {
  const path = legacyFallbackPath(kind, tab);
  if (!path) return [];
  const res = await fetch(path, { signal });
  const json = await res.json();
  const items = (json?.data?.items || json?.data?.anime || json?.data?.ongoing || []) as AnimeCard[];
  return items.map((item) => kind === 'movie' || tab === 'movie' ? { ...item, sourceProvider: item.sourceProvider || 'samehadaku' } : item);
}

function CategoryCard({ item, theme }: { item: CategoryItem; theme: Theme }) {
  const c = cfg[theme];
  return <motion.article variants={cardVariants} whileTap={{ scale: .95 }} className="h-full">
    <Link href={item.href} prefetch={false} className={`group relative block overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,.30)] transition duration-200 hover:-translate-y-1 ${c.card}`}>
      <SafeImage src={item.image || '/placeholder-poster.svg'} alt={item.title} fill fallbackText={item.title} className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 220px" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D17]/95 via-[#0B0D17]/42 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {(item.episode || item.badge) && <span className={`${c.accentBg} rounded-full px-2 py-1 text-[10px] font-black text-white ${theme === 'donghua' ? 'text-[#0B0D17]' : ''}`}>{item.episode || item.badge}</span>}
          {item.score && <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-black text-[#F0F4FF] backdrop-blur-md">⭐ {item.score}</span>}
        </div>
        <h3 className={`line-clamp-2 text-sm leading-tight ${theme === 'movie' ? 'text-lg' : ''} ${c.title}`}>{item.title}</h3>
        {item.meta && <p className={`mt-1 line-clamp-1 text-[11px] ${c.meta}`}>{item.meta}</p>}
      </div>
    </Link>
  </motion.article>;
}

function categoryGrid(theme: Theme) {
  if (theme === 'movie') return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7';
}

function Skeleton({ theme }: { theme: Theme }) {
  const c = cfg[theme];
  return <div className={`category-grid-${theme} grid ${categoryGrid(theme)} gap-3 lg:gap-4`}>{Array.from({length: theme === 'movie' ? 8 : 14}).map((_,i)=><div key={i} className={`${c.card} animate-pulse bg-[#191C2D]`} />)}</div>;
}

export function CategoryPage({ theme, kind, title, subtitle, bannerUrl, placeholder, filters, initialItems = [], activeFilter, staticMode = false, allowMockFallback = false }: Props) {
  const c = cfg[theme];
  const router = useRouter();
  const defaultFilter = activeFilter || filters[0]?.id || 'all';
  const [tab, setTab] = useState(defaultFilter);
  const [sort, setSort] = useState('Terbaru');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CategoryItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(!staticMode);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestedRef = useRef(new Set<string>());
  const skippedServerInitialRef = useRef(false);

  const load = useCallback(async (next = 1, reset = false) => {
    if (!kind || staticMode) return;
    const key = `${kind}:${tab}:${q}:${next}`;
    if (!reset && requestedRef.current.has(key)) return;
    requestedRef.current.add(key);
    if (reset) { abortRef.current?.abort(); abortRef.current = new AbortController(); requestedRef.current = new Set([key]); }
    setLoading(true);
    try {
      const res = await fetch(`/api/category?kind=${kind}&tab=${encodeURIComponent(tab)}&page=${next}&limit=24${q ? `&q=${encodeURIComponent(q)}` : ''}`, { signal: abortRef.current?.signal });
      const json = await res.json();
      const data = json?.data;
      let rawItems = (data?.items || []) as AnimeCard[];
      let usedFallback = false;
      if (reset && rawItems.length === 0) {
        rawItems = await fetchLegacyFallback(kind, tab, abortRef.current?.signal);
        usedFallback = rawItems.length > 0;
      }
      const mapped = rawItems.map((item) => normalizeItem(item, kind, tab));
      setItems((prev) => reset ? mapped : [...prev, ...mapped]);
      setHasMore(!usedFallback && Boolean(data?.pagination?.hasNextPage) && rawItems.length > 0);
      setPage(next);
    } catch (error: any) {
      if (error?.name !== 'AbortError') setHasMore(false);
    } finally { setLoading(false); }
  }, [kind, staticMode, tab, q]);

  useEffect(() => {
    if (staticMode) { setItems(initialItems); setHasMore(false); return; }
    if (!skippedServerInitialRef.current && initialItems.length > 0 && !q && tab === defaultFilter) {
      skippedServerInitialRef.current = true;
      return;
    }
    const t = setTimeout(() => { setItems([]); setPage(1); setHasMore(true); load(1, true); }, q ? 300 : 0);
    return () => { clearTimeout(t); abortRef.current?.abort(); };
  }, [tab, q, staticMode, initialItems, load, defaultFilter]);

  useEffect(() => {
    if (staticMode) return;
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && hasMore && !loading) load(page + 1); }, { rootMargin: '500px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, load, staticMode]);

  const visible = useMemo(() => sortItems(items.filter((item)=>!q || item.title.toLowerCase().includes(q.toLowerCase())), sort), [items, q, sort]);
  const fallbackItems = allowMockFallback && !q ? (MOCK_ITEMS[theme] || []) : [];
  const displayItems = visible.length > 0 ? visible : fallbackItems;

  function changeFilter(filter: Filter) {
    if (filter.href) { router.push(filter.href); return; }
    setTab(filter.id);
  }

  return <motion.main variants={pageVariants} initial="hidden" animate="show" className={`relative min-h-screen overflow-x-hidden bg-[#0B0D17] pb-28 text-[#F0F4FF] ${c.font}`}>
    <div className={`pointer-events-none absolute left-[-90px] top-[-90px] h-72 w-72 rounded-full blur-3xl ${c.glow}`} />
    <div className="relative z-10 mx-auto w-full max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
      <section className="px-4 pt-4 lg:px-6 lg:pt-8">
        <Link href="/" prefetch={false} className="mb-3 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#191C2D] text-[#F0F4FF] shadow-[0_12px_35px_rgba(0,0,0,.24)] active:scale-95" aria-label="Back"><ArrowLeft size={21}/></Link>
        <div className="relative min-h-[214px] overflow-hidden rounded-[28px] bg-[#191C2D] shadow-[0_22px_70px_rgba(0,0,0,.35)] md:min-h-[260px] lg:min-h-[310px] lg:rounded-[34px]">
          <SafeImage src={bannerUrl} alt={`${title} banner`} fill fallbackText={title} priority className="object-cover" sizes="(max-width: 768px) 448px, (max-width: 1280px) 1100px, 1280px" />
          <div className={`absolute inset-0 bg-gradient-to-br ${c.hero}`} />
          <div className="relative z-10 flex min-h-[214px] flex-col justify-end p-5 md:min-h-[260px] md:p-7 lg:min-h-[310px] lg:p-9">
            <div className="max-w-2xl"><p className={`mb-2 text-xs font-black uppercase tracking-[.18em] ${c.accentText}`}>Explore</p><h1 className="text-5xl font-black leading-none tracking-[-.055em] md:text-6xl lg:text-7xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#D1D5DB] md:text-base">{subtitle}</p><div className="relative mt-5 max-w-xl"><Search className={`absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${c.accentText}`} /><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={placeholder} className={`h-12 w-full rounded-full border-0 bg-[#1f2330]/95 pl-11 pr-4 text-sm text-[#F0F4FF] outline-none placeholder:text-[#8A92B2] backdrop-blur-md focus:ring-2 ${c.ring}`} /></div></div>
          </div>
        </div>
      </section>

      <section className="mt-5 px-4 lg:px-6"><div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap [&::-webkit-scrollbar]:hidden">{filters.map((filter)=><button key={filter.id} onClick={()=>changeFilter(filter)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition active:scale-95 lg:px-5 lg:py-2.5 ${tab===filter.id ? `${c.accentBg} text-white ${theme === 'donghua' ? 'text-[#0B0D17]' : ''}` : 'bg-[#191C2D] text-[#8A92B2]'}`}>{filter.label}</button>)}</div></section>
      <section className="mt-3 px-4 lg:px-6"><div className="flex items-center justify-between gap-3 lg:justify-start lg:gap-8"><span className="text-xs font-bold text-[#8A92B2]">Sort by</span><div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap [&::-webkit-scrollbar]:hidden">{sortOptions.map((option)=><button key={option} onClick={()=>setSort(option)} className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold transition active:scale-95 lg:px-4 ${sort===option ? `bg-white/10 ${c.accentText}` : 'bg-transparent text-[#8A92B2]'}`}>{option}</button>)}</div></div></section>

      <section className="mt-5 px-4 lg:px-6">
        {displayItems.length > 0 ? <motion.div variants={pageVariants} className={`category-grid-${theme} grid ${categoryGrid(theme)} gap-3 lg:gap-4`}>{displayItems.map((item)=><CategoryCard key={item.id} item={item} theme={theme}/>)}</motion.div> : !loading && <div className="rounded-3xl bg-[#191C2D] p-8 text-center text-[#8A92B2]"><div className="text-4xl">📭</div><b className="mt-3 block text-[#F0F4FF]">Konten belum tersedia</b><p className="mt-1 text-sm">Konten untuk filter ini belum tersedia.</p></div>}
        {loading && visible.length === 0 && fallbackItems.length === 0 && <div className="mt-3"><Skeleton theme={theme}/></div>}
        <div ref={sentinel} className="h-px" />
      </section>
    </div>

  </motion.main>;
}
