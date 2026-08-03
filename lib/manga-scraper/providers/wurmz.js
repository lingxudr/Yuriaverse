const { createProvider } = require('./base');
const { collectImages, parseDetail } = require('../core/parser');

function chapterFromUrl(url = '') {
  const m = String(url).match(/\/chapter\/([0-9]+(?:\.[0-9]+)?)/i);
  return m ? `Ch. ${m[1]}` : '';
}

function baseSeriesPath(url = '') {
  try {
    return new URL(url).pathname.replace(/\/chapter\/[0-9.]+\/?$/i, '').replace(/\/$/, '');
  } catch { return ''; }
}

const wurmz = createProvider({
  id: 'wurmz',
  name: 'Wurmz',
  hosts: ['wurmz.net'],
  selectors: {
    title: ['h1.entry-title', 'h1.post-title', '.series-title h1', 'h1.title', 'h1'],
    synopsis: ['.summary__content', '.manga-excerpt', '.post-content', '.sinopsis', '.desc', 'article p'],
    genres: ['.genre-info a', '.genres a', 'a[rel="tag"]', 'a[href*="genre"]'],
    chapters: ['a[href*="/chapter/"]'],
    author: ['.author a', '.fmed:contains("Author") span'],
    artist: ['.artist a'],
    alt: ['.alternative', '.alter']
  },
  parseDetail(html, url) {
    const detail = parseDetail(html, url, this);
    const basePath = baseSeriesPath(url);
    const seen = new Set();
    detail.chapters = (detail.chapters || [])
      .filter((chapter) => {
        try { return new URL(chapter.url).pathname.replace(/\/$/, '').startsWith(basePath + '/chapter/'); }
        catch { return false; }
      })
      .map((chapter) => ({ ...chapter, name: chapterFromUrl(chapter.url) || chapter.name }))
      .filter((chapter) => {
        if (seen.has(chapter.url)) return false;
        seen.add(chapter.url);
        return true;
      });
    detail.providerConfidence = detail.chapters?.length ? 'high' : 'medium';
    return detail;
  },
  parseReaderImages($, url) {
    const urls = [];
    $('img.reader-image, .reader-page img, main img.reader-image, main img').each((_, el) => {
      const node = $(el);
      const raw = node.attr('src') || node.attr('data-src') || node.attr('data-original') || node.attr('data-lazy-src');
      try {
        const src = new URL(raw, url).toString();
        if (/\.(jpe?g|png|webp)(\?|$)/i.test(src) && !urls.includes(src)) urls.push(src);
      } catch {}
    });
    return urls.length >= 3 ? urls : collectImages($, url);
  }
});

module.exports = wurmz;
