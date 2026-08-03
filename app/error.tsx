'use client';
import Link from 'next/link';
export default function Error({ reset }: { error: Error; reset: () => void }) { return <main className="wrap"><section className="panel" style={{marginTop:42}}><h1>Terjadi kendala</h1><p className="muted">Halaman gagal dimuat. Coba lagi atau kembali ke beranda.</p><div className="server-list"><button className="btn" onClick={reset}>Coba Lagi</button><Link className="btn secondary" href="/">Beranda</Link></div></section></main> }
