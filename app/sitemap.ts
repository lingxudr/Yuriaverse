import type { MetadataRoute } from 'next';
import { toSlug } from '../lib/utils/slug';
async function safeJson(url: string) { try { const r=await fetch(url,{next:{revalidate:3600}}); return await r.json(); } catch { return null; } }
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base='https://animesu.vercel.app';
  const staticRoutes = ['','/anime','/donghua','/movie','/live-action','/search','/ongoing','/complete','/genre','/jadwal','/ranking','/news','/about','/privacy','/dmca','/contact'].map((p)=>({url:base+p,lastModified:new Date(),changeFrequency:'daily' as const,priority:p===''?1:.8}));
  const [home,donghua,movies] = await Promise.all([
    safeJson('https://www.sankavollerei.web.id/anime/home'),
    safeJson('https://www.sankavollerei.web.id/anime/donghua/ongoing/1'),
    safeJson('https://www.sankavollerei.web.id/anime/samehadaku/movies?page=1&order=update')
  ]);
  const animeItems=[...(home?.data?.ongoing?.animeList||[]),...(home?.data?.completed?.animeList||[])].map((a:any)=>({url:`${base}/anime/${encodeURIComponent(a.animeId || toSlug(a.title))}`,lastModified:new Date(),changeFrequency:'weekly' as const,priority:.65}));
  const donghuaItems=(donghua?.ongoing_donghua||[]).map((a:any)=>({url:`${base}/anime/${encodeURIComponent(toSlug(a.slug||a.title))}?source=donghua`,lastModified:new Date(),changeFrequency:'weekly' as const,priority:.6}));
  const movieItems=(movies?.data?.animeList||[]).map((a:any)=>({url:`${base}/anime/${encodeURIComponent(a.animeId||toSlug(a.title))}?source=samehadaku`,lastModified:new Date(),changeFrequency:'weekly' as const,priority:.6}));
  return [...staticRoutes, ...animeItems.slice(0,80), ...donghuaItems.slice(0,40), ...movieItems.slice(0,40)];
}
