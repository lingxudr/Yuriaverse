import Link from 'next/link';
import { RetryButton } from './RetryButton';
export function DetailFallback({ title='Konten sedang tidak tersedia dari provider.' }: { title?: string }) {
  return <main className="wrap" style={{paddingTop:42}}><section className="panel empty"><div style={{fontSize:64}}>📭</div><h1>{title}</h1><p className="muted">Silakan coba lagi nanti, kembali ke halaman sebelumnya, atau jelajahi katalog lain.</p><div className="server-list"><RetryButton/><Link className="btn secondary" href="/anime">Lihat Katalog</Link><Link className="btn secondary" href="/">Beranda</Link></div></section></main>
}
