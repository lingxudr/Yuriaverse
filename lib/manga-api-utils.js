const fs = require('fs/promises');
const path = require('path');
const { fetchMergedMangaLatest } = require('./manga-latest-source');

const GENRE_ALIASES = {
  action: ['action', 'aksi'],
  romance: ['romance', 'romantis'],
  fantasy: ['fantasy', 'fantasi'],
  comedy: ['comedy', 'komedi'],
  horror: ['horror', 'horor'],
  school: ['school', 'sekolah', 'gakuen'],
  murim: ['murim', 'martial arts'],
  isekai: ['isekai'],
  completed: ['completed', 'complete', 'tamat'],
  ongoing: ['ongoing', 'berjalan'],
  latest: ['latest', 'baru', 'jam lalu', 'menit lalu', 'hari lalu'],
  popular: ['popular', 'populer', 'jt views', 'rb views']
};

function cleanText(value = '') { return String(value || '').replace(/\s+/g, ' ').trim(); }
function normalize(value = '') { return cleanText(value).toLowerCase(); }

async function readStaticManga() {
  try {
    const file = path.join(process.cwd(), 'public', 'data', 'latest-manga.json');
    const json = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

function dedupe(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalize(item.detailUrl || item.id || item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getMangaPool() {
  const [live, statik] = await Promise.allSettled([fetchMergedMangaLatest(), readStaticManga()]);
  const liveItems = live.status === 'fulfilled' && Array.isArray(live.value) ? live.value : [];
  const staticItems = statik.status === 'fulfilled' && Array.isArray(statik.value) ? statik.value : [];
  return dedupe([...liveItems, ...staticItems]);
}

function matchesQuery(item, query = '') {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(`${item.title} ${item.chapter} ${item.genre} ${item.status} ${item.updateTime} ${item.source}`);
  return haystack.includes(q);
}

function matchesGenre(item, genre = '') {
  const g = normalize(genre);
  if (!g || g === 'all' || g === 'semua') return true;
  const aliases = GENRE_ALIASES[g] || [g];
  const haystack = normalize(`${item.title} ${item.chapter} ${item.genre} ${item.status} ${item.updateTime} ${item.source}`);
  return aliases.some((alias) => haystack.includes(alias));
}

function filterManga(items, { query = '', genre = '', page = 1, limit = 60 } = {}) {
  const filtered = items.filter((item) => matchesQuery(item, query) && matchesGenre(item, genre));
  const start = (Math.max(1, Number(page) || 1) - 1) * limit;
  return {
    items: filtered.slice(start, start + limit),
    total: filtered.length,
    page: Math.max(1, Number(page) || 1),
    hasNextPage: start + limit < filtered.length
  };
}

module.exports = { getMangaPool, filterManga, matchesGenre, matchesQuery, GENRE_ALIASES };
