'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { AnimeCard } from '../lib/types';
export function FavoriteButton({ anime }: { anime: AnimeCard }) {
  const [on, setOn] = useState(false); const {data:session}=useSession();
  useEffect(() => { const fav = JSON.parse(localStorage.getItem('animesu:favorites') || '[]'); setOn(fav.some((x: AnimeCard) => x.slug === anime.slug)); }, [anime.slug]);
  async function toggle() {
    const fav = JSON.parse(localStorage.getItem('animesu:favorites') || '[]') as AnimeCard[];
    const exists=fav.some((x) => x.slug === anime.slug);
    const next = exists ? fav.filter((x) => x.slug !== anime.slug) : [anime, ...fav].slice(0, 100);
    localStorage.setItem('animesu:favorites', JSON.stringify(next)); setOn(!exists);
    if(session?.user?.email) {
      if (!exists) await fetch('/api/user/library',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'favorite',animeSlug:anime.slug,title:anime.title,poster:anime.poster})}).catch(()=>{});
      else await fetch('/api/user/library',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({type:'favorite',animeSlug:anime.slug})}).catch(()=>{});
    }
  }
  return <button className={`fav ${on ? 'on' : ''}`} onClick={(e)=>{e.preventDefault(); toggle();}} aria-label={on?'Hapus dari favorite':'Tambah ke favorite'}>❤</button>;
}
