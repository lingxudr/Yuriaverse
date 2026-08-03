'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Clock, Heart } from 'lucide-react';
type Watch = { title: string; slug: string; animeSlug?: string; progress?: number; at: number };
function EmptyState({ icon, title, desc }: { icon: 'heart'|'clock'|'bookmark'; title: string; desc: string }) {
  const Icon = icon === 'heart' ? Heart : icon === 'clock' ? Clock : Bookmark;
  return <div className="rounded-3xl border border-gray-700 bg-[#191C2D] p-8 text-center text-gray-400"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#0B0D17] text-[#E53935]"><Icon size={30}/></div><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-400">{desc}</p></div>;
}
export function ContinueWatching() {
  const [items, setItems] = useState<Watch[]>([]);
  useEffect(() => setItems(JSON.parse(localStorage.getItem('animesu:history') || '[]').slice(0, 6)), []);
  if (!items.length) return null;
  return <section><div className="section-head"><div><h2>Lanjutkan Menonton</h2><p className="muted">Progress tersimpan otomatis di perangkat ini.</p></div></div><div className="continue-grid">{items.map((x) => <Link href={`/episode/${x.slug}`} key={x.slug} className="continue-card"><div><b>{x.title}</b><span>Episode terakhir</span></div><div className="progress"><i style={{width:`${x.progress || 70}%`}}/></div><small>{x.progress || 70}%</small></Link>)}</div></section>;
}
export function HistoryList() {
  const [items, setItems] = useState<Watch[]>([]);
  useEffect(() => setItems(JSON.parse(localStorage.getItem('animesu:history') || '[]').slice(0, 12)), []);
  if (!items.length) return <EmptyState icon="clock" title="History masih kosong" desc="Episode yang kamu tonton akan muncul di sini secara otomatis." />;
  return <div className="grid gap-3">{items.map((x) => <Link className="flex items-center justify-between gap-3 rounded-2xl border border-gray-700 bg-[#191C2D] p-4 text-white active:scale-[.98]" href={`/episode/${x.slug}`} key={x.slug}><b className="line-clamp-2 text-sm">{x.title}</b><span className="shrink-0 rounded-full bg-[#0B0D17] px-3 py-1 text-xs font-bold text-gray-300">{new Date(x.at).toLocaleDateString('id-ID')}</span></Link>)}</div>;
}
export function FavoriteList() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => setItems(JSON.parse(localStorage.getItem('animesu:favorites') || '[]')), []);
  if (!items.length) return <EmptyState icon="heart" title="Favorite masih kosong" desc="Tekan ikon hati di anime yang kamu suka untuk menyimpannya." />;
  return <div className="grid grid-cols-2 gap-3">{items.map((a) => <Link href={`/anime/${a.slug}`} className="overflow-hidden rounded-2xl border border-gray-700 bg-[#191C2D] active:scale-95" key={a.slug}><div className="poster">{a.poster && <Image src={a.poster} alt={a.title} fill sizes="(max-width: 640px) 50vw, 180px" quality={68} className="object-cover"/>}</div><div className="p-3"><div className="line-clamp-2 text-sm font-black text-white">{a.title}</div><span className="mt-2 inline-flex rounded-full bg-[#E53935] px-2 py-1 text-[10px] font-black text-white">Favorite</span></div></Link>)}</div>;
}
export { EmptyState };
