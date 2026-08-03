import { NextResponse } from 'next/server';

const { notifyLatest, originFromRequest } = require('../../../../lib/telegramBot');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.TELEGRAM_NOTIFY_SECRET || process.env.CRON_SECRET || '';
  if (!secret) return process.env.NODE_ENV !== 'production';
  const bearer = req.headers.get('authorization') || '';
  return url.searchParams.get('key') === secret || bearer === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  try {
    const url = new URL(req.url);
    const result = await notifyLatest(originFromRequest(req), { force: url.searchParams.get('force') === '1' });
    return NextResponse.json({ ok: true, ...result }, { headers: { 'cache-control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || 'Telegram notify failed' }, { status: 500 });
  }
}

export async function POST(req: Request) { return GET(req); }
