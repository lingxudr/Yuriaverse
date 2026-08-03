const { scrapeDetail } = require('../../lib/manga-scraper/manager');
const { sortMirrorsByHealth, hydrateProviderHealth } = require('../../lib/manga-provider-health');
const { fetchMergedMangaLatest, canonicalMangaKey } = require('../../lib/manga-latest-source');

const FALLBACK = {
  synopsis: 'Komik ini sedang dalam proses pengambilan data, silakan baca melalui sumber asli.',
  genres: ['Action', 'Fantasy'],
  status: 'Ongoing',
  chapters: []
};

function fallbackData(targetUrl) {
  return { ...FALLBACK, chapters: [], externalUrl: targetUrl || '', warnings: ['empty-chapters-fallback'] };
}

function parseMirrorUrls(query) {
  const entries = [];
  const push = (value) => {
    if (!value) return;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        push(parsed);
        return;
      } catch {}
      entries.push({ detailUrl: value, provider: value });
      return;
    }
    if (Array.isArray(value)) return value.forEach(push);
    if (typeof value === 'object') entries.push({ detailUrl: value.detailUrl || value.url || value.href || '', provider: value.provider || value.source || value.name || value.detailUrl || value.url || value.href || '' });
  };
  push(query.mirrors || query.mirror || query.detailMirrors);
  const sorted = sortMirrorsByHealth(entries, { includeDisabled: false });
  return [...new Set(sorted.map((x) => x.detailUrl).filter(Boolean))].slice(0, 6);
}

function toData(detail, sourceUrl, fallbackUsed = false) {
  return {
    title: detail.title || '',
    synopsis: detail.synopsis || FALLBACK.synopsis,
    genres: detail.genres?.length ? detail.genres : FALLBACK.genres,
    status: detail.status || FALLBACK.status,
    chapters: detail.chapters?.length ? detail.chapters : [],
    externalUrl: detail.chapters?.length ? '' : sourceUrl,
    cover: detail.cover || '',
    author: detail.author || '',
    artist: detail.artist || '',
    alternativeTitles: detail.alternativeTitles || '',
    rating: detail.rating || '',
    views: detail.views || '',
    releaseYear: detail.releaseYear || '',
    provider: detail.provider || '',
    fallbackUsed,
    sourceUrl,
    warnings: detail.warnings || []
  };
}

async function autoMirrors(url = '', title = '') {
  try {
    const list = await fetchMergedMangaLatest();
    const key = canonicalMangaKey(title);
    const found = list.find((item) => item.detailUrl === url || (key && item.canonicalId === key));
    return Array.isArray(found?.mirrors) ? found.mirrors.map((m) => m.detailUrl).filter(Boolean) : [];
  } catch { return []; }
}

async function scrapeBestDetail(targets) {
  let firstValid = null;
  let lastError = null;
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    try {
      const detail = await scrapeDetail(target);
      const data = toData(detail, target, i > 0);
      if (!firstValid) firstValid = data;
      if (Array.isArray(data.chapters) && data.chapters.length && data.chapters[0]?.url !== target) return data;
    } catch (error) {
      lastError = error;
    }
  }
  if (firstValid) return firstValid;
  throw lastError || new Error('detail unavailable');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });
  const url = String(req.query.url || '');
  await hydrateProviderHealth();
  let mirrors = parseMirrorUrls(req.query);
  if (!mirrors.length) mirrors = await autoMirrors(url, String(req.query.title || ''));
  const targets = [url, ...mirrors].filter(Boolean);
  try {
    const data = await scrapeBestDetail(targets);
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json({ ok: true, degraded: Boolean(data.warnings?.length || data.fallbackUsed), fallbackUsed: data.fallbackUsed, data });
  } catch (error) {
    return res.status(200).json({ ok: true, degraded: true, data: fallbackData(url) });
  }
}
