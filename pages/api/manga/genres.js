const { getMangaPool, GENRE_ALIASES } = require('../../../lib/manga-api-utils');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });
  try {
    const pool = await getMangaPool();
    const counts = {};
    for (const key of Object.keys(GENRE_ALIASES)) counts[key] = 0;
    for (const item of pool) {
      const text = `${item.title} ${item.genre} ${item.status} ${item.updateTime}`.toLowerCase();
      for (const [key, aliases] of Object.entries(GENRE_ALIASES)) {
        if (aliases.some((alias) => text.includes(alias))) counts[key]++;
      }
    }
    const genres = Object.entries(counts).map(([slug, count]) => ({ slug, name: slug.charAt(0).toUpperCase() + slug.slice(1), count }));
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ ok: true, data: genres });
  } catch {
    return res.status(200).json({ ok: false, data: [] });
  }
}
