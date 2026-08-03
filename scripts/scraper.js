const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { siteConfigs } = require('../site-configs.js');
const { mergeMangaLatestItems } = require('../lib/manga-latest-source.js');

const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'latest-manga.json');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAX_PER_SITE = Number(process.env.MANGA_SCRAPER_MAX_PER_SITE || 60);
const REQUEST_TIMEOUT = Number(process.env.MANGA_SCRAPER_TIMEOUT_MS || 15000);
const DELAY_MS = Number(process.env.MANGA_SCRAPER_DELAY_MS || 1200);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function cleanText(value = '') { return String(value || '').replace(/\s+/g, ' ').trim(); }

function absoluteUrl(value, baseUrl) {
  if (!value || typeof value !== 'string') return '';
  const clean = value.trim();
  if (!clean || clean.startsWith('data:')) return '';
  try { return new URL(clean, baseUrl).toString(); }
  catch { return ''; }
}

function firstAttr($el, attrs) {
  for (const attr of attrs) {
    const value = $el.attr(attr);
    if (value) return value;
  }
  return '';
}

function srcFromSrcset(srcset = '') {
  return String(srcset).split(',')[0]?.trim().split(/\s+/)[0] || '';
}

function imageFrom($, root, selector, baseUrl) {
  const img = root.find(selector).first();
  if (!img.length) return '';
  const raw = firstAttr(img, ['data-src', 'data-lazy-src', 'data-original', 'data-cfsrc', 'src']) || srcFromSrcset(img.attr('data-srcset') || img.attr('srcset'));
  return absoluteUrl(raw, baseUrl);
}

function detailUrlFrom(root, titleEl, baseUrl) {
  const candidates = [
    titleEl.is('a') ? titleEl.attr('href') : '',
    titleEl.closest('a[href]').attr('href') || '',
    titleEl.find('a[href]').first().attr('href') || '',
    root.find('a[href]').first().attr('href') || '',
    root.is('a') ? root.attr('href') : ''
  ].filter(Boolean);
  for (const candidate of candidates) {
    const url = absoluteUrl(candidate, baseUrl);
    if (url) return url;
  }
  return '';
}

function textFrom(root, selector) {
  if (!selector) return '';
  return root.find(selector).first().text().replace(/\s+/g, ' ').trim();
}

function titleFrom($, root, titleEl, selector) {
  const attrTitle = titleEl.attr('title') || titleEl.find('[title]').first().attr('title') || '';
  const selected = textFrom(root, selector);
  return (attrTitle || selected || titleEl.text() || '').replace(/\s+/g, ' ').trim();
}

function normalizeTitle(title = '') {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function slugId(value = '') {
  return normalizeTitle(value).replace(/\s+/g, '-');
}

function sourceBadge(name = '') {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 4).toUpperCase() || name.slice(0, 3).toUpperCase();
}

function scrapeKomikuLatest($, baseUrl, sourceName) {
  const rows = [];
  const collect = (root, bucketLabel = '') => {
    root.find('article.ls2').each((_, node) => {
      if (rows.length >= MAX_PER_SITE) return false;
      const card = $(node);
      const titleLink = card.find('.ls2j h3 a[href], h3 a[href]').first();
      const title = cleanText(titleLink.text()) || cleanText(titleLink.attr('title')).replace(/^Baca\s+(Komik|Manga|Manhwa|Manhua)\s+/i, '');
      const detailUrl = absoluteUrl(titleLink.attr('href'), baseUrl);
      const img = card.find('.ls2v img').not('.flag').first();
      const image = absoluteUrl(firstAttr(img, ['data-src', 'data-lazy-src', 'data-original', 'src']), baseUrl);
      const chapterLink = card.find('a.ls2l[href], a[href*="chapter"]').first();
      const chapter = cleanText(chapterLink.text()) || 'Chapter terbaru';
      const meta = cleanText(card.find('.ls2t').first().text());
      const [genreRaw, updateRaw] = meta.split('·').map((x) => cleanText(x));
      if (!title || !detailUrl || rows.some((row) => row.detailUrl === detailUrl)) return;
      rows.push({
        title: title.replace(/^Baca\s+(Komik|Manga|Manhwa|Manhua)\s+/i, ''),
        image: image || `https://placehold.co/300x450/191C2D/FFFFFF?text=${encodeURIComponent(title.slice(0, 24))}`,
        chapter,
        genre: genreRaw || '',
        updateTime: updateRaw || bucketLabel,
        updateBucket: bucketLabel,
        detailUrl,
        source: sourceName,
        sourceBadge: sourceBadge(sourceName)
      });
    });
  };
  const latest = $('section#Terbaru').first();
  if (latest.length) collect(latest, 'Hari ini');
  const added = $('#ls12-baru').first();
  if (rows.length < MAX_PER_SITE && added.length) collect(added, 'Kemarin');
  return rows;
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function scrapeSite(config) {
  const { name, url, selector } = config;
  try {
    console.log(`[scraper] Fetching ${name}: ${url}`);
    const res = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      }
    });

    const $ = cheerio.load(res.data || '');
    const komikuLatest = /komiku/i.test(name) ? scrapeKomikuLatest($, url, name) : [];
    if (komikuLatest.length) {
      console.log(`[scraper] ${name}: ${komikuLatest.length} latest item from #Terbaru`);
      return komikuLatest;
    }
    const rows = [];
    const itemSelector = selector.item || 'article, .bs, .manga-item, .post, li, div';
    const itemNodes = $(itemSelector).toArray();

    for (const node of itemNodes) {
      if (rows.length >= MAX_PER_SITE) break;
      const root = $(node);
      let titleEl = root.find(selector.title).first();
      if (!titleEl.length && root.is(selector.title)) titleEl = root;
      if (!titleEl.length) continue;

      const title = titleFrom($, root, titleEl, selector.title);
      if (!title || title.length < 2) continue;

      const image = imageFrom($, root, selector.image, url);
      const chapter = textFrom(root, selector.chapter) || 'Chapter terbaru';
      const detailUrl = detailUrlFrom(root, titleEl, url);

      rows.push({
        title,
        image: image || `https://via.placeholder.com/200x300?text=${encodeURIComponent(title.slice(0, 24))}`,
        chapter,
        detailUrl,
        source: name,
        sourceBadge: sourceBadge(name)
      });
    }

    console.log(`[scraper] ${name}: ${rows.length} item`);
    return rows;
  } catch (error) {
    console.warn(`[scraper] ${name} failed: ${error?.response?.status || error?.code || error?.message || 'unknown error'}`);
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeTitle(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const all = [];

  for (const config of siteConfigs) {
    if (config.enabled === false) { console.log(`[scraper] ${config.name}: skipped (${config.disabledReason || 'disabled'})`); continue; }
    const items = await scrapeSite(config);
    all.push(...items);
    await sleep(DELAY_MS);
  }

  const groups = siteConfigs.filter((config) => config.enabled !== false).map((config) => ({
    provider: config.name,
    items: all.filter((item) => item.source === config.name)
  }));
  const finalItems = mergeMangaLatestItems(groups, { maxItems: Number(process.env.MANGA_LATEST_MAX_ITEMS || 60) });

  if (!finalItems.length) {
    console.warn('[scraper] No items scraped. Keeping existing latest-manga.json to avoid publishing an empty list.');
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalItems, null, 2), 'utf8');
  console.log(`[scraper] Saved ${finalItems.length} item to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('[scraper] Fatal error:', error);
  process.exitCode = 1;
});
