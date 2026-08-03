const { getMangaPool, filterManga } = require('../../../lib/manga-api-utils');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });
  try {
    const genre = String(req.query.genre || req.query.slug || '').trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 60)));
    const pool = await getMangaPool();
    const result = filterManga(pool, { genre, page, limit });
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ ok: true, data: result.items, pagination: { page: result.page, hasNextPage: result.hasNextPage, total: result.total }, source: 'animesu-manga-genre' });
  } catch (error) {
    return res.status(200).json({ ok: false, data: [], pagination: { page: 1, hasNextPage: false, total: 0 }, source: 'animesu-manga-genre-fallback' });
  }
}
