import { providerManager, safeJson } from '../../../../../../lib/api';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return safeJson(() => providerManager.execute(`batch:${slug}:v1`, providerManager.ttl('long'), (p) => p.batch(slug)), { title: slug, downloads: [] });
}
