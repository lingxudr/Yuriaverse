const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs/promises');
const path = require('path');
const { recordProviderHealth, providerHealth, providerHealthSummary, sortMirrorsByHealth, shouldSkipProvider, hydrateProviderHealth } = require('./manga-provider-health');
const { getCache, setCache } = require('./manga-scraper/core/cache');
const { detectHtmlBlock } = require('./manga-scraper/core/http');

const KOMIKU_URL = 'https://komiku.org/';
const KOMIKCAST_CANDIDATES = [
  ...(process.env.KOMIKCAST_BASE_URLS || '').split(',').map((x) => x.trim()).filter(Boolean),
  process.env.KOMIKCAST_BASE_URL,
  'https://komikcast.cz/',
  'https://komikcast.li/',
  'https://komikcast.site/',
  'https://komikcast.io/'
].filter(Boolean);
const MANHWAINDO_URL = process.env.MANHWAINDO_BASE_URL || 'https://www.manhwaindo.my/';
const NATSU_URL = process.env.NATSU_BASE_URL || 'https://natsu.one/';
const WURMZ_URL = process.env.WURMZ_BASE_URL || 'https://wurmz.net/';
const ENABLE_MANHWAINDO_LATEST = process.env.MANGA_ENABLE_MANHWAINDO_LATEST !== '0';
const ENABLE_NATSU_LATEST = process.env.MANGA_ENABLE_NATSU_LATEST !== '0';
const ENABLE_WURMZ_LATEST = process.env.MANGA_ENABLE_WURMZ_LATEST !== '0';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAX_ITEMS = Number(process.env.MANGA_LATEST_MAX_ITEMS || 60);
const MAX_PROVIDER_ITEMS = Number(process.env.MANGA_LATEST_MAX_PROVIDER_ITEMS || MAX_ITEMS);
// Komikcast currently often returns challenge/empty from Vercel; keep opt-in to prevent slow manga pages.
const ENABLE_KOMIKCAST_LATEST = process.env.MANGA_ENABLE_KOMIKCAST_LATEST === '1';
const MERGED_CACHE_KEY = 'latest-merged:v6';
const MERGED_CACHE_TTL = Number(process.env.MANGA_LATEST_MERGED_CACHE_TTL_MS || 10 * 60 * 1000);

function cleanText(value = '') { return String(value || '').replace(/\s+/g, ' ').trim(); }
function absoluteUrl(value, baseUrl) { try { return new URL(String(value || '').trim(), baseUrl).toString(); } catch { return ''; } }
function slugId(value = '') { return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '-'); }
function sourceBadge(name = '') { return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 4).toUpperCase() || name.slice(0, 3).toUpperCase(); }

function firstAttr($el, attrs) {
  for (const attr of attrs) {
    const value = $el.attr(attr);
    if (value) return value;
  }
  return '';
}

function stripTitleNoise(title = '') {
  return cleanText(title)
    .replace(/^Baca\s+(Komik|Manga|Manhwa|Manhua)\s+/i, '')
    .replace(/\b(Bahasa\s+Indonesia|Sub\s*Indo|Subtitle\s*Indonesia|Komik|Manga|Manhwa|Manhua|Webtoon|Doujinshi)\b/gi, ' ')
    .replace(/\bChapter\s+\d+(?:\.\d+)?\b/gi, ' ')
    .replace(/[“”‘’]/g, "'")
    .trim();
}

