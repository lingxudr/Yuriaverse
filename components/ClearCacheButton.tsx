'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { useState } from 'react';

export function ClearCacheButton(){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);

  async function clear(){
    setBusy(true);
    try{
      if('serviceWorker' in navigator){ const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>{ r.active?.postMessage({ type:'CLEAR_ANIMESU_CACHES' }); r.waiting?.postMessage({ type:'CLEAR_ANIMESU_CACHES' }); return r.update(); })); }
      if('caches' in window){ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k.startsWith('animesu')).map(k=>caches.delete(k))); }
      localStorage.removeItem('animesu:install-dismissed');
      setOpen(false);
      alert('Cache Animesu dibersihkan. Halaman akan dimuat ulang.');
      location.reload();
    }catch{
      alert('Gagal membersihkan cache. Coba clear site data dari browser.');
      setBusy(false);
    }
  }

  return <>
    <motion.button whileTap={{scale:.95}} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gray-600 bg-transparent px-5 text-sm font-black text-gray-300 transition hover:border-[#E53935] hover:text-white" onClick={()=>setOpen(true)}><Trash2 size={17}/> Bersihkan Cache Aplikasi</motion.button>

    <AnimatePresence>{open && <motion.div
      className="fixed inset-0 z-[1200] grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
      initial={{opacity:0}}
      animate={{opacity:1}}
      exit={{opacity:0}}
      role="dialog"
      aria-modal="true"
      aria-label="Konfirmasi bersihkan cache"
    >
      <motion.div
        initial={{opacity:0,scale:.94,y:18}}
        animate={{opacity:1,scale:1,y:0}}
        exit={{opacity:0,scale:.94,y:18}}
        transition={{type:'spring',damping:22,stiffness:260}}
        className="w-full max-w-sm rounded-3xl border border-gray-700 bg-[#191C2D] p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,.55)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/15 text-red-400"><Trash2 size={23}/></div>
          <button onClick={()=>setOpen(false)} disabled={busy} className="grid h-10 w-10 place-items-center rounded-full border border-gray-700 bg-[#0B0D17] text-gray-300 transition hover:text-white active:scale-95" aria-label="Tutup modal"><X size={18}/></button>
        </div>
        <h3 className="mt-4 text-2xl font-black tracking-[-.04em] text-white">Bersihkan cache aplikasi?</h3>
        <p className="mt-2 text-sm leading-6 text-gray-400">Tindakan ini akan menghapus cache PWA Animesu agar tampilan dan data terbaru dimuat ulang. Favorite, history, dan watchlist lokal tidak dihapus.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <motion.button whileTap={{scale:.95}} disabled={busy} onClick={()=>setOpen(false)} className="min-h-11 rounded-full border border-gray-600 bg-transparent px-4 text-sm font-black text-gray-300 transition hover:text-white disabled:opacity-60">Batal</motion.button>
          <motion.button whileTap={{scale:.95}} disabled={busy} onClick={clear} className="min-h-11 rounded-full bg-[#E53935] px-4 text-sm font-black text-white transition hover:bg-red-600 disabled:opacity-60">{busy?'Membersihkan...':'Ya, Bersihkan'}</motion.button>
        </div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </>;
}
