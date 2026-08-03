import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  const subscription = await req.json().catch(() => null);
  // Placeholder endpoint for Vercel/PostgreSQL persistence. It intentionally
  // succeeds so the PWA can be wired to Web Push later without changing clients.
  return NextResponse.json({ ok: true, stored: Boolean(subscription), message: 'Push subscription accepted. Configure VAPID + database persistence for production sends.' });
}