function canonicalMangaKey(title = '') {
  const cleaned = stripTitleNoise(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.replace(/\s+/g, '-');
}

function chapterNumber(value = '') {
  const numbers = String(value).match(/\d+(?:\.\d+)?/g);
  if (!numbers?.length) return 0;
  return Number(numbers[numbers.length - 1]) || 0;
}

function normalizeLatestItem(item, providerName, index = 0) {
  const title = stripTitleNoise(item?.title || item?.name || `Manga ${index + 1}`);
  return {
    title,
    image: item?.image || item?.cover || item?.poster || item?.thumbnail || '',
    chapter: item?.chapter || item?.latestChapter || item?.latest_chapter || 'Chapter terbaru',
    genre: item?.genre || item?.genres || '',
    updateTime: item?.updateTime || item?.update_time || item?.date || '',
    updateBucket: item?.updateBucket || item?.update_bucket || '',
    detailUrl: item?.detailUrl || item?.url || item?.href || '',
    source: item?.source || providerName,
    sourceBadge: item?.sourceBadge || sourceBadge(item?.source || providerName)
  };
}

function mergeMangaLatestItems(providerGroups = [], { maxItems = MAX_ITEMS } = {}) {
  const map = new Map();
  const order = [];
  const providerStats = [];

  for (const group of providerGroups) {
    const provider = group.provider || group.source || 'Unknown';
    const items = Array.isArray(group.items) ? group.items : [];
    let added = 0;
    let duplicates = 0;

    items.forEach((raw, index) => {
      const item = normalizeLatestItem(raw, provider, index);
      const key = canonicalMangaKey(item.title) || slugId(item.title || item.detailUrl);
      if (!key || !item.title || !item.detailUrl) return;
      const mirror = {
        provider,
        source: item.source,
        sourceBadge: item.sourceBadge,
        title: item.title,
        detailUrl: item.detailUrl,
        image: item.image,
        chapter: item.chapter,
        genre: item.genre,
        updateTime: item.updateTime,
        updateBucket: item.updateBucket
      };

      if (!map.has(key)) {
        const primary = {
          ...item,
          canonicalId: key,
          primaryProvider: provider,
          mirrors: [],
          duplicateCount: 0,
          providers: [provider],
          latestChapter: item.chapter,
          latestProvider: provider,
          latestDetailUrl: item.detailUrl,
          latestImage: item.image,
          latestUpdateTime: item.updateTime,
          latestUpdateBucket: item.updateBucket,
          latestIsMirror: false,
          _firstIndex: order.length
        };
        map.set(key, primary);
        order.push(key);
        added++;
        return;
      }

      const existing = map.get(key);
      if (!existing.providers.includes(provider)) existing.providers.push(provider);
      existing.duplicateCount = (existing.duplicateCount || 0) + 1;
      existing.mirrors.push(mirror);
      duplicates++;

      // Level 1 keeps first provider as primary, but records fresher chapter info.
      if (chapterNumber(item.chapter) > chapterNumber(existing.latestChapter || existing.chapter)) {
        existing.latestChapter = item.chapter;
        existing.latestProvider = provider;
        existing.latestDetailUrl = item.detailUrl;
        existing.latestImage = item.image || existing.latestImage;
        existing.latestUpdateTime = item.updateTime || existing.latestUpdateTime;
        existing.latestUpdateBucket = item.updateBucket || existing.latestUpdateBucket;
        existing.latestIsMirror = provider !== existing.primaryProvider;
      }
    });

    providerStats.push({ provider, total: items.length, added, duplicates });
  }

  return order.slice(0, maxItems).map((key, index) => {
    const item = map.get(key);
    item.mirrors = sortMirrorsByHealth(item.mirrors);
    const { _firstIndex, ...clean } = item;
    const chapterIsNewer = chapterNumber(clean.latestChapter) > chapterNumber(clean.chapter);
    return {
      id: `${slugId(clean.primaryProvider || clean.source)}-${clean.canonicalId}-${index}`,
      ...clean,
      displayChapter: chapterIsNewer ? clean.latestChapter : clean.chapter,
      displayProvider: chapterIsNewer ? clean.latestProvider : clean.primaryProvider,
      primaryProviderHealth: providerHealth(clean.primaryProvider),
      mirrorHealth: sortMirrorsByHealth(clean.mirrors).map((mirror) => ({ provider: mirror.provider || mirror.source, score: providerHealth(mirror.provider || mirror.source).score, status: providerHealth(mirror.provider || mirror.source).status })),
      freshness: {
        primaryChapter: clean.chapter,
        latestChapter: clean.latestChapter,
        primaryProvider: clean.primaryProvider,
        latestProvider: clean.latestProvider,
        latestIsMirror: Boolean(clean.latestIsMirror),
        chapterIsNewer
      },
      scrapedAt: new Date().toISOString()
    };
  }).map((item, _, arr) => ({
    ...item,
    mergeStats: undefined,
    mergeProviderCount: item.providers?.length || 1,
    mirrorCount: item.mirrors?.length || 0,
    hasFreshMirror: Boolean(item.freshness?.latestIsMirror || item.freshness?.chapterIsNewer),
    _mergeTotal: arr.length
  }));
}

function parseKomikuCards($, root, bucketLabel, rows) {
  root.find('article.ls2').each((_, node) => {
    if (rows.length >= MAX_PROVIDER_ITEMS) return false;
    const card = $(node);
    const titleLink = card.find('.ls2j h3 a[href], h3 a[href]').first();
    const rawTitle = cleanText(titleLink.text()) || cleanText(titleLink.attr('title'));
    const title = stripTitleNoise(rawTitle);
    const detailUrl = absoluteUrl(titleLink.attr('href'), KOMIKU_URL);
    if (!title || !detailUrl || rows.some((row) => row.detailUrl === detailUrl)) return;

    const img = card.find('.ls2v img').not('.flag').first();
    const image = absoluteUrl(firstAttr(img, ['data-src', 'data-lazy-src', 'data-original', 'src']), KOMIKU_URL);
    const chapterLink = card.find('a.ls2l[href], a[href*="chapter"]').first();
    const chapter = cleanText(chapterLink.text()) || 'Chapter terbaru';
    const meta = cleanText(card.find('.ls2t').first().text());
    const [genreRaw, updateRaw] = meta.split('·').map((x) => cleanText(x));
    rows.push({ title, image, chapter, genre: genreRaw || '', updateTime: updateRaw || bucketLabel, updateBucket: bucketLabel, detailUrl, source: 'Komiku', sourceBadge: sourceBadge('Komiku') });
  });
}

async function fetchHtml(url, timeout = 15000) {
  const res = await axios.get(url, {
    timeout,
    validateStatus: (s) => s >= 200 && s < 500,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache'
    }
  });
  const html = res.data || '';
  const block = detectHtmlBlock(html, res.headers, res.status);
  if (block.blocked) {
    const err = new Error(block.reason);
    err.code = block.reason;
    err.blocked = true;
    throw err;
  }
  if (res.status >= 400) throw new Error(`http-${res.status}`);
  return html;
}

