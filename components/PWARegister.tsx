'use client';
import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let interval: ReturnType<typeof setInterval> | undefined;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      registration.update().catch(() => undefined);
      interval = setInterval(() => registration.update().catch(() => undefined), 1000 * 60 * 15);

      // Prepare notification permission lazily; actual prompt is user-triggered elsewhere.
      if ('Notification' in window && Notification.permission === 'granted') {
        registration.active?.postMessage({ type: 'ANIMESU_TEST_NOTIFICATION', body: 'Animesu siap mengirim reminder episode baru.', url: '/notifications' });
      }
    }).catch(() => undefined);

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'ANIMESU_SW_ACTIVATED') {
        localStorage.setItem('animesu:sw-version', event.data.version || 'active');
      }
    });

    return () => { if (interval) clearInterval(interval); };
  }, []);
  return null;
}
