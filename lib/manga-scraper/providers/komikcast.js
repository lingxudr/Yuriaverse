const { createProvider } = require('./base');

module.exports = createProvider({
  id: 'komikcast',
  name: 'Komikcast',
  hosts: ['komikcast', 'komikcast.fit'],
  selectors: {
    title: ['h1.entry-title', '.komik_info-content-body-title', 'h1'],
    synopsis: ['.komik_info-description', '.sinopsis', '.entry-content', '.desc'],
    genres: ['.komik_info-content-genre a', 'a[href*="genre"]', '.genre a'],
    chapters: ['.komik_info-chapters a', '.chapter-list a', 'a[href*="chapter"]'],
    author: ['.komik_info-content-info:contains("Author") a', '.author a'],
    artist: ['.komik_info-content-info:contains("Artist") a', '.artist a'],
    alt: ['.komik_info-content-native', '.alternative']
  }
});
