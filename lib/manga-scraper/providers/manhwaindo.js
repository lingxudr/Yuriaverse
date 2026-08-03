const { createProvider } = require('./base');

module.exports = createProvider({
  id: 'manhwaindo',
  name: 'ManhwaIndo',
  hosts: ['manhwaindo.my'],
  selectors: {
    title: ['h1.entry-title', 'h1', '.entry-title', '.seriestucon h1'],
    synopsis: ['.entry-content', '.seriestucon .entry-content', '.desc', '.sinopsis', '[itemprop="description"]'],
    genres: ['a[href*="genre"]', '.genres a', '.seriestugenre a'],
    chapters: ['a[href*="/chapter/"]', '.eplister a', '.chapter-list a', '.bixbox a[href*="chapter"]'],
    author: ['.fmed:contains("Author") span', '.author a'],
    artist: ['.fmed:contains("Artist") span', '.artist a'],
    alt: ['.alternative', '.alter']
  }
});
