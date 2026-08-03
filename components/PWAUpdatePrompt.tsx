'use client';
import { useEffect, useState } from 'react';
import { LightIcon } from './LightIcon';
export function PWAUpdatePrompt(){
  const [show,setShow]=useState(false);
  useEffect(()=>{
    if(!('serviceWorker' in navigator)) return;
    let refreshing=false;
    navigator.serviceWorker.getRegistration().then((reg)=>{
      if(reg?.waiting) setShow(true);
      reg?.addEventListener('updatefound',()=>{
        const sw=reg.installing;
        sw?.addEventListener('statechange',()=>{ if(sw.state==='installed' && navigator.serviceWorker.controller) setShow(true); });
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(refreshing) return; refreshing=true; location.reload(); });
  },[]);
  if(!show) return null;
  function update(){ navigator.serviceWorker.getRegistration().then((reg)=>reg?.waiting?.postMessage({type:'SKIP_WAITING'})); setTimeout(()=>location.reload(),500); }
  return <div className="pwa-update" role="dialog" aria-label="Update tersedia"><div><b>Update Animesu tersedia</b><p>Muat ulang untuk mendapatkan tampilan dan data terbaru.</p></div><button className="btn" onClick={update}><LightIcon name="refresh" size={16}/> Muat Ulang</button><button className="icon-btn" onClick={()=>setShow(false)} aria-label="Tutup update"><LightIcon name="x" size={16}/></button></div>;
}
