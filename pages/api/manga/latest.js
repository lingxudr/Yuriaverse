const { fetchMergedMangaLatest } = require('../../../lib/manga-latest-source');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, data: [] });
  try {
    const data = await fetchMergedMangaLatest();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ ok: true, data, merge: { strategy: 'level-6-persistent-health-challenge-aware-merge', total: data.length, providerStats: data.mergeStats || [], providerHealth: data.providerHealth || {}, usedStale: Boolean(data.usedStale), cacheSource: data.cacheSource || '' } });
  } catch (error) {
    return res.status(200).json({ ok: false, data: [], error: 'latest-unavailable' });
  }
}
