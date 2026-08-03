import { NextResponse } from 'next/server';

const { sendTelegramMessage, getLatestDigest, buildDigestMessage, originFromRequest, isAllowedChat, escapeHtml } = require('../../../../lib/telegramBot');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!secret) return true;
  return req.headers.get('x-telegram-bot-api-secret-token') === secret || new URL(req.url).searchParams.get('secret') === secret;
}

async function healthSummary(origin: string) {
  const res = await fetch(`${origin}/api/manga/latest`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
  const health = res?.merge?.providerHealth || {};
  const rows = Object.values(health).map((h: any) => `${h.status === 'healthy' ? '✅' : h.status?.includes('disabled') ? '⏸' : '⚠️'} ${escapeHtml(h.name || h.id)}: ${escapeHtml(h.status)} (${h.score ?? 0})`).join('\n');
  return `🩺 <b>Animesu Health</b>\n${rows || 'Belum ada data health.'}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const update = await req.json().catch(() => null);
  const msg = update?.message || update?.edited_message;
  const chatId = msg?.chat?.id;
  const text = String(msg?.text || '').trim();
  if (!chatId || !text) return NextResponse.json({ ok: true, ignored: true });
  if (!isAllowedChat(chatId)) return NextResponse.json({ ok: true, ignored: 'unauthorized-chat' });
  const origin = originFromRequest(req);
  try {
    if (/^\/start|^\/help/i.test(text)) {
      await sendTelegramMessage(`❄️ <b>Animesu Bot</b>\n\nPerintah:\n/latest - update anime/donghua/manga\n/manga - manga terbaru\n/jadwal - jadwal hari ini\n/health - status scraper`, chatId);
    } else if (/^\/manga/i.test(text)) {
      const digest = await getLatestDigest(origin);
      const body = digest.mangaItems.map((x: any, i: number) => `${i + 1}. <b>${escapeHtml(x.title)}</b>\n   ${escapeHtml(x.displayChapter || x.latestChapter || x.chapter || 'Chapter terbaru')}\n   ${origin}/manga/${encodeURIComponent(x.id)}`).join('\n');
      await sendTelegramMessage(`📚 <b>Manga Update</b>\n${body || 'Belum ada update manga.'}`, chatId);
    } else if (/^\/jadwal/i.test(text)) {
      const digest = await getLatestDigest(origin);
      const body = digest.todayItems.map((x: any, i: number) => `${i + 1}. ${escapeHtml(x.title)}${x.episode ? ` — EP ${escapeHtml(x.episode)}` : ''}`).join('\n');
      await sendTelegramMessage(`📅 <b>Jadwal Hari Ini</b>\n${body || 'Belum ada jadwal hari ini.'}`, chatId);
    } else if (/^\/health/i.test(text)) {
      await sendTelegramMessage(await healthSummary(origin), chatId);
    } else if (/^\/latest/i.test(text)) {
      const digest = await getLatestDigest(origin);
      await sendTelegramMessage(buildDigestMessage(origin, digest), chatId);
    } else {
      await sendTelegramMessage('Perintah tidak dikenal. Ketik /help', chatId);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || 'Webhook failed' }, { status: 500 });
  }
}

export async function GET() { return NextResponse.json({ ok: true, bot: 'animesu-telegram-webhook' }); }
