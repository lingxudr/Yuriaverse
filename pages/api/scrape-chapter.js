const { scrapeChapterImages, scrapeDetail } = require('../../lib/manga-scraper/manager');
const { sortMirrorsByHealth, hydrateProviderHealth } = require('../../lib/manga-provider-health');
const { fetchMergedMangaLatest, canonicalMangaKey } = require('../../lib/manga-latest-source');

function parseMirrorUrls(query) {
  const entries = [];
  const push = (value) => {
    if (!value) return;
    if (typeof value === 'string') {
      try { push(JSON.parse(value)); return; } catch {}
      entries.push({ detailUrl: value, provider: value });
      return;
    }
    if (Array.isArray(value)) return value.forEach(push);
    if (typeof value === 'object') entries.push({ detailUrl: value.detailUrl || value.url || value.href || '', provider: value.provider || value.source || value.name || value.detailUrl || value.url || value.href || '' });
  };
  push(query.chapterMirrors || query.mirrors || query.mirror);
  const sorted = sortMirrorsByHealth(entries, { includeDisabled: false });
  return [...new Set(sorted.map((x) => x.detailUrl).filter(Boolean))].slice(0, 8);
}

function parseDetailMirrors(query) {
  const entries = [];
  const push = (value) => {
    if (!value) return;
    if (typeof value === 'string') {
      try { push(JSON.parse(value)); return; } catch {}
      entries.push({ detailUrl: value, provider: value });
      return;
    }
    if (Array.isArray(value)) return value.forEach(push);
    if (typeof value === 'object') entries.push({ detailUrl: value.detailUrl || value.url || value.href || '', provider: value.provider || value.source || value.name || value.detailUrl || value.url || value.href || '' });
  };
  push(query.detailMirrors || query.detailMirror);
  const sorted = sortMirrorsByHealth(entries, { includeDisabled: false });
  return [...new Set(sorted.map((x) => x.detailUrl).filter(Boolean))].slice(0, 6);
}

function chapterNumber(value = '') {
  const nums = String(value).match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return 0;
  return Number(nums[nums.length - 1]) || 0;
}

function normalize(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreChapter(chapter, hintName, sourceUrl) {
  const name = chapter?.name || '';
  const hintNo = chapterNumber(hintName) || chapterNumber(sourceUrl);
  const chapterNo = chapterNumber(name || chapter?.url || '');
  if (hintNo && chapterNo && hintNo === chapterNo) return 100;
  if (hintName && normalize(name).includes(normalize(hintName))) return 80;
  return 0;
}

async function autoDetailMirrors(sourceUrl = '', title = '') {
  try {
    const list = await fetchMergedMangaLatest();
    const key = canonicalMangaKey(title);
    const found = list.find((item) => item.detailUrl === sourceUrl || (key && item.canonicalId === key));
    return Array.isArray(found?.mirrors) ? found.mirrors.map((m) => m.detailUrl).filter(Boolean) : [];
  } catch { return []; }
}

async function mirrorChapterUrlsFromDetails(detailMirrors, chapterName, sourceUrl) {
  const out = [];
  for (const detailUrl of detailMirrors) {
    try {
      const detail = await scrapeDetail(detailUrl);
      const chapters = Array.isArray(detail?.chapters) ? detail.chapters : [];
      const ranked = chapters
        .map((chapter) => ({ chapter, score: scoreChapter(chapter, chapterName, sourceUrl) }))
        .filter((x) => x.score > 0 && x.chapter?.url)
        .sort((a, b) => b.score - a.score);
      if (ranked[0]?.chapter?.url) out.push(ranked[0].chapter.url);
    } catch {}
  }
  return [...new Set(out)].slice(0, 6);
}

async function tryScrape(url) {
  const result = await scrapeChapterImages(url);
  const images = Array.isArray(result?.images) ? result.images : [];
  if (images.length >= 3) return { images, provider: result.provider || '', sourceUrl: url };
  throw new Error(`invalid images: ${images.length}`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const url = String(req.query.url || '');
  await hydrateProviderHealth();
  const chapterName = String(req.query.chapterName || '');
  const directMirrors = parseMirrorUrls(req.query);
  let detailMirrors = parseDetailMirrors(req.query);
  if (!detailMirrors.length) detailMirrors = await autoDetailMirrors(url, String(req.query.title || ''));
  const tried = [];
  let lastError = null;

  try {
    const primary = await tryScrape(url);
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json({ images: primary.images, provider: primary.provider, fallbackUsed: false, tried: [url] });
  } catch (error) {
    lastError = error;
    tried.push(url);
  }

  const derivedMirrors = await mirrorChapterUrlsFromDetails(detailMirrors, chapterName, url);
  const targets = [...new Set([...directMirrors, ...derivedMirrors])].filter(Boolean);
  for (const target of targets) {
    try {
      const fallback = await tryScrape(target);
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
      return res.status(200).json({ images: fallback.images, provider: fallback.provider, fallbackUsed: true, fallbackUrl: target, tried: [...tried, target] });
    } catch (error) {
      lastError = error;
      tried.push(target);
    }
  }

  return res.status(500).json({ error: lastError?.message || 'Failed to scrape chapter', images: [], tried });
}
