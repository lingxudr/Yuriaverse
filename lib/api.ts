import { NextResponse } from 'next/server';
import { providerManager } from './providers/ProviderManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function pageFrom(req: Request) {
  const url = new URL(req.url);
  return Math.max(1, Number(url.searchParams.get('page') || 1));
}

export async function safeJson<T>(fn: () => Promise<T>, fallback: T, status = 200) {
  try {
    const data = await fn();
    return NextResponse.json({ ok: true, data }, { status, headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: true, data: fallback, degraded: true }, { status, headers: { 'cache-control': 'no-store' } });
  }
}

export { providerManager };
