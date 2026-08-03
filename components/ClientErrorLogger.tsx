'use client';
import { useEffect } from 'react';

function sendLog(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ ...payload, path: location.pathname, userAgent: navigator.userAgent });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/log', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    }
  } catch {}
}

export function ClientErrorLogger() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => sendLog({ level: 'error', source: 'window.error', message: event.message, stack: event.error?.stack });
    const onReject = (event: PromiseRejectionEvent) => sendLog({ level: 'error', source: 'unhandledrejection', message: event.reason?.message || String(event.reason), stack: event.reason?.stack });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);
  return null;
}
