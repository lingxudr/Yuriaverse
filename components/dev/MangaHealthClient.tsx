'use client';
import useSWR from 'swr';
import { RefreshCw } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

export function MangaHealthClient({ secretKey = '' }: { secretKey?: string }) {
  const { data, error, isLoading, mutate } = useSWR(`/api/dev/manga-health${secretKey ? `?key=${encodeURIComponent(secretKey)}` : ''}`, fetcher, { refreshInterval: 60000, revalidateOnFocus: true });
  if (isLoading) return <section className="panel"><h2>Memeriksa Manga Scraper...</h2><p className="muted">Menghubungi provider dan endpoint internal.</p></section>;
  if (error) return <section className="panel empty"><h2>Health check gagal</h2><p className="muted">{String(error.message || error)}</p><button className="btn" onClick={()=>mutate()}><RefreshCw size={16}/> Coba Lagi</button></section>;
  const checks = data?.checks || [];
  return <div className="dev-health">
    <section className={`panel health-hero ${data.ok ? 'ok' : 'bad'}`}><div><h2>{data.ok ? 'Manga scraper kritikal sehat' : 'Ada masalah pada manga scraper'}</h2><p className="muted">Last check: {data.at} • {data.latencyMs}ms</p><p className="muted">Critical: {data.summary?.criticalOk}/{(data.summary?.criticalOk || 0) + (data.summary?.criticalFailed || 0)} OK • External aktif: {data.summary?.externalOk - (data.summary?.externalSkipped || 0)}/{data.summary?.externalActiveTotal || data.summary?.externalTotal} OK • Skipped: {data.summary?.externalSkipped || 0}</p></div><button className="btn" onClick={()=>mutate()}><RefreshCw size={16}/> Refresh</button></section>
    <section className="panel"><h2>Manga Scraper Monitor</h2><p className="muted">Provider optional yang Cloudflare/fetch failed ditandai SKIP agar scraper tidak lambat. Critical tetap internal API/detail/reader.</p><div className="health-table">{checks.map((c: any)=>{ const label=c.skipped?'SKIP':c.ok?'OK':'FAIL'; return <article className={`health-row ${c.skipped ? 'skip' : c.ok ? 'ok' : 'bad'}`} key={`${c.group}-${c.name}-${c.url}`}><div><b>{c.group} / {c.name}</b><code>{c.url || '-'}</code>{c.title && <small>Title: {c.title}</small>}</div><div><span>{label}</span><small>{c.status || '-'} • {c.latencyMs}ms • {c.itemCount ?? 0} items</small>{c.message && <small>{c.message}</small>}</div></article>})}</div></section>
  </div>;
}
