// Centralized selector configuration for Manga scraper.
// NOTE: These selectors are intentionally easy to edit because manga sites often change markup.

const siteConfigs = [
  {
    name: 'AinzScans',
    enabled: false,
    disabledReason: 'Cloudflare challenge from Vercel; optional mirror only',
    url: 'https://v2.ainzscans01.com/',
    selector: {
      item: 'article, .bs, .listupd .bs, .utao, .post, .manga-item',
      title: 'h3.title, .tt, .tt h3, h3, h2, .entry-title, a[title]',
      image: 'img.poster, img.thumbnail, img.wp-post-image, img',
      chapter: 'span.chapter, .epxs, .chapter, .lsch, .latest-chapter'
    }
  },
  {
    name: 'Komikcast',
    url: 'https://v3.komikcast.fit/',
    selector: {
      item: '.list-update_item, .komiklist .list-update_item, article, .bs, .postbody .bge',
      title: 'h2.komik-title, .title, h3, h4, a[title]',
      image: 'img.thumbnail, img, .ts-post-image',
      chapter: 'div.episode, .chapter, .epxs, .lsch'
    }
  },
  {
    name: 'Manhwalist',
    enabled: false,
    disabledReason: 'Cloudflare challenge from Vercel; optional mirror only',
    url: 'https://manhwalist.com/',
    selector: {
      item: '.bs, article, .manga-item, .listupd .bs, .post',
      title: 'h3, h2, .tt, .title, a[title]',
      image: 'img, img.poster, img.thumbnail',
      chapter: '.epxs, .chapter, span.chapter, .latest-chapter'
    }
  },
  {
    name: 'Kiryuu',
    url: 'https://kiryuu02.com/',
    selector: {
      item: '.bs, article, .listupd .bs, .utao, .post',
      title: '.tt, h3, h2, .entry-title, a[title]',
      image: 'img, img.poster, img.thumbnail',
      chapter: '.epxs, .chapter, span.chapter, .lsch'
    }
  },
  {
    name: 'Komiku',
    url: 'https://komiku.org/',
    selector: {
      item: '.ls4, .bge, article, .manga-item, .animepost',
      title: 'h3, h4, .tt, .title, a[title]',
      image: 'img, img.thumbnail, img.poster',
      chapter: '.chapter, .lsch, .epxs, span.chapter'
    }
  },
  {
    name: 'Shinigami',
    enabled: false,
    disabledReason: 'Cloudflare challenge from Vercel; optional mirror only',
    url: 'https://shinigami.asia/',
    selector: {
      item: '.bs, article, .listupd .bs, .manga-item, .post',
      title: '.tt, h3, h2, .title, a[title]',
      image: 'img, img.poster, img.thumbnail',
      chapter: '.epxs, .chapter, span.chapter, .lsch'
    }
  },
  {
    name: 'Mangaku',
    enabled: false,
    disabledReason: 'Fetch failed/domain unstable from Vercel; needs replacement domain',
    url: 'https://mangaku.in/',
    selector: {
      item: '.bs, article, .listupd .bs, .manga-item, .post',
      title: '.tt, h3, h2, .entry-title, a[title]',
      image: 'img, img.poster, img.thumbnail',
      chapter: '.epxs, .chapter, span.chapter, .lsch'
    }
  },
  {
    name: 'BacaKomik',
    enabled: false,
    disabledReason: 'Fetch failed/domain unstable from Vercel; needs replacement domain',
    url: 'https://bacakomik.co/',
    selector: {
      item: '.bs, article, .listupd .bs, .manga-item, .post',
      title: '.tt, h3, h2, .title, a[title]',
      image: 'img, img.poster, img.thumbnail',
      chapter: '.epxs, .chapter, span.chapter, .lsch'
    }
  },


  {
    name: 'Wurmz',
    url: 'https://wurmz.net/',
    selector: {
      item: 'article.comic-card, .comic-card, a[href*="/detail/"]',
      title: '.comic-title, h2, h3, a[title], img[alt]',
      image: 'img[data-src], img[data-lazy-src], img[src]',
      chapter: '.ch-row, .ch-num, .chapter, .epz, .episode'
    }
  },
  {
    name: 'ManhwaIndo',
    url: 'https://www.manhwaindo.my/',
    selector: {
      item: 'a[href*="/series/"]',
      title: 'img[alt], img[title], h3, h2, .tt, .title, a[title]',
      image: 'img, img.poster, img.thumbnail',
      chapter: '.epxs, .chapter, span.chapter, .lsch'
    }
  },
  {
    name: 'Natsu',
    url: 'https://natsu.one/',
    selector: {
      item: 'a[href*="/manga/"]',
      title: 'img[alt], img[title], h3, h2, .tt, .title, a[title]',
      image: 'img, img.poster, img.thumbnail',
      chapter: '.epxs, .chapter, span.chapter, .lsch'
    }
  },
  {
    name: 'WestManga',
    url: 'https://westmanga.info/',
    selector: {
      item: '.bs, article, .listupd .bs, .manga-item, .post',
      title: '.tt, h3, h2, .title, a[title]',
      image: 'img, img.poster, img.thumbnail',
      chapter: '.epxs, .chapter, span.chapter, .lsch'
    }
  }
];

module.exports = { siteConfigs };
