const BASE = process.env.ANIMESU_URL || 'https://animesu.vercel.app';
const TIMEOUT_MS = Number(process.env.MANGA_TEST_TIMEOUT_MS || 30000);
const MIN_IMAGES = Number(process.env.MANGA_TEST_MIN_IMAGES || 3);

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout: ${label}`)), ms))
  ]);
}

async function getJson(path) {
  const started = Date.now();
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await withTimeout(fetch(url, { cache: 'no-store' }), TIMEOUT_MS, path);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (error) { throw new Error(`Invalid JSON ${path}: ${text.slice(0, 120)}`); }
  return { url, status: res.status, ok: res.ok, ms: Date.now() - started, json };
}

async function getText(path) {
  const started = Date.now();
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await withTimeout(fetch(url, { cache: 'no-store' }), TIMEOUT_MS, path);
  const text = await res.text();
  return { url, status: res.status, ok: res.ok, ms: Date.now() - started, text };
}

function badReaderImages(images = []) {
  const badToken = /logo|avatar|flag|banner|advert|facebook|twitter|instagram|discord|telegram|emoji|sprite|placeholder|favicon|tracking|pixel|lazy\.jpg|thumbnail|komikuplus|asset\/img/i;
  const badAdPath = /(^|[\/._-])ads?([\/._-]|$)|(^|[\/._-])iklan([\/._-]|$)/i;
  return images.filter((url) => badToken.test(url) || badAdPath.test(url));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const rows = [];
const failures = [];
function record(name, ok, ms, info = '') { rows.push({ Check: name, OK: ok ? 'YES' : 'NO', 'Time(ms)': ms, Info: info }); }

async function run() {
  console.log(`[manga-test] Base: ${BASE}`);

  try {
    const page = await getText('/manga');
    const clean = !/Application error|Terjadi kendala|FUNCTION_INVOCATION|Unhandled Runtime/i.test(page.text);
    assert(page.ok && clean, '/manga page has runtime error or non-200 status');
    record('/manga page', true, page.ms, `${page.status} ${page.text.length}b`);
  } catch (error) { failures.push(error.message); record('/manga page', false, 0, error.message); }

  let latest = [];
  try {
    const latestRes = await getJson('/api/manga/latest');
    latest = latestRes.json?.data || [];
    assert(Array.isArray(latest) && latest.length > 0, 'Manga latest API returned no items');
    assert(latest[0]?.detailUrl, 'First latest manga item has no detailUrl');
    record('/api/manga/latest', true, latestRes.ms, `${latest.length} items • ${latest[0]?.title}`);
  } catch (error) { failures.push(error.message); record('/api/manga/latest', false, 0, error.message); }

  try {
    const staticRes = await getJson('/data/latest-manga.json');
    const items = staticRes.json || [];
    assert(Array.isArray(items) && items.length > 0, 'latest-manga.json is empty/missing');
    assert(items[0]?.detailUrl, 'latest-manga.json first item has no detailUrl');
    record('/data/latest-manga.json', true, staticRes.ms, `${items.length} items • ${items[0]?.title}`);
  } catch (error) { failures.push(error.message); record('/data/latest-manga.json', false, 0, error.message); }

  if (!latest.length) {
    console.table(rows);
    throw new Error('Cannot continue: no latest manga items');
  }

  let detail;
  const sample = latest[0];
  try {
    const detailRes = await getJson(`/api/scrape-detail?url=${encodeURIComponent(sample.detailUrl)}`);
    detail = detailRes.json?.data;
    assert(detailRes.json?.ok === true, 'Detail API ok=false');
    assert(detail?.synopsis && detail.synopsis.length > 40, 'Detail synopsis missing/too short');
    assert(Array.isArray(detail?.genres) && detail.genres.length > 0, 'Detail genres missing');
    assert(Array.isArray(detail?.chapters) && detail.chapters.length > 0, 'Detail chapters missing');
    record('/api/scrape-detail', true, detailRes.ms, `${detail.chapters.length} chapters • ${detail.genres.length} genres`);
  } catch (error) { failures.push(error.message); record('/api/scrape-detail', false, 0, error.message); }

  if (detail?.chapters?.length) {
    const chapterIndexes = Array.from(new Set([0, Math.floor(detail.chapters.length / 2), detail.chapters.length - 1])).filter((i) => i >= 0);
    for (const index of chapterIndexes) {
      const chapter = detail.chapters[index];
      try {
        const chapterRes = await getJson(`/api/scrape-chapter?url=${encodeURIComponent(chapter.url)}`);
        const images = chapterRes.json?.images || [];
        const bad = badReaderImages(images);
        assert(chapterRes.ok, `Chapter API status ${chapterRes.status}`);
        assert(images.length >= MIN_IMAGES, `Chapter ${chapter.name} has only ${images.length} images`);
        assert(bad.length === 0, `Chapter ${chapter.name} has bad image: ${bad[0]}`);
        record(`/api/scrape-chapter #${index}`, true, chapterRes.ms, `${images.length} images • ${chapter.name}`);
      } catch (error) { failures.push(error.message); record(`/api/scrape-chapter #${index}`, false, 0, error.message); }
    }

    try {
      const readerId = Buffer.from(encodeURIComponent(detail.chapters[0].url)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const reader = await getText(`/manga/read/${readerId}?back=${encodeURIComponent(sample.id || '')}&title=${encodeURIComponent(sample.title || 'Manga')}`);
      const clean = !/Application error|Terjadi kendala|FUNCTION_INVOCATION|Unhandled Runtime/i.test(reader.text);
      assert(reader.ok && clean, 'Reader page has runtime error or non-200 status');
      record('/manga/read/[id]', true, reader.ms, `${reader.status} ${reader.text.length}b`);
    } catch (error) { failures.push(error.message); record('/manga/read/[id]', false, 0, error.message); }
  }

  console.table(rows);
  if (failures.length) {
    console.error('[manga-test] FAILURES:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('[manga-test] OK');
}

run().catch((error) => {
  console.error('[manga-test] Fatal:', error.message || error);
  process.exit(1);
});
