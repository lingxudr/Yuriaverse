const BASE = (process.env.SANSEKAI_BASE_URL || 'https://api.sansekai.my.id/api').replace(/\/$/, '');
const KEY = process.env.SANSEKAI_API_KEY || '';
export async function sansekaiFetch<T>(path: string, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController(); const timer = setTimeout(()=>ctrl.abort(), timeoutMs);
  try {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${BASE}${path}${KEY ? `${sep}apikey=${encodeURIComponent(KEY)}` : ''}`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Sansekai ${res.status}`);
    return await res.json() as T;
  } finally { clearTimeout(timer); }
}
