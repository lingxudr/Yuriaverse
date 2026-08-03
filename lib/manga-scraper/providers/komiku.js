const { createProvider } = require('./base');
const { collectImages, parseDetail } = require('../core/parser');

const komiku = createProvider({
  id: 'komiku',
  name: 'Komiku',
  hosts: ['komiku.org'],
  selectors: {
    title: ['h1', 'h1[itemprop="name"]', '.komik_info-content-body-title'],
    synopsis: ['.desc', '.sinopsis', '.komik_info-description', 'meta[name="description"]'],
    genres: ['table a[href*="genre"]', 'a[href*="genre"]'],
    chapters: ['a[href*="chapter"]', '.chapter-list a', '.daftar-chapter a'],
    author: ['td:contains("Pengarang") + td', 'td:contains("Author") + td'],
    artist: ['td:contains("Ilustrator") + td', 'td:contains("Artist") + td'],
    alt: ['td:contains("Judul Alternatif") + td', '.alter']
  },
  parseDetail(html, url) {
    const detail = parseDetail(html, url, this);
    // Komiku tables often contain useful metadata. Keep generic parser output but tag provider confidence.
    detail.providerConfidence = detail.chapters?.length ? 'high' : 'medium';
    return detail;
  },
  parseReaderImages($, url) {
    // Komiku reader pages place real page images in .content with class klazy/ww.
    const urls = [];
    $('.content img.klazy, .content img.ww, .content img[id]').each((_, el) => {
      const node = $(el);
      const raw = node.attr('src') || node.attr('data-src') || node.attr('data-original');
      try {
        const src = new URL(raw, url).toString();
        if (/img\.komiku\.org\/.*(?:uploads|wp-content)/i.test(src) && !urls.includes(src)) urls.push(src);
      } catch {}
    });
    return urls.length >= 3 ? urls : collectImages($, url);
  }
});

module.exports = komiku;
