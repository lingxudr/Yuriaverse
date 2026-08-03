const cheerio = require('cheerio');
const { cleanText, normalizeUrl, uniqueBy, sortChapters } = require('./utils');

const BAD_IMAGE_RE = /logo|avatar|advert|banner|sprite|icon|emoji|flag|country|social|facebook|twitter|x-icon|telegram|whatsapp|instagram|discord|placeholder|transparent|pixel|tracking|loader|lazyload|lazy\.jpg|thumbnail|thumb|favicon|gravatar|profile|komikuplus|asset\/img/i;
const BAD_AD_PATH_RE = /(^|[\/._-])ads?([\/._-]|$)|(^|[\/._-])iklan([\/._-]|$)/i;
const BAD_ANCESTOR_SELECTOR = [
  'header', 'footer', 'nav', 'aside',
  '.header', '.site-header', '#header',
  '.footer', '.site-footer', '#footer',
  '.navbar', '.navigation', '.menu', '.breadcrumb',
  '.sidebar', '#sidebar', '.widget', '.widgets',
  '.ads', '.ad', '.advertisement', '.iklan', '[class*="ads"]', '[id*="ads"]', '[class*="advert"]',
  '.share', '.social', '.socmed', '[class*="social"]',
  '.logo', '[class*="logo"]', '.avatar', '[class*="avatar"]'
].join(',');

const READER_CONTAINER_SELECTORS = [
  '#readerarea', '.readerarea', '#reader-area', '#reader', '.reader',
  '.chapter-content', '.chapter-content-inner', '.chapterbody', '.chapter-body',
  '.read-content', '.reading-content', '.manga-reader', '.komik-reader',
  '.chapter-images', '.chapter-image', '.chapter-page', '.page-break',
  '.entry-content .separator', '.entry-content', '.post-content', '.content-area', '.content',
  'article .entry-content', 'main .entry-content', 'main .content'
];

function firstText($, root, selectors = []) {
  for (const s of selectors) {
    const text = cleanText(root.find(s).first().text() || $(s).first().text());
    if (text) return { value: text, selector: s };
  }
  return { value: '', selector: '' };
}

function meta($, name) {
  return cleanText($(`meta[name="${name}"], meta[property="og:${name}"]`).attr('content') || '');
}

function srcsetFirst(srcset = '') {
  return String(srcset).split(',')[0]?.trim().split(/\s+/)[0] || '';
}

function attrUrl($el) {
  return $el.attr('data-src') ||
    $el.attr('data-original') ||
    $el.attr('data-lazy-src') ||
    $el.attr('data-lazy') ||
    $el.attr('data-image') ||
    $el.attr('data-url') ||
    $el.attr('data-full') ||
    $el.attr('data-large-file') ||
    srcsetFirst($el.attr('data-srcset') || $el.attr('srcset')) ||
    $el.attr('src') || '';
}

