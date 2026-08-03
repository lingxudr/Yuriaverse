import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const secret = process.env.TELEGRAM_NOTIFY_SECRET || process.env.CRON_SECRET || '';
  if (secret && key !== secret) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!token) return NextResponse.json({ ok: false, message: 'TELEGRAM_BOT_TOKEN missing' }, { status: 500 });
  const origin = url.origin;
  const webhookUrl = `${origin}/api/telegram/webhook${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ''}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: webhookSecret || undefined, allowed_updates: ['message', 'edited_message'] })
  });
  const json = await res.json().catch(() => null);
  return NextResponse.json({ ok: res.ok && json?.ok !== false, telegram: json, webhookUrl: webhookSecret ? `${origin}/api/telegram/webhook?secret=***` : webhookUrl });
}
