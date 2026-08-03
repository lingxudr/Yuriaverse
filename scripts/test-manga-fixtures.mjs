import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
const require = createRequire(import.meta.url);
const cheerio = require('cheerio');
const { providerForUrl } = require('../lib/manga-scraper/providers');

const ROOT = path.join(process.cwd(), 'fixtures', 'manga');
const samples = [
  { provider: 'komiku', type: 'detail', file: 'detail.html', url: 'https://komiku.org/manga/the-ultimate-of-all-ages/' },
  { provider: 'komiku', type: 'reader', file: 'reader.html', url: 'https://komiku.org/the-ultimate-of-all-ages-chapter-02/' }
];

const rows = [];
let failed = false;

async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
function record(name, ok, info = '') { rows.push({ Check: name, OK: ok ? 'YES' : 'NO', Info: info }); if (!ok) failed = true; }

for (const sample of samples) {
  const full = path.join(ROOT, sample.provider, sample.file);
  if (!(await exists(full))) { record(`${sample.provider}-${sample.type}`, true, 'fixture missing; skipped'); continue; }
  const html = await fs.readFile(full, 'utf8');
  const provider = providerForUrl(sample.url);
  if (sample.type === 'detail') {
    const detail = provider.parseDetail(html, sample.url);
    record(`${sample.provider}-detail-title`, Boolean(detail.title), detail.title || 'NO_TITLE');
    record(`${sample.provider}-detail-chapters`, (detail.chapters || []).length > 0, `${(detail.chapters || []).length} chapters`);
    record(`${sample.provider}-detail-synopsis`, (detail.synopsis || '').length > 40, `${(detail.synopsis || '').length} chars`);
  }
  if (sample.type === 'reader') {
    const $ = cheerio.load(html);
    const images = provider.parseReaderImages($, sample.url);
    const bad = images.filter((url) => /logo|avatar|flag|banner|advert|facebook|twitter|instagram|discord|telegram|emoji|sprite|placeholder|favicon|tracking|pixel|lazy\.jpg|thumbnail|komikuplus|asset\/img/i.test(url));
    record(`${sample.provider}-reader-count`, images.length >= 3, `${images.length} images`);
    record(`${sample.provider}-reader-clean`, bad.length === 0, bad[0] || 'clean');
  }
}

console.table(rows);
if (failed) process.exit(1);
console.log('Fixture parser tests OK');
