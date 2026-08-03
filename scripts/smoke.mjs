const BASE = process.env.ANIMESU_URL || 'https://animesu.vercel.app';
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 20000);
function withTimeout(p, ms, label) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms))]); }
async function text(path) {
  const started = Date.now();
  const res = await withTimeout(fetch(BASE + path, { cache: 'no-store' }), timeoutMs, path);
  const body = await res.text();
  return { path, status: res.status, ok: res.ok, ms: Date.now() - started, type: res.headers.get('content-type'), body };
}
async function json(path) { const r = await text(path); try { return { ...r, json: JSON.parse(r.body) }; } catch (e) { return { ...r, parseError: e.message }; } }
const pages = ['/', '/anime', '/donghua', '/movie', '/live-action', '/drama', '/jadwal', '/genre', '/search?q=one', '/news'];
const apis = ['/api/anime/health', '/api/category?kind=anime&tab=ongoing&page=1&limit=3', '/api/category?kind=donghua&tab=ongoing&page=1&limit=3', '/api/category?kind=movie&tab=all&page=1&limit=3', '/api/category?kind=live-action&tab=all&page=1&limit=3', '/api/drama'];
const failures = [];
for (const p of pages) {
  try { const r = await text(p); console.log(`[PAGE] ${p} ${r.status} ${r.ms}ms ${r.body.length}b`); if (!r.ok || /Application error|FUNCTION_INVOCATION|Unhandled Runtime Error/i.test(r.body)) failures.push(`${p} status/content`); }
  catch (e) { failures.push(`${p} ${e.message}`); }
}
for (const p of apis) {
  try { const r = await json(p); const items = r.json?.data?.items?.length ?? r.json?.data?.days?.length ?? ''; console.log(`[API] ${p} ${r.status} ${r.ms}ms items=${items}`); if (!r.ok || r.parseError) failures.push(`${p} api`); }
  catch (e) { failures.push(`${p} ${e.message}`); }
}
// detail regression samples
for (const [kind, source] of [['anime',''], ['donghua','donghua'], ['movie','samehadaku'], ['live-action','animasu']]) {
  const list = await json(`/api/category?kind=${kind}&tab=${kind==='movie'||kind==='live-action'?'all':'ongoing'}&page=1&limit=1`);
  const item = list.json?.data?.items?.[0];
  if (!item) { failures.push(`${kind} no item`); continue; }
  const qs = item.sourceProvider ? `?source=${item.sourceProvider}` : source ? `?source=${source}` : '';
  const detail = await json(`/api/anime/detail/${encodeURIComponent(item.slug)}${qs}`);
  console.log(`[DETAIL] ${kind} ${item.title} => ${detail.status} ${detail.json?.data?.title || 'NO_TITLE'}`);
  if (!detail.ok || !detail.json?.data?.title || /tidak tersedia|gagal/i.test(detail.json.data.title)) failures.push(`${kind} detail failed`);
}
if (failures.length) { console.error('SMOKE FAILURES:', failures); process.exit(1); }
console.log('SMOKE OK');
