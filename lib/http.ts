import { config } from './config';
import { logger } from './utils/logger';
import { debugSankaResponse } from './sankaDebug';

function redactUrl(input: string) {
  try {
    const url = new URL(input);
    for (const key of ['apikey', 'api_key', 'key', 'token', 'access_token']) if (url.searchParams.has(key)) url.searchParams.set(key, '[REDACTED]');
    return url.toString();
  } catch { return input.replace(/(apikey|api_key|key|token|access_token)=([^&]+)/gi, '$1=[REDACTED]'); }
}

export async function fetchJson<T>(url: string, init?: RequestInit & { timeoutMs?: number; retries?: number }): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? config.timeoutMs;
  const retries = init?.retries ?? config.retries;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          accept: 'application/json,text/plain,*/*',
          'user-agent': 'AnimeSu-Sanka-Next/1.0',
          ...(init?.headers || {})
        },
        cache: 'no-store'
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const text = await res.text();
      try {
        const json = JSON.parse(text) as T;
        debugSankaResponse(url, res.status, json, Date.now() - started);
        logger.info('upstream_fetch_ok', { url: redactUrl(url), attempt, latencyMs: Date.now() - started });
        return json;
      } catch {
        throw new Error(`Invalid JSON from upstream: ${text.slice(0, 120)}`);
      }
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      logger.warn('upstream_fetch_failed', {
        url: redactUrl(url),
        attempt,
        retries,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error)
      });
      if (attempt < retries) await new Promise((r) => setTimeout(r, 250 * Math.pow(2, attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
