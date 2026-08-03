'use client';
import { ChevronDown, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StreamServer } from '../lib/types';

type ServerState = 'idle' | 'loading' | 'ready' | 'warning' | 'failed';

export function Player({ servers, title='', slug='' }: { servers: StreamServer[]; title?: string; slug?: string; nextEpisode?: string }) {
  const [url, setUrl] = useState('');
  const [message,setMessage]=useState('');
  const [quality,setQuality]=useState('Auto');
  const [subtitle,setSubtitle]=useState('Indonesia');
  const [speed,setSpeed]=useState('1x');
  const [activeId,setActiveId]=useState('');
  const [serverState,setServerState]=useState<ServerState>('idle');
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [serverOpen,setServerOpen]=useState(false);
  const [mounted,setMounted]=useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTriedRef = useRef<Set<string>>(new Set());
  const qualities=useMemo(()=>Array.from(new Set(servers.map(s=>s.quality).filter(Boolean))) as string[],[servers]);
  const shown=quality && quality !== 'Auto' ? servers.filter(s=>s.quality===quality) : servers;
  const activeServer = servers.find((s)=>s.id===activeId) || shown[0];

  useEffect(()=>{ setMounted(true); return()=>{ if(timerRef.current) clearTimeout(timerRef.current); }; },[]);
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('animesu:player-settings') || '{}');
    if (saved.quality) setQuality(saved.quality); if (saved.subtitle) setSubtitle(saved.subtitle); if (saved.speed) setSpeed(saved.speed);
  }, []);
  useEffect(() => { localStorage.setItem('animesu:player-settings', JSON.stringify({quality, subtitle, speed})); }, [quality, subtitle, speed]);
  useEffect(() => {
    if (!slug) return;
    const item = { title, slug, progress: Math.min(99, Number(localStorage.getItem(`animesu:progress:${slug}`) || 5)), at: Date.now() };
    const old = JSON.parse(localStorage.getItem('animesu:history') || '[]').filter((x:any)=>x.slug!==slug);
    localStorage.setItem('animesu:history', JSON.stringify([item, ...old].slice(0,50)));
    fetch('/api/user/library',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'history',episodeSlug:slug,title,progress:item.progress})}).catch(()=>{});
  }, [slug,title]);
  useEffect(()=>{
    if(!slug||!url)return;
    const t=setInterval(()=>{
      const p=Math.min(98,Number(localStorage.getItem(`animesu:progress:${slug}`)||5)+3);
      localStorage.setItem(`animesu:progress:${slug}`,String(p));
      const old=JSON.parse(localStorage.getItem('animesu:history')||'[]');
      const next=old.map((x:any)=>x.slug===slug?{...x,progress:p,at:Date.now()}:x);
      localStorage.setItem('animesu:history',JSON.stringify(next));
    },15000);
    return()=>clearInterval(t)
  },[slug,url]);

  useEffect(()=>{
    if(!mounted) return;
    const open = serverOpen || settingsOpen;
    document.body.classList.toggle('animesu-overlay-open', open);
    return()=>document.body.classList.remove('animesu-overlay-open');
  },[mounted, serverOpen, settingsOpen]);

  function tryNextFrom(current: string) {
    if (autoTriedRef.current.has(current)) { setServerState('warning'); setMessage('Server belum merespons. Pilih server lain jika video tidak muncul.'); return; }
    autoTriedRef.current.add(current);
    const next = shown.find((s) => s.id !== current);
    if (next) { setMessage('Server lambat, mencoba server cadangan...'); load(next.id); }
    else { setServerState('warning'); setMessage('Tidak ada server cadangan. Coba lagi nanti.'); }
  }

  async function load(id: string) {
    if (!id) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage('Memuat video...'); setActiveId(id); setServerState('loading'); localStorage.setItem(`animesu:last-server:${slug || 'global'}`, id);
    timerRef.current = setTimeout(()=>tryNextFrom(id), 9000);
    try {
      if (/^https?:\/\//i.test(id)) { setUrl(id); return; }
      const r = await fetch(`/api/anime/stream?id=${encodeURIComponent(id)}`);
      const j = await r.json(); const u = j?.data?.url || '';
      setUrl(u); if (!u) { setServerState('failed'); setMessage('Server gagal dimuat. Pilih server lain.'); }
    } catch { setServerState('failed'); setMessage('Server gagal dimuat. Pilih server lain.'); }
  }
  useEffect(()=>{
    const last=localStorage.getItem(`animesu:last-server:${slug || 'global'}`) || localStorage.getItem('animesu:last-server');
    const found=shown.find(s=>s.id===last) || shown[0]; if(found && !url) load(found.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[shown.length, slug]);
  function onFrameLoad(){ if (timerRef.current) clearTimeout(timerRef.current); setServerState('ready'); setMessage(''); if (activeId) localStorage.setItem(`animesu:server-ok:${slug || 'global'}`, activeId); }

  const serverOverlay = serverOpen ? <div className="player-portal-backdrop server-portal-backdrop" onClick={()=>setServerOpen(false)}>
    <div className="server-popup server-popup-portal" role="dialog" aria-label="Pilih server video" onClick={(e)=>e.stopPropagation()}>
      <div className="portal-sheet-head"><b>Pilih Server</b><button type="button" onClick={()=>setServerOpen(false)} aria-label="Tutup server"><X size={18}/></button></div>
      {servers.map((s,i)=><button key={s.id} className={activeId===s.id?'active':''} onClick={()=>{setServerOpen(false); load(s.id)}}>{s.name || (i===0?'Default':`Backup ${i}`)}<small>{s.quality || 'Auto'}</small></button>)}
    </div>
  </div> : null;

  const settingsOverlay = settingsOpen ? <div className="sheet-backdrop player-settings-backdrop" onClick={()=>setSettingsOpen(false)}>
    <div className="settings-sheet player-settings-sheet" role="dialog" aria-label="Pengaturan video" onClick={e=>e.stopPropagation()}>
      <button className="sheet-close" onClick={()=>setSettingsOpen(false)} aria-label="Tutup pengaturan"><X size={18}/></button>
      <h2>Pengaturan Video</h2>
      <section><h3>Video Quality</h3><div className="settings-options">{['Auto', ...qualities].map(q=><button key={q} className={quality===q?'active':''} onClick={()=>setQuality(q)}>{q}</button>)}</div></section>
      <section><h3>Subtitle</h3><div className="settings-options">{['Indonesia','English','Off'].map(s=><button key={s} className={subtitle===s?'active':''} onClick={()=>setSubtitle(s)}>{s}</button>)}</div></section>
      <section><h3>Playback Speed</h3><div className="settings-options">{['0.5x','1x','1.25x','1.5x','2x'].map(s=><button key={s} className={speed===s?'active':''} onClick={()=>setSpeed(s)}>{s}</button>)}</div></section>
    </div>
  </div> : null;

  return <div className="watch-player">
    <div className="netflix-player clean-player relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0_24px_70px_rgba(0,0,0,.42)] ring-1 ring-[#F0F4FF]/[0.08]">
      {url ? <iframe ref={iframeRef} className="player h-full w-full rounded-2xl border-0 bg-black" src={url} title={title || 'Animesu player'} loading="lazy" allow="picture-in-picture; fullscreen; autoplay; encrypted-media; airplay" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation" onLoad={onFrameLoad} onError={()=>{setServerState('failed'); setMessage('Server gagal dimuat. Pilih server lain.')}} /> : <div className="player player-empty grid h-full w-full place-items-center rounded-2xl bg-black"><button className="play-big" onClick={()=>shown[0]&&load(shown[0].id)} aria-label="Putar video">▶</button><span>ANIMESU PLAYER</span></div>}
    </div>
    {message && <div className={`player-loading-message ${serverState}`}><span>{message}</span>{(serverState === 'failed' || serverState === 'warning') && servers.length > 1 && <button type="button" onClick={()=>setServerOpen(true)}>Pilih Server</button>}</div>}
    <div className="watch-toolbar player-toolbar-mobile">
      {servers.length > 1 && <div className="server-menu-wrap"><button className="watch-pill watch-ghost-btn" onClick={()=>setServerOpen(true)} aria-expanded={serverOpen}>Server: {activeServer?.name || 'Default'} <ChevronDown size={15}/></button></div>}
      <button className="watch-pill watch-ghost-btn" onClick={()=>setSettingsOpen(true)}><Settings size={15}/> Pengaturan</button>
    </div>
    {mounted && serverOverlay ? createPortal(serverOverlay, document.body) : null}
    {mounted && settingsOverlay ? createPortal(settingsOverlay, document.body) : null}
  </div>;
}
