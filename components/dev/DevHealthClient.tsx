'use client';
import useSWR from 'swr';
import { RefreshCw } from 'lucide-react';
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());
export function DevHealthClient({ secretKey = '' }: { secretKey?: string }) {
  const { data, error, isLoading, mutate } = useSWR(`/api/dev/health${secretKey ? `?key=${encodeURIComponent(secretKey)}` : ''}`, fetcher, { refreshInterval: 60000, revalidateOnFocus: true });
  if (isLoading) return <div className="panel"><h2>Memeriksa endpoint...</h2><div className="skeleton-grid">{Array.from({length:8}).map((_,i)=><div className="skeleton-card" key={i}/>)}</div></div>;
  if (error) return <div className="panel empty"><h2>Health check gagal</h2><p className="muted">{String(error.message || error)}</p><button className="btn" onClick={() => mutate()}><RefreshCw size={16}/> Coba Lagi</button></div>;
  const endpoints = data?.endpoints || [];
  return <div className="dev-health">
    <section className={`panel health-hero ${data.ok ? 'ok' : 'bad'}`}><div><h2>{data.ok ? 'Semua endpoint kritikal sehat' : 'Ada endpoint kritikal bermasalah'}</h2><p className="muted">Last check: {data.at} • {data.latencyMs}ms</p></div><button className="btn" onClick={() => mutate()}><RefreshCw size={16}/> Refresh</button></section>
    <div className="health-summary">{Object.entries(data.groups || {}).map(([group, stat]: any)=><article className="panel" key={group}><b>{group}</b><span>{stat.ok}/{stat.total} OK</span><small>{stat.failed} failed</small></article>)}</div>
    <section className="panel"><h2>Provider Endpoint Monitor</h2><div className="health-table">{endpoints.map((e: any)=><article className={`health-row ${e.ok?'ok':'bad'}`} key={e.path}><div><b>{e.group} / {e.name}</b><code>{e.path}</code>{e.sampleTitle && <small>Sample: {e.sampleTitle}</small>}</div><div><span>{e.ok?'OK':'FAIL'}</span><small>{e.status || '-'} • {e.latencyMs}ms • {e.itemCount ?? 0} items</small>{e.message && <small>{e.message}</small>}</div></article>)}</div></section>
  </div>;
}
