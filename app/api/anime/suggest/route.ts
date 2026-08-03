import { safeJson, providerManager } from '../../../../lib/api';
import { getAllAnimeList } from '../../../../lib/specialSources';
import type { ListPayload } from '../../../../lib/types';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
function timeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> { return Promise.race([p, new Promise<T>((r)=>setTimeout(()=>r(fallback), ms))]); }
export async function GET(req: Request) {
  const u = new URL(req.url); const q = u.searchParams.get('q') || '';
  return safeJson(async () => {
    const catalog = await getAllAnimeList(1, 8, q);
    const provider = q.length > 2 ? await timeout(providerManager.execute(`suggest-provider:${q}:v1`, providerManager.ttl('medium'), (p) => p.search(q, 1)), 1200, { items: [], pagination: { page: 1 }, source: 'timeout' } as ListPayload) : { items: [], pagination: { page: 1 }, source: 'empty' } as ListPayload;
    const items = [...provider.items, ...catalog.items].filter((a,i,arr)=>arr.findIndex(x=>x.slug===a.slug)===i).slice(0,8);
    return { ...catalog, items, totalItems: Math.max(catalog.totalItems, items.length), source: 'suggest-combined' };
  }, { items: [], pagination: { page: 1 }, source: 'suggest-empty', totalItems: 0 });
}
