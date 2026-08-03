'use client';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

type LocalItem = { slug?: string; animeSlug?: string; episodeSlug?: string; title: string; poster?: string; progress?: number; at?: number };

function mergeByKey<T extends LocalItem>(current: T[], incoming: T[], key: (item: T) => string) {
  const map = new Map<string, T>();
  for (const item of [...incoming, ...current]) {
    const k = key(item);
    if (k) map.set(k, { ...map.get(k), ...item });
  }
  return Array.from(map.values()).slice(0, 120);
}

export function LocalDataSync(){
  const pathname = usePathname();
  const isHome = pathname === '/';
  const {data:session}=useSession();
  const [synced,setSynced]=useState(false);
  useEffect(()=>{
    if(isHome || !session?.user?.email || synced) return;
    const tokenKey='animesu:last-sync:'+session.user.email;
    const last=Number(localStorage.getItem(tokenKey)||0);
    if(Date.now()-last<1000*60*5) return;
    async function run(){
      const favorites=JSON.parse(localStorage.getItem('animesu:favorites')||'[]');
      const bookmarks=JSON.parse(localStorage.getItem('animesu:watchlist')||'[]');
      const histories=JSON.parse(localStorage.getItem('animesu:history')||'[]');

      // Push local -> database
      for(const f of favorites.slice(0,80)) await fetch('/api/user/library',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'favorite',animeSlug:f.slug,title:f.title,poster:f.poster})}).catch(()=>{});
      for(const b of bookmarks.slice(0,80)) await fetch('/api/user/library',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'bookmark',animeSlug:b.slug,title:b.title,poster:b.poster})}).catch(()=>{});
      for(const h of histories.slice(0,80)) await fetch('/api/user/library',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'history',episodeSlug:h.slug||h.episodeSlug,animeSlug:h.animeSlug,title:h.title,poster:h.poster,progress:h.progress||0})}).catch(()=>{});

      // Pull database -> local, so data follows user across devices
      const res = await fetch('/api/user/library', { cache: 'no-store' }).catch(()=>null);
      const json = res ? await res.json().catch(()=>null) : null;
      const data = json?.data;
      if (data) {
        const dbFav = (data.favorites||[]).map((x:any)=>({slug:x.animeSlug,title:x.title,poster:x.poster,sourceProvider:x.type}));
        const dbBookmarks = (data.bookmarks||[]).map((x:any)=>({slug:x.animeSlug,title:x.title,poster:x.poster,sourceProvider:x.type}));
        const dbHistory = (data.histories||[]).map((x:any)=>({slug:x.episodeSlug,episodeSlug:x.episodeSlug,animeSlug:x.animeSlug,title:x.title,poster:x.poster,progress:x.progress,at:new Date(x.updatedAt||x.createdAt).getTime()}));
        localStorage.setItem('animesu:favorites', JSON.stringify(mergeByKey(favorites, dbFav, (x:any)=>x.slug)));
        localStorage.setItem('animesu:watchlist', JSON.stringify(mergeByKey(bookmarks, dbBookmarks, (x:any)=>x.slug)));
        localStorage.setItem('animesu:history', JSON.stringify(mergeByKey(histories, dbHistory, (x:any)=>x.slug||x.episodeSlug)));
      }
      localStorage.setItem(tokenKey,String(Date.now())); setSynced(true);
    }
    run();
  },[isHome,session?.user?.email,synced]);
  return null;
}
