'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { LightIcon } from './LightIcon';

const MobileDrawer = dynamic(() => import('./MobileDrawer').then((mod) => mod.MobileDrawer), { ssr: false });
const desktopNav = [['/anime','Anime'],['/donghua','Donghua'],['/movie','Movie'],['/drama','Drama'],['/manga','Manga'],['/jadwal','Jadwal']] as const;

export function AppHeader(){
  const [scrolled,setScrolled]=useState(false);
  const [drawer,setDrawer]=useState(false);

  useEffect(()=>{
    const on=()=>setScrolled(scrollY>12);
    on();
    addEventListener('scroll',on,{passive:true});
    return()=>removeEventListener('scroll',on);
  },[]);

  return <>
    <header
      className={`mobile-first-header shell-header-enter fixed inset-x-0 top-0 z-[999] border-b border-[#F0F4FF]/[0.06] bg-[#0B0D17]/92 backdrop-blur-xl ${scrolled?'scrolled':''}`}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-[1180px] items-center justify-between px-4 md:px-6">
        <BrandLogo/>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi desktop">
          {desktopNav.map(([href,label])=><Link key={href} href={href} prefetch={false} className="rounded-full px-4 py-2 text-sm font-black text-[#D1D5DB] transition hover:bg-white/[0.06] hover:text-white">{label}</Link>)}
        </nav>
        <nav className="flex items-center gap-4" aria-label="Navigasi utama">
          <Link className="header-icon-plain grid h-11 w-11 place-items-center text-[#F0F4FF] transition hover:text-[#FF3366] active:scale-95" href="/search" aria-label="Search" prefetch={false}><LightIcon name="search" size={23}/></Link>
          <button className="header-icon-plain grid h-11 w-11 place-items-center border-0 bg-transparent p-0 text-[#F0F4FF] transition hover:text-[#FF3366] active:scale-95" onClick={()=>setDrawer(true)} aria-label="Buka menu" type="button"><LightIcon name="menu" size={25}/></button>
        </nav>
      </div>
    </header>
    {drawer && <MobileDrawer open={drawer} onClose={()=>setDrawer(false)}/>} 
  </>;
}
