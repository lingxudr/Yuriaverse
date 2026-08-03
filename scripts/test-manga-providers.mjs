import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { providerForUrl, providers } = require('../lib/manga-scraper/providers');
const { scrapeDetail, scrapeChapterImages } = require('../lib/manga-scraper/manager');

const samples = [
  'https://komiku.org/manga/the-ultimate-of-all-ages/',
  'https://komiku.org/the-ultimate-of-all-ages-chapter-02/'
];

const rows = [];
function record(name, ok, info='') { rows.push({ Check:name, OK: ok ? 'YES':'NO', Info: info }); if(!ok) process.exitCode = 1; }

console.log('Providers:', providers.map(p=>p.id).join(', '));
record('provider-detect-komiku', providerForUrl(samples[0]).id === 'komiku', providerForUrl(samples[0]).name);
record('provider-generic-fallback', providerForUrl('https://example.com/test').id === 'generic', providerForUrl('https://example.com/test').name);

try {
  const detail = await scrapeDetail(samples[0]);
  record('komiku-detail-title', Boolean(detail.title), detail.title || 'NO_TITLE');
  record('komiku-detail-synopsis', (detail.synopsis || '').length > 40, `${(detail.synopsis || '').length} chars`);
  record('komiku-detail-chapters', (detail.chapters || []).length > 0, `${(detail.chapters || []).length} chapters`);
} catch (error) {
  record('komiku-detail', false, error.message);
}

try {
  const reader = await scrapeChapterImages(samples[1]);
  const bad = (reader.images || []).filter(url => /logo|avatar|flag|banner|advert|facebook|twitter|instagram|discord|telegram|emoji|sprite|placeholder|favicon|tracking|pixel|lazy\.jpg|thumbnail|komikuplus|asset\/img/i.test(url));
  record('komiku-reader-count', (reader.images || []).length >= 3, `${(reader.images || []).length} images`);
  record('komiku-reader-clean', bad.length === 0, bad[0] || 'clean');
} catch (error) {
  record('komiku-reader', false, error.message);
}

console.table(rows);
if (process.exitCode) process.exit(process.exitCode);
console.log('Provider tests OK');