async function fetchKomikuLatest() {
  const html = await fetchHtml(KOMIKU_URL);
  const $ = cheerio.load(html);
  const rows = [];
  const latest = $('section#Terbaru').first();
  if (latest.length) parseKomikuCards($, latest, 'Hari ini', rows);
  const added = $('#ls12-baru').first();
  if (rows.length < MAX_PROVIDER_ITEMS && added.length) parseKomikuCards($, added, 'Kemarin', rows);
  return rows.map((item, index) => ({ id: `komiku-${slugId(item.title)}-${index}`, ...item, scrapedAt: new Date().toISOString() }));
}

function parseKomikcastRows($, baseUrl) {
  const rows = [];
  const selectors = [
    '.list-update_item', '.utao .uta', '.postbody .bs', '.bixbox .bs', '.listupd .bs', 'article', '.manga-list .manga-item'
  ].join(',');
  $(selectors).each((_, node) => {
    if (rows.length >= MAX_PROVIDER_ITEMS) return false;
    const card = $(node);
    const link = card.find('a[href*="komik"], a[href*="manga"], a[href]').first();
    const title = stripTitleNoise(link.attr('title') || card.find('.title, h3, h4, .tt, .series').first().text() || link.text());
    const detailUrl = absoluteUrl(link.attr('href'), baseUrl);
    if (!title || title.length < 2 || !detailUrl || /chapter/i.test(detailUrl) || rows.some((row) => row.detailUrl === detailUrl)) return;
    const img = card.find('img').first();
    const image = absoluteUrl(firstAttr(img, ['data-src', 'data-lazy-src', 'data-original', 'src']), baseUrl);
    const chapter = cleanText(card.find('.chapter, .lsch, .epxs, a[href*="chapter"]').first().text()) || 'Chapter terbaru';
    const updateTime = cleanText(card.find('.date, .time, .status, .type').first().text()) || '';
    rows.push({ title, image, chapter, genre: '', updateTime, updateBucket: updateTime || 'Provider lain', detailUrl, source: 'Komikcast', sourceBadge: sourceBadge('Komikcast') });
  });
  return rows;
}

