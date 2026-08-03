import { NextResponse } from 'next/server';
import { isDevAuthorized } from '../../../../lib/devAuth';
import { config } from '../../../../lib/config';
import { healthEndpoints } from '../../../../lib/healthEndpoints';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EndpointResult = {
  group: string;
  name: string;
  path: string;
  url: string;
  ok: boolean;
  critical?: boolean;
  status?: number;
  latencyMs: number;
  itemCount?: number;
  topKeys?: string[];
  sampleTitle?: string;
  message?: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

function firstArray(obj: any): any[] {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== 'object') return [];
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      const found = firstArray(v);
      if (found.length) return found;
    }
  }
  return [];
}

function sampleTitle(item: any) {
  return item?.title || item?.name || item?.anime || item?.episode || item?.slug;
}

async function checkEndpoint(endpoint: (typeof healthEndpoints)[number]): Promise<EndpointResult> {
  const base = config.sankaBaseUrl.replace(/\/$/, '');
  const url = endpoint.path.startsWith('http') ? endpoint.path : `${base}${endpoint.path}`;
  const started = Date.now();
  try {
    const res = await withTimeout(fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' }), 5500);
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = { parseError: text.slice(0, 120) }; }
    const arr = firstArray(json);
    return {
      group: endpoint.group,
      name: endpoint.name,
      path: endpoint.path,
      url,
      ok: res.ok && !json?.parseError,
      critical: endpoint.critical,
      status: res.status,
      latencyMs: Date.now() - started,
      itemCount: arr.length,
      topKeys: Object.keys(json || {}).slice(0, 12),
      sampleTitle: arr[0] ? sampleTitle(arr[0]) : sampleTitle(json?.data || json),
      message: json?.parseError ? 'Invalid JSON response' : undefined
    };
  } catch (error) {
    return {
      group: endpoint.group,
      name: endpoint.name,
      path: endpoint.path,
      url,
      ok: false,
      critical: endpoint.critical,
      latencyMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key');
  if (!isDevAuthorized(key)) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  const started = Date.now();
  const results = await Promise.all(healthEndpoints.map(checkEndpoint));
  const critical = results.filter((r) => r.critical);
  const groups = results.reduce<Record<string, { total: number; ok: number; failed: number }>>((acc, r) => {
    acc[r.group] ||= { total: 0, ok: 0, failed: 0 };
    acc[r.group].total++;
    if (r.ok) acc[r.group].ok++; else acc[r.group].failed++;
    return acc;
  }, {});
  const payload = {
    ok: critical.every((r) => r.ok),
    at: new Date().toISOString(),
    latencyMs: Date.now() - started,
    summary: {
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      criticalFailed: critical.filter((r) => !r.ok).length
    },
    groups,
    endpoints: results
  };
  return NextResponse.json(payload, { headers: { 'cache-control': 'no-store' } });
}
