import { pageFrom, providerManager, safeJson } from '../../../../../lib/api';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params; const page = pageFrom(req);
  return safeJson(() => providerManager.execute(`genre:${slug}:${page}:v1`, providerManager.ttl('medium'), (p) => p.genre(slug, page)), { items: [], pagination: { page }, source: 'fallback-empty' });
}
