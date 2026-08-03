'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { getProviders, signIn, signOut, useSession } from 'next-auth/react';
import { LogOut, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
export function AuthPanel(){
  const {data:session,status}=useSession();
  const [hasGoogle,setHasGoogle]=useState(false);
  useEffect(()=>{getProviders().then(p=>setHasGoogle(Boolean(p?.google))).catch(()=>setHasGoogle(false))},[]);
  const user=session?.user;
  return <section className="rounded-3xl border border-gray-700 bg-[#191C2D] p-5 text-white shadow-[0_18px_55px_rgba(0,0,0,.26)]"><h2 className="text-2xl font-black tracking-[-.04em] text-white">Akun Animesu</h2>{status==='loading'?<p className="mt-2 text-gray-400">Memuat sesi...</p>:user?<div className="mt-4 flex items-center gap-4"><div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-[#0B0D17] text-gray-300">{user.image?<Image src={user.image} alt={user.name||user.email||'Avatar pengguna'} width={80} height={80}/>:<UserRound size={38}/>}</div><div className="min-w-0"><h3 className="truncate text-lg font-black text-white">{user.name||'Pengguna Animesu'}</h3><p className="truncate text-sm text-gray-400">{user.email}</p><motion.button whileTap={{scale:.95}} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-600 bg-transparent px-4 text-sm font-bold text-gray-300" onClick={()=>signOut({callbackUrl:'/'})}><LogOut size={17}/> Logout</motion.button></div></div>:<div className="mt-3"><p className="text-sm leading-6 text-gray-400">Masuk untuk menyimpan bookmark, favorit, riwayat tontonan, dan lanjut menonton di akun Animesu.</p><motion.button whileTap={{scale:.95}} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#E53935] px-5 text-sm font-black text-white disabled:opacity-55" disabled={!hasGoogle} onClick={()=>signIn('google',{callbackUrl:'/profile'})}>{hasGoogle?'Login dengan Google':'Login Google segera hadir'}</motion.button><p className="mt-3 text-xs leading-5 text-gray-400">Fitur akun Google sedang disiapkan. Kamu tetap bisa memakai favorite dan history lokal di perangkat ini.</p></div>}</section>
}
