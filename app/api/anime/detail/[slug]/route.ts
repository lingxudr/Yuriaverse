import { providerManager, safeJson } from '../../../../../lib/api';
import { getAnidongDetail, getAnimasuDetail, getDonghuaDetail, getKusonimeDetail, getSamehadakuBatchDetail, getSamehadakuDetail } from '../../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
function withAttemptTimeout<T>(promise: Promise<T>, ms = 3200): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const source = new URL(req.url).searchParams.get('source') || '';
  return safeJson(async () => {
    const valid = (d: any) => d && d.title && !/gagal|tidak tersedia/i.test(String(d.title)) && (d.synopsis || d.episodes?.length || d.poster);
    const attempts: Array<() => Promise<any>> = [];
    if (source === 'donghua') attempts.push(() => getDonghuaDetail(slug));
    else if (source === 'otakudesu' || source === 'sanka') attempts.push(() => providerManager.execute(`detail:${slug}:v1`, providerManager.ttl('medium'), (p) => p.detail(slug)));
    else if (source === 'anidong') attempts.push(async () => { try { return await getAnidongDetail(slug, 'anime'); } catch { return getAnidongDetail(slug, 'donghua'); } });
    else if (source === 'animasu' || source === 'live-action') attempts.push(() => getAnimasuDetail(slug));
    else if (source === 'kusonime') attempts.push(() => getKusonimeDetail(slug));
    else if (source === 'batch') attempts.push(() => getSamehadakuBatchDetail(slug));
    else if (source === 'samehadaku' || source === 'movie' || source === 'popular') attempts.push(() => getSamehadakuDetail(slug));
    else attempts.push(() => providerManager.execute(`detail:${slug}:v1`, providerManager.ttl('medium'), (p) => p.detail(slug)));

    // Schedule/list items sometimes miss their exact source. Try safe fallbacks before showing empty detail.
    attempts.push(
      () => providerManager.execute(`detail:${slug}:v1`, providerManager.ttl('medium'), (p) => p.detail(slug)),
      () => getAnimasuDetail(slug),
      () => getSamehadakuDetail(slug),
      async () => { try { return await getAnidongDetail(slug, 'anime'); } catch { return getAnidongDetail(slug, 'donghua'); } },
      () => getDonghuaDetail(slug)
    );
    const unique: Array<() => Promise<any>> = [];
    const seen = new Set<string>();
    for (const attempt of attempts) { const key = String(attempt); if (!seen.has(key)) { seen.add(key); unique.push(attempt); } }

    let last: any = null;
    const first = unique.shift();
    if (first) {
      try { const data = await withAttemptTimeout(first(), 2200); if (valid(data)) return data; if (data) last = data; } catch {}
    }
    const settled = await Promise.allSettled(unique.map((attempt) => withAttemptTimeout(attempt(), 2800)));
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      const data = result.value;
      if (valid(data)) return data;
      if (data) last = data;
    }
    return last || { title: 'Gagal mengambil data. Silakan coba lagi.', slug, genres: [], episodes: [] };
  }, { title: 'Gagal mengambil data. Silakan coba lagi.', slug, genres: [], episodes: [] });
}
