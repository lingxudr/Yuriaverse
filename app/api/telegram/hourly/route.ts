import { NextResponse } from 'next/server';

const { notifyLatest, originFromRequest } = require('../../../../lib/telegramBot');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Public-safe hourly endpoint: force is intentionally disabled, so repeated calls do not spam Telegram.
    // The digest signature cache prevents duplicate notifications when there is no new update.
    const result = await notifyLatest(originFromRequest(req), { force: false });
    return NextResponse.json({ ok: true, endpoint: 'telegram-hourly-public-safe', ...result }, { headers: { 'cache-control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, endpoint: 'telegram-hourly-public-safe', message: error?.message || 'Hourly notify failed' }, { status: 500 });
  }
}
