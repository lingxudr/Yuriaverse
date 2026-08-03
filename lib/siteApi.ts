import { headers } from 'next/headers';

export async function siteUrl(path: string) {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || process.env.VERCEL_URL || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}${path}`;
}

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(await siteUrl(path), { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    const json = await res.json();
    return (json?.data ?? fallback) as T;
  } catch { return fallback; }
}
