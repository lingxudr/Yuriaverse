const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Isi / ubah 4 target ini sesuai sumber yang ingin dipakai.
const TARGETS = [
  { name: 'AinzScans', url: 'https://v2.ainzscans01.com/' },
  { name: 'Komikcast', url: 'https://v3.komikcast.fit/' },
  { name: 'Manhwalist', url: 'https://manhwalist.com/' },
  { name: 'Komiku', url: 'https://komiku.org/' }
];

const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'worker-manga-output.json');
const TIMEOUT_MS = 18000;
const DELAY_MS = 1000;
const MAX_PARALLEL = 2;
const MAX_ITEMS_PER_SITE = 30;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

function absoluteUrl(value, baseUrl) {
  if (!value || typeof value !== 'string' || value.startsWith('data:')) return '';
  try { return new URL(value.trim(), baseUrl).toString(); }
  catch { return ''; }
}

function text($el) {
  return String($el.text() || '').replace(/\s+/g, ' ').trim();
}

function firstImage($, root, baseUrl) {
  const img = root.find('img').first();
  const raw = img.attr('data-src') || img.attr('data-lazy-src') || img.attr('data-original') || img.attr('src') || '';
  return absoluteUrl(raw, baseUrl);
}

function detailUrl(root, baseUrl) {
  const href = root.find('a[href]').first().attr('href') || (root.is('a') ? root.attr('href') : '');
  return absoluteUrl(href, baseUrl);
}

function chaptersFrom($, root) {
  const chapters = [];
  root.find('a, span, div').each((_, el) => {
    const label = text($(el));
    if (/chapter|ch\.?\s*\d+|episode|eps/i.test(label) && label.length <= 80) chapters.push(label);
  });
  return [...new Set(chapters)].slice(0, 5);
}

function normalizeTitle(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function scrapeOneSite(target) {
  const started = Date.now();
  const result = { source: target.name, url: target.url, ok: false, items: [], error: null, ms: 0 };

  try {
    console.log(`[worker] Start ${target.name}`);
    const res = await axios.get(target.url, {
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      }
    });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const $ = cheerio.load(res.data || '');
    const candidates = $('article, .bs, .manga-item, .post, .list-update_item, .bge, .ls4').toArray();
    const items = [];

    for (const node of candidates) {
      if (items.length >= MAX_ITEMS_PER_SITE) break;
      const root = $(node);
      const title = root.find('h1,h2,h3,h4,.title,.tt,a[title]').first().attr('title') || text(root.find('h1,h2,h3,h4,.title,.tt,a').first());
      if (!title || title.length < 2) continue;
      items.push({
        title,
        image: firstImage($, root, target.url) || `https://placehold.co/300x450/191C2D/FFFFFF?text=${encodeURIComponent(title.slice(0, 24))}`,
        chapters: chaptersFrom($, root),
        detailUrl: detailUrl(root, target.url),
        source: target.name
      });
    }

    // Fallback parser for sites like Komiku where latest cards may be simple manga links.
    if (!items.length) {
      const seenUrls = new Set();
      $('a[href*="/manga/"]').each((_, el) => {
        if (items.length >= MAX_ITEMS_PER_SITE) return false;
        const link = $(el);
        const href = absoluteUrl(link.attr('href'), target.url);
        if (!href || seenUrls.has(href)) return;
        const title = link.attr('title') || text(link.find('h1,h2,h3,h4,.title,.tt').first()) || text(link);
        if (!title || title.length < 2 || title.length > 120) return;
        const root = link.closest('article, .bs, .manga-item, .post, .list-update_item, .bge, .ls4, div, li');
        seenUrls.add(href);
        items.push({
          title,
          image: firstImage($, root.length ? root : link, target.url) || `https://placehold.co/300x450/191C2D/FFFFFF?text=${encodeURIComponent(title.slice(0, 24))}`,
          chapters: chaptersFrom($, root.length ? root : link),
          detailUrl: href,
          source: target.name
        });
      });
    }

    result.ok = true;
    result.items = items;
    result.ms = Date.now() - started;
    console.log(`[worker] Done ${target.name}: ${items.length} items in ${result.ms}ms`);
  } catch (error) {
    result.error = error.code || error.message || 'Unknown error';
    result.ms = Date.now() - started;
    console.warn(`[worker] Failed ${target.name}: ${result.error}`);
  } finally {
    await sleep(DELAY_MS);
  }

  return result;
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
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(MAX_PARALLEL);
  const siteResults = await Promise.all(TARGETS.map((target) => limit(() => scrapeOneSite(target))));
  const allItems = dedupe(siteResults.flatMap((site) => site.items));

  const output = {
    generatedAt: new Date().toISOString(),
    totalItems: allItems.length,
    sources: siteResults.map(({ source, url, ok, error, ms, items }) => ({ source, url, ok, error, ms, itemCount: items.length })),
    items: allItems
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.table(output.sources);
  console.log(`[worker] Saved ${allItems.length} items to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('[worker] Fatal error caught safely:', error);
  process.exitCode = 1;
});
