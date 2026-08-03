import { pageFrom, providerManager, safeJson } from '../../../../lib/api';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const url = new URL(req.url); const q = url.searchParams.get('q') || ''; const page = pageFrom(req);
  if (!q.trim()) return safeJson(async () => ({ items: [], pagination: { page }, source: 'empty' }), { items: [], pagination: { page }, source: 'empty' });
  return safeJson(() => providerManager.execute(`search:${q}:${page}:v1`, providerManager.ttl('medium'), (p) => p.search(q, page)), { items: [], pagination: { page }, source: 'fallback-empty' });
}