async function fetchKomikcastLatest() {
  if (!ENABLE_KOMIKCAST_LATEST) return [];
  let lastError = null;
  let emptyCount = 0;
  for (const baseUrl of KOMIKCAST_CANDIDATES) {
    try {
      const html = await fetchHtml(baseUrl, 6000);
      const $ = cheerio.load(html);
      const rows = parseKomikcastRows($, baseUrl);
      if (rows.length) return rows.map((item, index) => ({ id: `komikcast-${slugId(item.title)}-${index}`, ...item, scrapedAt: new Date().toISOString() }));
      emptyCount++;
      lastError = new Error('empty-latest');
    } catch (error) {
      lastError = error;
      if (error?.blocked || /cloudflare|challenge|forbidden|rate-limited|anti-bot/i.test(error?.message || '')) break;
    }
  }
  if (lastError) throw lastError;
  if (emptyCount) throw new Error('empty-latest');
  return [];
}


function cleanAnchorTitle($, link) {
  const img = link.find('img').first();
  const imgTitle = cleanText(img.attr('title') || img.attr('alt') || '');
  const attrTitle = cleanText(link.attr('title') || '');
  let text = cleanText(link.clone().children('img,script,style').remove().end().text());
  text = text.replace(/^(Manhwa|Manhua|Manga|Color|Hot|New|Start Reading)\s+/i, '').replace(/Chapter\s*\d+(?:\.\d+)?[\s\S]*$/i, '').trim();
  return stripTitleNoise(imgTitle || attrTitle || text);
}

function imageFromAnchor($, link, baseUrl) {
  const img = link.find('img').first();
  return absoluteUrl(firstAttr(img, ['data-src', 'data-lazy-src', 'data-original', 'src']), baseUrl);
}

function chapterFromText(text = '') {
  const raw = cleanText(text);
  const m = raw.match(/Chapter\s*([0-9]+(?:\.[0-9]+)?)/i) || raw.match(/Ch\.?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!m) return 'Chapter terbaru';
  let value = m[1];
  // Some themes concatenate rating right after chapter: Chapter 8868.5 => chapter 886 + rating 8.5
  if (/^\d{4,}\.\d+$/.test(value)) value = value.split('.')[0].slice(0, -1);
  else if (/^\d{4}$/.test(value) && !/^1[0-2]\d{2}$/.test(value)) value = value.slice(0, -1);
  return `Chapter ${value}`;
}

function chapterFromUrl(url = '') {
  try { const m = new URL(url).pathname.match(/\/chapter\/([0-9]+(?:\.[0-9]+)?)/i); return m ? `Chapter ${m[1]}` : ''; } catch { return ''; }
}

function titleFromSlugUrl(url = '') {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1] || parts[parts.length - 2] || '';
    return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  } catch { return ''; }
}

function parseAnchorLatest($, baseUrl, providerName, hrefRe, max = MAX_PROVIDER_ITEMS) {
  const rows = [];
  const seen = new Set();
  $(`a[href]`).each((_, el) => {
    if (rows.length >= max) return false;
    const link = $(el);
    const href = link.attr('href') || '';
    if (!hrefRe.test(href)) return;
    const detailUrl = absoluteUrl(href, baseUrl);
    if (!detailUrl || seen.has(detailUrl)) return;
    const title = cleanAnchorTitle($, link);
    if (!title || title.length < 2 || /bookmark|kontak|library|history|leaderboard|start reading|home|login/i.test(title)) return;
    const text = cleanText(link.text());
    const image = imageFromAnchor($, link, baseUrl);
    rows.push({
      title,
      image,
      chapter: chapterFromText(text),
      genre: '',
      updateTime: '',
      updateBucket: providerName,
      detailUrl,
      source: providerName,
      sourceBadge: sourceBadge(providerName)
    });
    seen.add(detailUrl);
  });
  return rows;
}


async function readProviderSeed(name) {
  try {
    const file = path.join(process.cwd(), 'public', 'data', 'provider-seeds', `${name}.json`);
    const json = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(json) ? json : [];
  } catch { return []; }
}

