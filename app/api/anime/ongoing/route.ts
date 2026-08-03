import { pageFrom, providerManager, safeJson } from '../../../../lib/api';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const page = pageFrom(req);
  return safeJson(() => providerManager.execute(`ongoing:${page}:v1`, providerManager.ttl('short'), (p) => p.ongoing(page)), { items: [], pagination: { page }, source: 'fallback-empty' });
}
