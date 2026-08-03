'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const ClientErrorLogger = dynamic(() => import('./ClientErrorLogger').then((mod) => mod.ClientErrorLogger), { ssr: false });
const CookieConsent = dynamic(() => import('./CookieConsent').then((mod) => mod.CookieConsent), { ssr: false });
const InstallPrompt = dynamic(() => import('./InstallPrompt').then((mod) => mod.InstallPrompt), { ssr: false });
const LocalDataSync = dynamic(() => import('./LocalDataSync').then((mod) => mod.LocalDataSync), { ssr: false });
const PWAUpdatePrompt = dynamic(() => import('./PWAUpdatePrompt').then((mod) => mod.PWAUpdatePrompt), { ssr: false });

function onIdle(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout: number }) => number);
  const cancelIdle = (window as any).cancelIdleCallback as undefined | ((id: number) => void);
  if (idle) {
    const id = idle(callback, { timeout: 1800 });
    return () => cancelIdle?.(id);
  }
  const id = window.setTimeout(callback, 900);
  return () => window.clearTimeout(id);
}

export function DeferredClientExtras() {
  const [ready, setReady] = useState(false);

  useEffect(() => onIdle(() => setReady(true)), []);

  if (!ready) return null;
  return (
    <>
      <ClientErrorLogger />
      <LocalDataSync />
      <InstallPrompt />
      <PWAUpdatePrompt />
      <CookieConsent />
    </>
  );
}