function extractBackgroundUrls(style = '') {
  return [...String(style).matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
}

function knownSmallDimension($el) {
  const width = Number($el.attr('width') || $el.attr('data-width') || 0);
  const height = Number($el.attr('height') || $el.attr('data-height') || 0);
  // Only reject when dimensions are known. Many manga lazy images omit dimensions.
  if (width && height) return width < 400 || height < 600;
  return false;
}

function isBadAncestor($el) {
  return Boolean($el.closest(BAD_ANCESTOR_SELECTOR).length);
}

function validReaderImage(url = '', $el = null) {
  const clean = String(url || '').toLowerCase();
  if (!clean || !/^https?:\/\//.test(clean)) return false;
  if (BAD_IMAGE_RE.test(clean) || BAD_AD_PATH_RE.test(clean)) return false;
  if ($el && (isBadAncestor($el) || knownSmallDimension($el))) return false;
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(clean) || /wp-content|uploads|cdn|img|image|images|chapter|manga|komik|manhwa|manhua|reader|page/.test(clean);
}

function pushCandidate(urls, raw, baseUrl, $el = null) {
  const url = normalizeUrl(raw, baseUrl);
  if (validReaderImage(url, $el)) urls.push(url);
}

function collectFromContainer($, container, baseUrl, urls) {
  const root = container;
  root.find('picture source, img, [style*="background"]').each((_, el) => {
    const node = $(el);
    pushCandidate(urls, attrUrl(node), baseUrl, node);
    extractBackgroundUrls(node.attr('style')).forEach((raw) => pushCandidate(urls, raw, baseUrl, node));
  });
  root.find('noscript').each((_, el) => {
    const html = $(el).html() || '';
    const ns = cheerio.load(html);
    ns('picture source, img').each((__, img) => {
      const node = ns(img);
      pushCandidate(urls, attrUrl(node), baseUrl, null);
    });
  });
}

function collectJsImages($, baseUrl, urls) {
  const html = $.html();
  const patterns = [
    /(?:images|pages|chapterImages|chapter_pages|readerImages|ts_reader\.run)\s*[:=]\s*(\[[\s\S]{0,20000}?\])/gi,
    /\[\s*['"](https?:\\?\/\\?\/[^\]]+?)['"]/g,
    /['"](https?:\\?\/\\?\/[^'"]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[^'"]*)?)['"]/gi
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(html))) {
      const chunk = match[1] || match[0];
      [...chunk.matchAll(/https?:\\?\/\\?\/[^"'\]\s]+/g)].forEach((x) => {
        pushCandidate(urls, x[0].replace(/\\\//g, '/'), baseUrl, null);
      });
    }
  }
}

function collectImages($, baseUrl) {
  const urls = [];

  // 1. Dedicated reader containers first.
  for (const selector of READER_CONTAINER_SELECTORS) {
    $(selector).each((_, el) => collectFromContainer($, $(el), baseUrl, urls));
    if (urls.length >= 2) break;
  }

  // 2. JavaScript embedded chapter arrays.
  collectJsImages($, baseUrl, urls);

  // 3. noscript images outside containers, but still reject bad contexts by URL.
  $('noscript').each((_, el) => {
    const ns = cheerio.load($(el).html() || '');
    ns('img').each((__, img) => pushCandidate(urls, attrUrl(ns(img)), baseUrl, null));
  });

  // 4. Last-resort semantic content containers only. Never scan the whole document first.
  if (!urls.length) {
    $('main img, article img, .content img, .post img, .postbody img, .entry img').each((_, el) => {
      const node = $(el);
      pushCandidate(urls, attrUrl(node), baseUrl, node);
    });
  }

  return uniqueBy(urls, (x) => x).slice(0, 400);
}

function collectCover($, baseUrl) {
  const selectors = ['meta[property="og:image"]', '.thumb img', '.poster img', '.cover img', '.info img', '.komik_info-cover img', 'article img'];
  for (const selector of selectors) {
    const node = $(selector).first();
    const raw = selector.startsWith('meta') ? node.attr('content') : attrUrl(node);
    const url = normalizeUrl(raw, baseUrl);
    if (url && !BAD_IMAGE_RE.test(url.toLowerCase())) return url;
  }
  return '';
}

function parseDetail(html, baseUrl, provider = {}) {
  const $ = cheerio.load(html || '');
  const warnings = [];
  const sels = provider.selectors || {};
  const title = firstText($, $('body'), sels.title || ['h1', '.entry-title', '.komik_info-content-body-title', '.seriestuheader h1']).value || meta($, 'title');
  const synopsis = firstText($, $('body'), sels.synopsis || ['.sinopsis', '.synopsis', '.desc', '.entry-content-single', '.summary__content', '.komik_info-description', '.entry-content', '.seriestucontent', '[itemprop="description"]']).value || meta($, 'description') || 'Komik ini sedang dalam proses pengambilan data, silakan baca melalui sumber asli.';
  const genres = uniqueBy($((sels.genres || ['a[href*="genre"]', '.genre a', '.genres a', '.mgen a', '.seriestugenre a', '.infox a[rel="tag"]']).join(',')).toArray().map((el) => cleanText($(el).text())).filter((x) => x && x.length < 32 && !/chapter|komik|manga/i.test(x)), (x) => x.toLowerCase()).slice(0, 16);
  const bodyText = cleanText($('body').text());
  const status = (bodyText.match(/(Ongoing|On-going|Completed|Complete|Tamat|Berjalan|Hiatus)/i)?.[1] || 'Ongoing').replace(/On-going/i, 'Ongoing').replace(/^Complete$/i, 'Completed');
  const chapters = [];
  const seen = new Set();
  $((sels.chapters || ['.eplister a', '.chapter-list a', '.chapters a', '.clstyle a', '.episodelist a', '.daftar-chapter a', '.komik_info-chapters a', 'a[href*="chapter"]', 'a[href*="/ch/"]', 'a[href*="/baca/"]']).join(',')).each((_, el) => {
    const a = $(el);
    const url = normalizeUrl(a.attr('href'), baseUrl);
    let name = cleanText(a.text()) || cleanText(a.attr('title'));
    if (!name && url) name = 'Chapter';
    if (!url || !name || seen.has(url)) return;
    seen.add(url);
    const row = cleanText(a.closest('li,tr,div,article').text());
    chapters.push({ name, url, date: row.match(/\b\d{1,2}\s+\w+\s+\d{4}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d+\s+(?:menit|jam|hari|minggu|bulan|tahun)\s+lalu\b/i)?.[0] || '', views: row.match(/[\d.,]+\s*(?:views?|dilihat|x)/i)?.[0] || '' });
  });
  const sortedChapters = sortChapters(chapters);
  if (!title) warnings.push('missing-title');
  if (!genres.length) warnings.push('missing-genres');
  if (!sortedChapters.length) warnings.push('empty-chapters');
  return { title, cover: collectCover($, baseUrl), synopsis, genres: genres.length ? genres : ['Action', 'Fantasy'], status, author: firstText($, $('body'), sels.author || ['.author a', '.fmed:contains("Author") span']).value, artist: firstText($, $('body'), sels.artist || ['.artist a']).value, alternativeTitles: firstText($, $('body'), sels.alt || ['.alternative', '.alter']).value, rating: bodyText.match(/(?:rating|score)\s*:?\s*([\d.]+)/i)?.[1] || '', views: bodyText.match(/([\d.,]+)\s*(?:views?|dilihat)/i)?.[0] || '', releaseYear: bodyText.match(/\b(19|20)\d{2}\b/)?.[0] || '', chapters: sortedChapters, warnings };
}

module.exports = { parseDetail, collectImages };