async function fetchManhwaIndoLatest() {
  if (!ENABLE_MANHWAINDO_LATEST) return [];
  try {
    const html = await fetchHtml(MANHWAINDO_URL, 9000);
    const $ = cheerio.load(html);
    const rows = parseAnchorLatest($, MANHWAINDO_URL, 'ManhwaIndo', /\/series\//i);
    if (rows.length) return rows.map((item, index) => ({ id: `manhwaindo-${slugId(item.title)}-${index}`, ...item, scrapedAt: new Date().toISOString(), seedFallback: false }));
  } catch {}
  const seed = await readProviderSeed('manhwaindo');
  return seed.map((item, index) => ({ id: `manhwaindo-${slugId(item.title)}-${index}`, ...item, scrapedAt: new Date().toISOString(), seedFallback: true }));
}


function parseWurmzRows($, baseUrl) {
  const rows = [];
  const seen = new Set();
  $('article.comic-card, .comic-card').each((_, el) => {
    if (rows.length >= MAX_PROVIDER_ITEMS) return false;
    const card = $(el);
    const detailLink = card.find('a[href*="/detail/"]').first();
    const chapterLink = card.find('a[href*="/chapter/"]').first();
    const detailUrl = absoluteUrl(detailLink.attr('href'), baseUrl);
    if (!detailUrl || seen.has(detailUrl)) return;
    const img = card.find('img').first();
    const title = stripTitleNoise(img.attr('alt') || card.find('.comic-title').first().text() || detailLink.attr('title') || titleFromSlugUrl(detailUrl));
    if (!title) return;
    rows.push({
      title,
      image: absoluteUrl(firstAttr(img, ['data-src', 'data-lazy-src', 'data-original', 'src']), baseUrl),
      chapter: chapterFromUrl(chapterLink.attr('href') || '') || chapterFromText(card.find('.ch-num').first().text() || chapterLink.text() || card.find('.chapter,.episode,.epz').first().text()),
      genre: cleanText(card.find('.type-badge').first().text()),
      updateTime: cleanText(card.find('.ch-time').first().text()),
      updateBucket: 'Wurmz',
      detailUrl,
      source: 'Wurmz',
      sourceBadge: sourceBadge('Wurmz')
    });
    seen.add(detailUrl);
  });
  if (!rows.length) {
    $('a[href*="/detail/"]').each((_, el) => {
      if (rows.length >= MAX_PROVIDER_ITEMS) return false;
      const link = $(el);
      const detailUrl = absoluteUrl(link.attr('href'), baseUrl);
      if (!detailUrl || seen.has(detailUrl) || /chapter/i.test(detailUrl)) return;
      const title = stripTitleNoise(link.attr('title') || link.find('img').attr('alt') || link.text() || titleFromSlugUrl(detailUrl));
      if (!title) return;
      rows.push({ title, image: imageFromAnchor($, link, baseUrl), chapter: 'Chapter terbaru', genre: '', updateTime: '', updateBucket: 'Wurmz', detailUrl, source: 'Wurmz', sourceBadge: sourceBadge('Wurmz') });
      seen.add(detailUrl);
    });
  }
  return rows;
}

async function fetchWurmzLatest() {
  if (!ENABLE_WURMZ_LATEST) return [];
  const html = await fetchHtml(WURMZ_URL, 9000);
  const $ = cheerio.load(html);
  const rows = parseWurmzRows($, WURMZ_URL);
  return rows.map((item, index) => ({ id: `wurmz-${slugId(item.title)}-${index}`, ...item, scrapedAt: new Date().toISOString(), seedFallback: false }));
}

function parseNatsuRows($, baseUrl) {
  const imageByAlt = new Map();
  $('img').each((_, el) => {
    const img = $(el);
    const alt = stripTitleNoise(img.attr('alt') || img.attr('title') || '');
    const src = absoluteUrl(firstAttr(img, ['data-src', 'data-lazy-src', 'data-original', 'src']), baseUrl);
    if (alt && src && !/logo|avatar|gravatar|icon/i.test(src)) imageByAlt.set(canonicalMangaKey(alt), { title: alt, image: src });
  });
  const rows = [];
  const seen = new Set();
  $('a[href*="/manga/"]').each((_, el) => {
    if (rows.length >= MAX_PROVIDER_ITEMS) return false;
    const link = $(el);
    const detailUrl = absoluteUrl(link.attr('href'), baseUrl);
    if (!detailUrl || seen.has(detailUrl)) return;
    const slugTitle = titleFromSlugUrl(detailUrl);
    const key = canonicalMangaKey(slugTitle);
    const imageMeta = imageByAlt.get(key);
    const title = stripTitleNoise(imageMeta?.title || slugTitle || cleanAnchorTitle($, link));
    if (!title || /home|library|bookmark|history|leaderboard|login|start reading/i.test(title)) return;
    rows.push({ title, image: imageMeta?.image || imageFromAnchor($, link, baseUrl), chapter: chapterFromText(link.text()), genre: '', updateTime: '', updateBucket: 'Natsu', detailUrl, source: 'Natsu', sourceBadge: sourceBadge('Natsu') });
    seen.add(detailUrl);
  });
  return rows;
}

async function fetchNatsuLatest() {
  if (!ENABLE_NATSU_LATEST) return [];
  try {
    const html = await fetchHtml(NATSU_URL, 9000);
    const $ = cheerio.load(html);
    const rows = parseNatsuRows($, NATSU_URL);
    if (rows.length) return rows.map((item, index) => ({ id: `natsu-${slugId(item.title)}-${index}`, ...item, scrapedAt: new Date().toISOString(), seedFallback: false }));
  } catch {}
  const seed = await readProviderSeed('natsu');
  return seed.map((item, index) => ({ id: `natsu-${slugId(item.title)}-${index}`, ...item, scrapedAt: new Date().toISOString(), seedFallback: true }));
}

async function timedProvider(provider, fn) {
  const skip = shouldSkipProvider(provider);
  if (skip.skip) return [];
  const started = Date.now();
  try {
    const items = await fn();
    recordProviderHealth(provider, Array.isArray(items) && items.length > 0, Date.now() - started, items?.length ? '' : 'empty-latest');
    return Array.isArray(items) ? items : [];
  } catch (error) {
    recordProviderHealth(provider, false, Date.now() - started, error?.message || 'latest-error');
    return [];
  }
}

function attachMergeMeta(merged, providerGroups = [], usedStale = false, cacheSource = '') {
  Object.defineProperty(merged, 'mergeStats', {
    enumerable: false, configurable: true,
    value: providerGroups.map((group) => ({ provider: group.provider, total: group.items.length, health: providerHealth(group.provider), skipped: shouldSkipProvider(group.provider) }))
  });
  Object.defineProperty(merged, 'providerHealth', { enumerable: false, configurable: true, value: providerHealthSummary() });
  Object.defineProperty(merged, 'usedStale', { enumerable: false, configurable: true, value: usedStale });
  Object.defineProperty(merged, 'cacheSource', { enumerable: false, configurable: true, value: cacheSource });
  return merged;
}

async function fetchMergedMangaLatest() {
  await hydrateProviderHealth();

  // Fast path: do not scrape providers on every /manga or /api/manga/latest request.
  const fresh = await getCache(MERGED_CACHE_KEY).catch(() => null);
  if (Array.isArray(fresh?.value) && fresh.value.length) {
    return attachMergeMeta(fresh.value, [], false, fresh.source || 'cache');
  }

  const results = await Promise.allSettled([
    timedProvider('Komiku', fetchKomikuLatest),
    timedProvider('Wurmz', fetchWurmzLatest),
    timedProvider('Natsu', fetchNatsuLatest),
    timedProvider('ManhwaIndo', fetchManhwaIndoLatest),
    timedProvider('Komikcast', fetchKomikcastLatest)
  ]);
  const names = ['Komiku', 'Wurmz', 'Natsu', 'ManhwaIndo', 'Komikcast'];
  const providerGroups = results.map((result, index) => ({
    provider: names[index],
    items: result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
  })).filter((group) => group.items.length || group.provider === 'Komiku');

  let merged = mergeMangaLatestItems(providerGroups, { maxItems: MAX_ITEMS });
  const usedStale = !merged.length;
  if (usedStale) {
    const stale = await getCache(MERGED_CACHE_KEY, { stale: true }).catch(() => null);
    if (Array.isArray(stale?.value) && stale.value.length) merged = stale.value;
  } else {
    await setCache(MERGED_CACHE_KEY, merged, MERGED_CACHE_TTL).catch(() => undefined);
  }
  return attachMergeMeta(merged, providerGroups, usedStale, usedStale ? 'stale-cache' : 'network');
}

module.exports = {
  fetchKomikuLatest,
  fetchKomikcastLatest,
  fetchManhwaIndoLatest,
  fetchNatsuLatest,
  fetchWurmzLatest,
  fetchMergedMangaLatest,
  mergeMangaLatestItems,
  canonicalMangaKey,
  stripTitleNoise,
  chapterNumber
};
