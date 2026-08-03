'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bookmark, Clock, Heart } from 'lucide-react';
import { AuthPanel } from './AuthPanel';
import { FavoriteList, HistoryList, EmptyState } from './LocalShelf';
import { ClearCacheButton } from './ClearCacheButton';

export function ProfileDashboard(){
  const [watch,setWatch]=useState<any[]>([]);
  useEffect(()=>{setWatch(JSON.parse(localStorage.getItem('animesu:watchlist')||'[]'))},[]);
  return <motion.main initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.45}} className="mx-auto max-w-md px-4 py-6 pb-32 text-white">
    <h1 className="text-4xl font-black tracking-[-.06em] text-white">Profile</h1>
    <p className="mt-2 text-sm leading-6 text-gray-400">Kelola akun, favorite, riwayat tonton, continue watching, dan watchlist.</p>
    <div className="mt-5"><AuthPanel/></div>
    <section className="mt-4 rounded-3xl border border-gray-700 bg-[#191C2D] p-5 shadow-[0_18px_55px_rgba(0,0,0,.24)]"><h2 className="text-2xl font-black tracking-[-.04em] text-white">Perawatan Aplikasi</h2><p className="mt-2 text-sm leading-6 text-gray-400">Jika data lama masih muncul, bersihkan cache PWA agar Animesu memuat data terbaru.</p><div className="mt-4"><ClearCacheButton/></div></section>
    <div className="mt-4 grid grid-cols-3 gap-3">
      {[['Favorite',Heart,'Anime yang kamu sukai.'],['History',Clock,'Riwayat tontonan.'],['Watchlist',Bookmark,'Tonton nanti.']].map(([label,Icon,desc]:any)=><motion.div whileTap={{scale:.95}} key={label} className="rounded-3xl border border-gray-700 bg-[#191C2D] p-4"><Icon className="text-[#E53935]" size={22}/><b className="mt-3 block text-sm text-white">{label}</b><p className="mt-1 line-clamp-2 text-xs text-gray-400">{desc}</p></motion.div>)}
    </div>
    <h2 className="mt-7 text-2xl font-black tracking-[-.04em] text-white">Daftar Favorite</h2><div className="mt-3"><FavoriteList/></div>
    <h2 className="mt-7 text-2xl font-black tracking-[-.04em] text-white">Riwayat Tonton</h2><div className="mt-3"><HistoryList/></div>
    <h2 className="mt-7 text-2xl font-black tracking-[-.04em] text-white">Watchlist</h2>{watch.length?<div className="mt-3 grid gap-3">{watch.map(x=><motion.div whileTap={{scale:.98}} key={x.slug}><Link className="flex items-center justify-between gap-3 rounded-2xl border border-gray-700 bg-[#191C2D] p-4 text-white" href={`/anime/${x.slug}`}><b className="line-clamp-2 text-sm">{x.title}</b><span className="rounded-full bg-[#0B0D17] px-3 py-1 text-xs font-bold text-gray-300">Watchlist</span></Link></motion.div>)}</div>:<div className="mt-3"><EmptyState icon="bookmark" title="Watchlist masih kosong" desc="Tambahkan anime dari halaman detail untuk ditonton nanti." /></div>}
  </motion.main>;
}
