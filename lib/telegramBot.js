const { getCache, setCache } = require('./manga-scraper/core/cache');

function token() { return process.env.TELEGRAM_BOT_TOKEN || ''; }
function defaultChatId() { return process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || ''; }
function escapeHtml(value = '') {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function originFromRequest(req) { try { return new URL(req.url).origin; } catch { return process.env.NEXTAUTH_URL || 'https://animesu.vercel.app'; } }
async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
  return res.json().catch(() => null);
}
async function sendTelegramMessage(text, chatId = defaultChatId(), extra = {}) {
  if (!token()) throw new Error('TELEGRAM_BOT_TOKEN missing');
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID missing');
  const res = await fetch(`https://api.telegram.org/bot${token()}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false, ...extra })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) throw new Error(json?.description || `Telegram send failed ${res.status}`);
  return json;
}
function itemLine(prefix, item, href, extra = '') {
  return `${prefix} <b>${escapeHtml(item?.title || 'Tanpa judul')}</b>${extra ? `\n   ${escapeHtml(extra)}` : ''}\n   ${href}`;
}
async function getLatestDigest(origin) {
  const [anime, donghua, manga, schedule, donghuaSchedule] = await Promise.allSettled([
    fetchJson(`${origin}/api/category?kind=anime&tab=ongoing&page=1&limit=6`),
    fetchJson(`${origin}/api/category?kind=donghua&tab=ongoing&page=1&limit=6`),
    fetchJson(`${origin}/api/manga/latest`),
    fetchJson(`${origin}/api/anime/schedule`),
    fetchJson(`${origin}/api/anime/donghua/schedule`)
  ]);
  const animeItems = anime.status === 'fulfilled' ? (anime.value?.data?.items || []).slice(0, 5) : [];
  const donghuaItems = donghua.status === 'fulfilled' ? (donghua.value?.data?.items || []).slice(0, 5) : [];
  const mangaItems = manga.status === 'fulfilled' ? (manga.value?.data || []).slice(0, 6) : [];
  const schedules = [
    ...(schedule.status === 'fulfilled' ? (schedule.value?.data?.days || []) : []),
    ...(donghuaSchedule.status === 'fulfilled' ? (donghuaSchedule.value?.data?.days || []) : [])
  ];
  const todayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(new Date());
  const todayItems = schedules.filter((d) => String(d.day || '').toLowerCase().includes(todayName.toLowerCase().slice(0, 5))).flatMap((d) => d.items || []).slice(0, 8);
  return { animeItems, donghuaItems, mangaItems, todayItems };
}
function buildDigestMessage(origin, digest) {
  const parts = [`❄️ <b>Animesu Update</b>\n${new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date())}`];
  if (digest.animeItems.length) parts.push(`\n🎌 <b>Anime terbaru</b>\n${digest.animeItems.map((x, i) => itemLine(`${i + 1}.`, x, `${origin}/anime/${encodeURIComponent(x.slug)}${x.sourceProvider ? `?source=${encodeURIComponent(x.sourceProvider)}` : ''}`, x.episode ? `Episode ${x.episode}` : (x.status || 'Update'))).join('\n')}`);
  if (digest.donghuaItems.length) parts.push(`\n🇨🇳 <b>Donghua terbaru</b>\n${digest.donghuaItems.map((x, i) => itemLine(`${i + 1}.`, x, `${origin}/anime/${encodeURIComponent(x.slug)}?source=donghua`, x.episode ? `Episode ${x.episode}` : (x.status || 'Update'))).join('\n')}`);
  if (digest.mangaItems.length) parts.push(`\n📚 <b>Manga update</b>\n${digest.mangaItems.map((x, i) => itemLine(`${i + 1}.`, x, `${origin}/manga/${encodeURIComponent(x.id)}`, x.displayChapter || x.latestChapter || x.chapter || x.updateTime || 'Chapter terbaru')).join('\n')}`);
  if (digest.todayItems.length) parts.push(`\n📅 <b>Jadwal hari ini</b>\n${digest.todayItems.map((x, i) => `${i + 1}. ${escapeHtml(x.title)}${x.episode ? ` — EP ${escapeHtml(x.episode)}` : ''}`).join('\n')}`);
  parts.push(`\n🌐 ${origin}`);
  return parts.join('\n');
}
function digestSignature(digest) {
  const pick = (arr, fields) => arr.map((x) => fields.map((f) => x?.[f] || '').join(':')).join('|');
  return [
    pick(digest.animeItems, ['slug', 'episode', 'title']),
    pick(digest.donghuaItems, ['slug', 'episode', 'title']),
    pick(digest.mangaItems, ['id', 'displayChapter', 'latestChapter', 'chapter'])
  ].join('::');
}
async function notifyLatest(origin, { force = false, chatId = defaultChatId() } = {}) {
  const digest = await getLatestDigest(origin);
  const signature = digestSignature(digest);
  const cacheKey = 'telegram:last-digest-signature:v1';
  const last = await getCache(cacheKey, { stale: true }).catch(() => null);
  if (!force && last?.value === signature) return { sent: false, reason: 'no-new-update', signature };
  const message = buildDigestMessage(origin, digest);
  await sendTelegramMessage(message, chatId);
  await setCache(cacheKey, signature, 7 * 24 * 60 * 60 * 1000).catch(() => undefined);
  return { sent: true, signature, counts: { anime: digest.animeItems.length, donghua: digest.donghuaItems.length, manga: digest.mangaItems.length, schedule: digest.todayItems.length } };
}
function isAllowedChat(chatId) {
  const admin = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';
  return !admin || String(chatId) === String(admin);
}
module.exports = { sendTelegramMessage, getLatestDigest, buildDigestMessage, notifyLatest, originFromRequest, isAllowedChat, escapeHtml };
