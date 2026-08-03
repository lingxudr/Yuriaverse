'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandLogo } from './BrandLogo';
import { BookOpen, Clapperboard, Film, Home, MonitorPlay, Tv, UserRound, X } from 'lucide-react';

const menu = [
  ['/', 'Home', Home],
  ['/anime', 'Anime', Tv],
  ['/donghua', 'Donghua', MonitorPlay],
  ['/movie', 'Movie', Clapperboard],
  ['/drama', 'Drama', Film],
  ['/manga', 'Manga', BookOpen],
  ['/profile', 'Profile', UserRound]
] as const;

export function MobileDrawer({open,onClose}:{open:boolean;onClose:()=>void}){
  return <AnimatePresence>{open&&<motion.aside
    className="fixed inset-0 z-[1000] bg-[#0B0D17] text-white"
    initial={{opacity:0}}
    animate={{opacity:1}}
    exit={{opacity:0}}
    transition={{duration:.22}}
    aria-label="Menu utama"
  >
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5">
      <div className="flex items-center justify-between">
        <BrandLogo compact/>
        <button onClick={onClose} aria-label="Tutup menu" className="grid h-11 w-11 place-items-center rounded-full border border-gray-700/50 bg-[#191C2D] text-white transition hover:bg-[#2A3145] active:scale-95"><X size={22}/></button>
      </div>

      <motion.nav className="mt-10 grid grid-cols-2 gap-4" initial="hidden" animate="show" variants={{hidden:{},show:{transition:{staggerChildren:.06}}}}>
        {menu.map(([href,label,Icon])=><motion.div key={href} variants={{hidden:{opacity:0,y:18},show:{opacity:1,y:0}}} whileTap={{scale:.95}}>
          <Link href={href} onClick={onClose} prefetch={false} className="grid min-h-[132px] place-items-center gap-3 rounded-3xl border border-gray-700/50 bg-[#191C2D] p-4 text-center shadow-[0_18px_45px_rgba(0,0,0,.20)] transition hover:bg-[#2A3145]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0B0D17] text-red-400 ring-1 ring-red-500/20"><Icon size={26}/></span>
            <span className="text-lg font-semibold text-white">{label}</span>
          </Link>
        </motion.div>)}
      </motion.nav>

      <p className="mt-auto pb-4 text-center text-xs font-bold text-gray-400">Animesu • Anime Streaming Subtitle Indonesia</p>
    </div>
  </motion.aside>}</AnimatePresence>;
}
