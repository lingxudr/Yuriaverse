// scraper-worker.js
// Worker scraping manga ringan untuk VPS/lokal. Tidak menyentuh kode Anime/Donghua Animesu.
// Install: npm i axios cheerio p-limit

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs/promises');
const path = require('path');

const TARGET_SITES = [
  // Isi/ganti URL sesuai kebutuhan manga kamu.
  { name: 'Komiku', url: 'https://komiku.org/' },
  { name: 'Komikcast', url: 'https://v3.komikcast.fit/' },
  { name: 'Kiryuu', url: 'https://kiryuu02.com/' },
  { name: 'WestManga', url: 'https://westmanga.info/' }
];

const OUTPUT_FILE = path.join(process.cwd(), 'data', 'manga-scrape-result.json');
const MAX_PARALLEL = 2;
const DELAY_AFTER_SITE_MS = 1000;
const REQUEST_TIMEOUT_MS = 18000;
const MAX_ITEMS_PER_SITE = 40;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function absoluteUrl(value, baseUrl) {
  if (!value || typeof value !== 'string' || value.startsWith('data:')) return '';
  try {
    return new URL(value.trim(), baseUrl).toString();
  } catch {
    return '';
  }
}

function firstImage($, root, baseUrl) {
  const img = root.find('img').first();
  const srcset = img.attr('data-srcset') || img.attr('srcset') || '';
  const firstSrcset = srcset.split(',')[0]?.trim().split(/\s+/)[0];
  const raw =
    img.attr('data-src') ||
    img.attr('data-lazy-src') ||
    img.attr('data-original') ||
    img.attr('data-cfsrc') ||
    firstSrcset ||
    img.attr('src') ||
    '';
  return absoluteUrl(raw, baseUrl);
}

function chapterObjects($, root, baseUrl) {
  const chapters = [];
  const seen = new Set();

  root.find('a[href]').each((_, el) => {
    const link = $(el);
    const label = cleanText(link.text()) || cleanText(link.attr('title'));
    const href = absoluteUrl(link.attr('href'), baseUrl);
    const isChapter = /chapter|ch\.?\s*\d+|episode|eps|bab\s*\d+/i.test(label + ' ' + href);

    if (!isChapter || !href || seen.has(href)) return;
    seen.add(href);

    const parentText = cleanText(link.parent().text());
    const dateMatch = parentText.match(/\b\d{1,2}\s+\w+\s+\d{4}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/i);
    const viewsMatch = parentText.match(/([\d.,]+)\s*(views?|dilihat|x)/i);

    chapters.push({
      chapter_title: label || `Chapter ${chapters.length + 1}`,
      chapter_url: href,
      date: dateMatch?.[0] || '',
      views: viewsMatch?.[0] || ''
    });
  });

  if (chapters.length) return chapters.slice(0, 5);

  const fallbackChapter = cleanText(root.find('.chapter,.epxs,.lsch,.latest-chapter,.episode').first().text());
  if (fallbackChapter) {
    return [{ chapter_title: fallbackChapter, chapter_url: '', date: '', views: '' }];
  }

  return [];
}

function titleFrom($, root) {
  const titleEl = root.find('h1,h2,h3,h4,.title,.tt,.entry-title,a[title],a').first();
  return cleanText(titleEl.attr('title')) || cleanText(titleEl.text());
}

function detailUrlFrom($, root, baseUrl) {
  const href = root.find('a[href]').first().attr('href') || (root.is('a') ? root.attr('href') : '');
  return absoluteUrl(href, baseUrl);
}

function normalizeKey(title = '') {
  return cleanText(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeKey(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function scrapeSite(site) {
  const started = Date.now();
  const result = { source: site.name, url: site.url, ok: false, count: 0, error: null, items: [] };

  try {
    console.log(`[worker] Scraping ${site.name}: ${site.url}`);
    const response = await axios.get(site.url, {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        'User-Agent': randomUserAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      }
    });

    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);

    const $ = cheerio.load(response.data || '');
    const candidates = $('article, .bs, .manga-item, .post, .list-update_item, .bge, .ls4, li').toArray();
    const items = [];

    for (const node of candidates) {
      if (items.length >= MAX_ITEMS_PER_SITE) break;
      const root = $(node);
      const title = titleFrom($, root);
      if (!title || title.length < 2 || title.length > 140) continue;

      items.push({
        title,
        image_url: firstImage($, root, site.url) || `https://placehold.co/300x450/191C2D/FFFFFF?text=${encodeURIComponent(title.slice(0, 24))}`,
        detail_url: detailUrlFrom($, root, site.url),
        chapters: chapterObjects($, root, site.url),
        source: site.name
      });
    }

    // Fallback untuk markup sederhana: cari semua link manga.
    if (!items.length) {
      const seenUrls = new Set();
      $('a[href*="/manga/"], a[href*="/komik/"]').each((_, el) => {
        if (items.length >= MAX_ITEMS_PER_SITE) return false;
        const link = $(el);
        const href = absoluteUrl(link.attr('href'), site.url);
        if (!href || seenUrls.has(href)) return;
        const title = cleanText(link.attr('title')) || cleanText(link.text());
        if (!title || title.length < 2 || title.length > 140) return;
        const root = link.closest('article, .bs, .manga-item, .post, .list-update_item, .bge, .ls4, li, div');
        seenUrls.add(href);
        items.push({
          title,
          image_url: firstImage($, root.length ? root : link, site.url) || `https://placehold.co/300x450/191C2D/FFFFFF?text=${encodeURIComponent(title.slice(0, 24))}`,
          detail_url: href,
          chapters: chapterObjects($, root.length ? root : link, site.url),
          source: site.name
        });
      });
    }

    result.ok = true;
    result.items = items;
    result.count = items.length;
  } catch (error) {
    result.error = error.code || error.message || 'Unknown error';
    console.warn(`[worker] ${site.name} failed: ${result.error}`);
  } finally {
    result.ms = Date.now() - started;
    console.log(`[worker] ${site.name} done in ${result.ms}ms, items=${result.count}`);
    await sleep(DELAY_AFTER_SITE_MS);
  }

  return result;
}

async function runScraper() {
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(MAX_PARALLEL);

  const siteResults = await Promise.all(TARGET_SITES.map((site) => limit(() => scrapeSite(site))));
  const items = dedupe(siteResults.flatMap((site) => site.items));

  const output = {
    generated_at: new Date().toISOString(),
    total: items.length,
    sources: siteResults.map(({ source, url, ok, count, error, ms }) => ({ source, url, ok, count, error, ms })),
    items
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.table(output.sources);
  console.log(`[worker] Saved ${items.length} manga records to ${OUTPUT_FILE}`);
  return output;
}

if (require.main === module) {
  runScraper().catch((error) => {
    console.error('[worker] Fatal error caught:', error);
    process.exitCode = 1;
  });
}

module.exports = { runScraper };
