const fs = require('fs/promises');
const path = require('path');
const { hashString } = require('./utils');
const memory = new Map();
const CACHE_DIR = process.env.MANGA_CACHE_DIR || '/tmp/animesu-manga-cache';
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

function redisEnabled() { return Boolean(UPSTASH_URL && UPSTASH_TOKEN); }
function redisKey(key) { return `animesu:manga:${hashString(key)}`; }

async function redisGet(key, stale = false) {
  if (!redisEnabled()) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(redisKey(key))}`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.result) return null;
    const entry = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
    if (stale || entry.expiresAt > Date.now()) return { value: entry.value, stale: entry.expiresAt <= Date.now(), source: 'redis' };
  } catch {}
  return null;
}

async function redisSet(key, entry, ttlMs) {
  if (!redisEnabled()) return false;
  try {
    const seconds = Math.max(1, Math.ceil(ttlMs / 1000));
    const encodedKey = encodeURIComponent(redisKey(key));
    const encodedValue = encodeURIComponent(JSON.stringify(entry));
    const res = await fetch(`${UPSTASH_URL}/set/${encodedKey}/${encodedValue}?EX=${seconds}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    return res.ok;
  } catch { return false; }
}

async function getCache(key, { stale=false } = {}) {
  const now = Date.now();
  const mem = memory.get(key);
  if(mem && (stale || mem.expiresAt > now)) return { value: mem.value, stale: mem.expiresAt <= now, source: 'memory' };
  const redis = await redisGet(key, stale);
  if (redis) { memory.set(key, { value: redis.value, expiresAt: stale && redis.stale ? 0 : Date.now() + 1000, savedAt: Date.now() }); return redis; }
  try {
    const file = path.join(CACHE_DIR, `${hashString(key)}.json`);
    const raw = JSON.parse(await fs.readFile(file, 'utf8'));
    if(stale || raw.expiresAt > now) { memory.set(key, raw); return { value: raw.value, stale: raw.expiresAt <= now, source: 'disk' }; }
  } catch {}
  return null;
}

async function setCache(key, value, ttlMs) {
  const entry = { value, expiresAt: Date.now() + ttlMs, savedAt: Date.now() };
  memory.set(key, entry);
  await redisSet(key, entry, ttlMs);
  try { await fs.mkdir(CACHE_DIR, { recursive: true }); await fs.writeFile(path.join(CACHE_DIR, `${hashString(key)}.json`), JSON.stringify(entry)); } catch {}
  return value;
}

async function cached(key, ttlMs, fn) {
  const hit = await getCache(key);
  if(hit) return hit.value;
  try { return await setCache(key, await fn(), ttlMs); }
  catch (error) { const stale = await getCache(key, { stale:true }); if(stale) return stale.value; throw error; }
}

module.exports = { getCache, setCache, cached, redisEnabled };
