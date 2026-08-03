import { sansekaiFetch } from './client';
import type { DramaItem } from './types';
export async function movieboxList(type='homepage'): Promise<DramaItem[]> {
  try {
    const path = type==='korea'?'/moviebox/k-drama':type==='indo'?'/moviebox/indo-movies':type==='hollywood'?'/moviebox/hollywood-movies':'/moviebox/homepage';
    const json:any = await sansekaiFetch(path); const rows=json?.data?.rows||json?.rows||json?.data||[];
    return (Array.isArray(rows)?rows:[]).map((x:any)=>({id:String(x.movieId||x.dramaId||x.id||x.title),provider:'dramanova' as any,title:x.title||x.name,poster:x.posterImg||x.cover||x.image,description:x.synopsis||x.description,episodeCount:String(x.totalEpisodes||''),country:type==='korea'?'Korea':type==='hollywood'?'Barat':undefined,raw:x})).filter(x=>x.id&&x.title);
  } catch { return []; }
}
