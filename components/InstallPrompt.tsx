'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LightIcon } from './LightIcon';

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export function InstallPrompt() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    if (isHome) return;
    const dismissed = localStorage.getItem('animesu:install-dismissed') === '1';
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setInstalled(Boolean(standalone));
    const onBeforeInstall = (e: Event) => { e.preventDefault(); if (!dismissed && !standalone) { setEvent(e as BeforeInstallPromptEvent); setShow(true); } };
    const onInstalled = () => { setInstalled(true); setShow(false); localStorage.setItem('animesu:installed', '1'); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onBeforeInstall); window.removeEventListener('appinstalled', onInstalled); };
  }, [isHome]);
  if (isHome || !show || installed || !event) return null;
  async function install() { await event?.prompt(); const choice = await event?.userChoice; if (choice?.outcome) setShow(false); }
  function dismiss() { localStorage.setItem('animesu:install-dismissed', '1'); setShow(false); }
  return <div className="install-prompt" role="dialog" aria-label="Install Animesu"><div><b>Install Animesu</b><p>Akses lebih cepat, mode standalone, dan cache offline.</p></div><button className="btn" onClick={install}><LightIcon name="download" size={16}/> Install</button><button className="icon-btn" onClick={dismiss} aria-label="Tutup install prompt"><LightIcon name="x" size={16}/></button></div>;
}
