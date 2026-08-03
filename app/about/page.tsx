import Link from 'next/link';
import { apiGet } from '../../lib/siteApi';
import type { Genre, ListPayload } from '../../lib/types';
import { Bolt, Smartphone, Download, Heart, ShieldCheck, Users, Film, Tags, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Tentang Animesu',
  description: 'Tentang Animesu, platform streaming anime subtitle Indonesia terbaik untuk otaku sejati.'
};

export default async function Page(){
 const [all, genres]=await Promise.all([
  apiGet<ListPayload & {totalItems?:number}>('/api/anime/all?page=1&limit=1',{items:[],pagination:{page:1},source:'empty',totalItems:0}),
  apiGet<Genre[]>('/api/anime/genre',[])
 ]);
 const features=[
  ['Streaming Cepat','Nonton tanpa buffering dengan server optimal.',Bolt,'⚡'],
  ['Mobile Friendly','Tampilan responsif untuk HP dan tablet.',Smartphone,'📱'],
  ['Offline Ready','Simpan favorit dan akses download untuk tonton offline.',Download,'💾'],
  ['Gratis Selamanya','Tanpa biaya langganan dan tanpa iklan mengganggu.',Heart,'🆓']
 ] as const;
 const stats=[
  ['Total Anime Tersedia', String(all.totalItems||'1900+'), Film],
  ['Total Episode', '10.000+', ShieldCheck],
  ['Pengguna Aktif', '24/7', Users],
  ['Total Genre', String(genres.length||'30+'), Tags]
 ] as const;
 return <main className="about-v2">
  <section className="wrap about-v2-hero">
    <div className="about-v2-copy">
      <span className="about-v2-pill"><Sparkles size={16}/> ユリアバース • Anime Hub Indonesia</span>
      <h1>Tentang Animesu</h1>
      <p>Platform streaming anime subtitle Indonesia terbaik untuk otaku sejati.</p>
      <p className="about-v2-desc">Animesu dibuat untuk menghadirkan pengalaman menonton Anime, Donghua, Movie, jadwal rilis, berita, bookmark, dan riwayat tontonan dalam satu tempat yang cepat, bersih, dan nyaman digunakan di semua perangkat.</p>
      <div className="about-v2-actions"><Link className="v4-btn primary" href="/anime">Jelajahi Anime</Link><Link className="v4-btn secondary" href="/donghua">Lihat Donghua</Link></div>
    </div>
    <div className="about-v2-illustration" aria-label="Ilustrasi anime Animesu"><div>🌸</div><div>🐱‍👤</div><div>🎬</div><span>ANIMESU</span></div>
  </section>

  <section className="wrap about-v2-section">
    <div className="about-v2-head"><h2>Kelebihan Animesu</h2><p>Fokus pada kecepatan, kenyamanan, dan pengalaman menonton tanpa gangguan.</p></div>
    <div className="about-v2-features">{features.map(([title,desc,Icon,emoji])=><article className="about-v2-card" key={title}><div className="about-v2-icon"><Icon size={26}/><span>{emoji}</span></div><h3>{title}</h3><p>{desc}</p></article>)}</div>
  </section>

  <section className="wrap about-v2-section">
    <div className="about-v2-head"><h2>Statistik Situs</h2><p>Data ringkas dari katalog dan fitur Animesu.</p></div>
    <div className="about-v2-stats">{stats.map(([label,value,Icon])=><article key={label}><Icon size={25}/><b>{value}</b><span>{label}</span></article>)}</div>
  </section>

  <section className="wrap about-v2-note"><h2>Animesu dibuat 2026</h2><p>Kami ingin Animesu menjadi rumah yang ringan, rapi, dan menyenangkan untuk mencari tontonan anime dan donghua subtitle Indonesia.</p></section>
 </main>
}
