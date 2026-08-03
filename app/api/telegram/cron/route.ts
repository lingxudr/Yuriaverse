import { NextResponse } from 'next/server';

const { notifyLatest, originFromRequest } = require('../../../../lib/telegramBot');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.TELEGRAM_NOTIFY_SECRET || '';
  const auth = req.headers.get('authorization') || '';
  const ua = (req.headers.get('user-agent') || '').toLowerCase();
  const isVercelCron = ua.includes('vercel-cron') || req.headers.get('x-vercel-cron') === '1';
  if (secret && auth === `Bearer ${secret}`) return true;
  return isVercelCron;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  try {
    const result = await notifyLatest(originFromRequest(req), { force: false });
    return NextResponse.json({ ok: true, cron: 'hourly-telegram-notify', ...result }, { headers: { 'cache-control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, cron: 'hourly-telegram-notify', message: error?.message || 'Cron notify failed' }, { status: 500 });
  }
}
