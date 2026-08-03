import { NextResponse } from 'next/server';
import { providerManager } from '../../../../lib/api';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> { return Promise.race([p, new Promise<T>((r)=>setTimeout(()=>r(fallback), ms))]); }
export async function GET() {
  const providers = await Promise.all(providerManager.providers.map((p) => withTimeout(p.health(), 2800, { name: p.name, ok: false, message: 'health timeout' })));
  return NextResponse.json({ ok: providers.some((p) => p.ok), providers, at: new Date().toISOString() }, { headers: { 'cache-control': 'no-store' } });
}
