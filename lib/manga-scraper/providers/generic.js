const { createProvider } = require('./base');

module.exports = createProvider({
  id: 'generic',
  name: 'Generic',
  hosts: [],
  selectors: {
    title: ['h1', '.entry-title', '.title'],
    synopsis: ['.sinopsis', '.synopsis', '.desc', '.entry-content', 'meta[name="description"]'],
    genres: ['a[href*="genre"]', '.genre a', '.genres a'],
    chapters: ['a[href*="chapter"]', 'a[href*="/ch/"]', 'a[href*="/baca/"]'],
    author: ['.author a'],
    artist: ['.artist a'],
    alt: ['.alternative', '.alter']
  },
  match() { return true; }
});
