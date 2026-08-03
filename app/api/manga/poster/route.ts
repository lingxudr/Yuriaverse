import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_DIR = '/tmp/animesu-manga-image-cache';
const IMAGE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_IMAGE_BYTES = 2_500_000;

type ImageCacheEntry = { contentType: string; base64: string; expiresAt: number };
type MemoryStore = Map<string, ImageCacheEntry>;

const memoryCache: MemoryStore = (globalThis as any).__ANIMESU_MANGA_IMAGE_CACHE__ || new Map();
(globalThis as any).__ANIMESU_MANGA_IMAGE_CACHE__ = memoryCache;

function esc(value: string) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
}

function cacheKey(value: string) {
  return createHash('sha1').update(value).digest('hex');
}

function cachePath(key: string) {
  return join(CACHE_DIR, `${key}.json`);
}

function responseFromEntry(entry: ImageCacheEntry, state: 'HIT' | 'MISS' | 'STALE') {
  const body = Buffer.from(entry.base64, 'base64');
  return new NextResponse(body, {
    headers: {
      'content-type': entry.contentType,
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      'x-animesu-image-cache': state
    }
  });
}

async function readCached(key: string, allowStale = false): Promise<{ entry: ImageCacheEntry; stale: boolean } | null> {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && (allowStale || mem.expiresAt > now)) return { entry: mem, stale: mem.expiresAt <= now };
  try {
    const entry = JSON.parse(await readFile(cachePath(key), 'utf8')) as ImageCacheEntry;
    if (entry?.base64 && entry?.contentType && (allowStale || entry.expiresAt > now)) {
      memoryCache.set(key, entry);
      return { entry, stale: entry.expiresAt <= now };
    }
  } catch {}
  return null;
}

async function writeCached(key: string, entry: ImageCacheEntry) {
  memoryCache.set(key, entry);
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath(key), JSON.stringify(entry));
  } catch {}
}

function wrap(text: string, max = 16) {
  try {
    const words = String(text || 'Animesu Comic').split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max && line) { lines.push(line); line = word; } else line = next;
      if (lines.length >= 3) break;
    }
    if (line && lines.length < 3) lines.push(line);
    return lines.length ? lines : ['Gambar', 'Tidak', 'Tersedia'];
  } catch { return ['Gambar', 'Tidak', 'Tersedia']; }
}

function svgResponse(svg: string, state = 'FALLBACK') {
  return new NextResponse(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=86400', 'x-animesu-image-cache': state } });
}

function fallbackSvg(title = 'Gambar Tidak Tersedia', type = 'Comic') {
  const lines = wrap(title);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" role="img" aria-label="${esc(title)}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A3145"/><stop offset=".52" stop-color="#191C2D"/><stop offset="1" stop-color="#0B0D17"/></linearGradient><radialGradient id="glow" cx="76%" cy="10%" r="75%"><stop offset="0" stop-color="#E53935" stop-opacity="0.55"/><stop offset="1" stop-color="#E53935" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="600" rx="34" fill="url(#bg)"/><rect width="400" height="600" rx="34" fill="url(#glow)"/>
  <circle cx="318" cy="88" r="72" fill="#E53935" opacity="0.24"/><rect x="56" y="72" width="112" height="152" rx="18" fill="#0B0D17" stroke="#E53935" stroke-opacity=".45" stroke-width="4"/><path d="M88 110h48M88 140h42M88 170h32" stroke="#F0F4FF" stroke-opacity=".42" stroke-width="10" stroke-linecap="round"/><path d="M60 258h180M60 292h128" stroke="#F0F4FF" stroke-opacity=".20" stroke-width="12" stroke-linecap="round"/>
  <rect x="42" y="360" width="316" height="156" rx="24" fill="#0B0D17" opacity=".72"/>
  <text x="58" y="394" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="900" fill="#E53935">${esc(type)}</text>
  ${lines.map((line, index) => `<text x="58" y="${440 + index * 34}" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="900" fill="#F0F4FF">${esc(line)}</text>`).join('\n  ')}
  <text x="58" y="552" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="800" fill="#8A92B2">Animesu Manga</text>
</svg>`;
}

function safeRemoteUrl(raw: string | null) {
  try {
    const url = new URL(String(raw || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return null;
    return url;
  } catch { return null; }
}

async function fetchRemoteImage(remote: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const upstream = await fetch(remote.toString(), {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'referer': `${remote.protocol}//${remote.hostname}/`
      },
      cache: 'no-store'
    });
    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !contentType.startsWith('image/')) return null;
    const body = Buffer.from(await upstream.arrayBuffer());
    if (!body.length || body.length > MAX_IMAGE_BYTES) return null;
    return { contentType, base64: body.toString('base64'), expiresAt: Date.now() + IMAGE_TTL_MS } satisfies ImageCacheEntry;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = (url.searchParams.get('title') || 'Animesu Comic').slice(0, 80);
  const type = (url.searchParams.get('type') || 'Comic').slice(0, 16);
  const remote = safeRemoteUrl(url.searchParams.get('url'));

  if (remote) {
    const key = cacheKey(remote.toString());
    const hit = await readCached(key);
    if (hit) return responseFromEntry(hit.entry, 'HIT');

    try {
      const fresh = await fetchRemoteImage(remote);
      if (fresh) {
        await writeCached(key, fresh);
        return responseFromEntry(fresh, 'MISS');
      }
    } catch {}

    const stale = await readCached(key, true);
    if (stale) return responseFromEntry(stale.entry, 'STALE');
  }

  return svgResponse(fallbackSvg(title, type));
}
