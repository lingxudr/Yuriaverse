'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
export function CookieConsent(){
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [show,setShow]=useState(false);
  useEffect(()=>{ if(!isHome) setShow(localStorage.getItem('animesu:cookie-ok')!=='1'); },[isHome]);
  if(isHome || !show) return null;
  return <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie consent"><div><b>Cookie & Penyimpanan Lokal</b><p>Animesu memakai localStorage/cookie untuk tema, riwayat, favorite, dan pengalaman personal.</p></div><button className="btn" onClick={()=>{localStorage.setItem('animesu:cookie-ok','1');setShow(false)}}>Saya Mengerti</button></div>;
}
