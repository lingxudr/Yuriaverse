import { providerManager, safeJson } from '../../../../../lib/api';
import { getAnidongEpisode, getAnimasuEpisode, getDonghuaEpisode, getSamehadakuEpisode } from '../../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const source = new URL(req.url).searchParams.get('source') || '';
  return safeJson(async () => {
    if (source === 'donghua') return getDonghuaEpisode(slug);
    if (source === 'anidong') {
      try { return await getAnidongEpisode(slug, 'anime'); } catch { return getAnidongEpisode(slug, 'donghua'); }
    }
    if (source === 'animasu' || source === 'live-action') return getAnimasuEpisode(slug);
    if (source === 'samehadaku' || source === 'movie' || source === 'popular') return getSamehadakuEpisode(slug);
    return providerManager.execute(`episode:${slug}:v1`, providerManager.ttl('short'), (p) => p.episode(slug));
  }, { title: 'Episode tidak tersedia', slug, servers: [], downloads: [] });
}
