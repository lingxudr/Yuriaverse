import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const safe = {
    at: new Date().toISOString(),
    level: body.level || 'error',
    message: String(body.message || '').slice(0, 500),
    source: String(body.source || 'client').slice(0, 120),
    path: String(body.path || '').slice(0, 240),
    stack: String(body.stack || '').slice(0, 1000),
    userAgent: String(body.userAgent || '').slice(0, 240)
  };
  console.warn('[CLIENT_LOG]', JSON.stringify(safe));
  return NextResponse.json({ ok: true });
}
