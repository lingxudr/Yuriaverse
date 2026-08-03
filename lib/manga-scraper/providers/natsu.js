const { createProvider } = require('./base');

module.exports = createProvider({
  id: 'natsu',
  name: 'Natsu',
  hosts: ['natsu.one'],
  selectors: {
    title: ['h1.entry-title', 'h1', '.entry-title'],
    synopsis: ['.entry-content', '.summary__content', '.description', '.desc', '[itemprop="description"]'],
    genres: ['a[href*="genre"]', '.genres a', '.manga-genre a'],
    chapters: ['a[href*="chapter"]', '.wp-manga-chapter a', '.chapter-list a', '.eplister a'],
    author: ['.author-content a', '.author a'],
    artist: ['.artist-content a', '.artist a'],
    alt: ['.alternative', '.alter']
  }
});
