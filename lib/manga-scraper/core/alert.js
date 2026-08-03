const { getCache, setCache } = require('./cache');

async function sendDiscord(message) {
  const url = process.env.MANGA_ALERT_DISCORD_WEBHOOK;
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: message.slice(0, 1900) })
  });
  return res.ok;
}

async function sendTelegram(message) {
  const token = process.env.MANGA_ALERT_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.MANGA_ALERT_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message.slice(0, 3900), parse_mode: 'HTML' })
  });
  return res.ok;
}

async function sendMangaAlert(key, message, throttleMs = Number(process.env.MANGA_ALERT_THROTTLE_MS || 30 * 60 * 1000)) {
  try {
    const cacheKey = `alert:${key}`;
    const hit = await getCache(cacheKey);
    if (hit) return { sent: false, throttled: true };
    const sent = Boolean(await sendDiscord(message) || await sendTelegram(message));
    await setCache(cacheKey, { sentAt: Date.now(), sent }, throttleMs);
    return { sent, throttled: false };
  } catch (error) {
    return { sent: false, throttled: false, error: error?.message || String(error) };
  }
}

module.exports = { sendMangaAlert };
