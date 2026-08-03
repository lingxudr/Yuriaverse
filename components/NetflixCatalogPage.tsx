'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { LightIcon } from './LightIcon';

type CatalogItem = {
  id: string;
  title: string;
  image?: string;
  href: string;
  badge?: string;
  meta?: string;
  description?: string;
  provider?: string;
  year?: string;
  status?: string;
  type?: string;
};

type Filter = { id: string; label: string; href?: string };

type Props = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  heroImage: string;
  accent?: 'red' | 'blue' | 'violet';
  items: CatalogItem[];
  filters?: Filter[];
  activeFilter?: string;
  searchPlaceholder?: string;
};

function Row({ title, items }: { title: string; items: CatalogItem[] }) {
  if (!items.length) return null;
  return <section className="netflix-row">
    <div className="netflix-row-head"><h2>{title}</h2><span>{items.length} judul</span></div>
    <div className="netflix-track">
      {items.map((item) => <Link href={item.href} prefetch={false} className="netflix-card" key={`${title}-${item.id}-${item.href}`}>
        <div className="netflix-poster">
          {item.image ? <Image src={item.image} alt={item.title} fill sizes="(max-width:640px) 42vw, (max-width:1024px) 220px, 250px" quality={72} className="object-cover"/> : <div className="netflix-empty-poster">{item.title.slice(0,2)}</div>}
          {item.badge && <b>{item.badge}</b>}
        </div>
        <div className="netflix-card-body"><strong>{item.title}</strong><small>{item.meta || item.status || item.type || 'Animesu'}</small></div>
      </Link>)}
    </div>
  </section>;
}

export function NetflixCatalogPage({ title, subtitle, eyebrow = 'ANIMESU ORIGINAL', heroImage, accent = 'red', items, filters = [], activeFilter = 'all', searchPlaceholder = 'Cari judul...' }: Props) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => items.filter((item) => !q || `${item.title} ${item.meta} ${item.provider} ${item.type} ${item.status}`.toLowerCase().includes(q.toLowerCase())), [items, q]);
  const hero = filtered[0] || items[0];
  const latest = filtered.slice(0, 18);
  const popular = [...filtered].reverse().slice(0, 18);
  const completed = filtered.filter((x) => /complete|end|selesai/i.test(`${x.status} ${x.title} ${x.meta}`)).slice(0, 18);
  const movies = filtered.filter((x) => /movie|film/i.test(`${x.type} ${x.title} ${x.meta}`)).slice(0, 18);
  const providerRows = Object.entries(filtered.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    const key = item.provider || item.badge || 'Animesu';
    (acc[key] ||= []).push(item);
    return acc;
  }, {})).filter(([, arr]) => arr.length >= 3).slice(0, 4);

  return <main className={`netflix-page netflix-${accent}`}>
    <section className="netflix-hero">
      <Image src={hero?.image || heroImage} alt="" fill priority sizes="100vw" quality={78} className="object-cover"/>
      <div className="netflix-hero-shade" />
      <div className="netflix-hero-content">
        <span>{eyebrow}</span>
        <h1>{hero?.title || title}</h1>
        <p>{hero?.description || subtitle}</p>
        <div className="netflix-actions">
          {hero && <Link className="netflix-play" href={hero.href}><LightIcon name="tv" size={20}/> Tonton Sekarang</Link>}
          <a className="netflix-info" href="#catalog"><LightIcon name="search" size={18}/> Jelajahi</a>
        </div>
      </div>
    </section>

    <section id="catalog" className="netflix-catalog">
      <div className="netflix-toolbar">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <label className="netflix-search"><LightIcon name="search" size={18}/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={searchPlaceholder}/></label>
      </div>
      {filters.length > 0 && <nav className="netflix-tabs">{filters.map((filter)=><Link key={filter.id} href={filter.href || '#'} className={activeFilter === filter.id ? 'active' : ''}>{filter.label}</Link>)}</nav>}
      {!filtered.length && <div className="netflix-empty">Tidak ada hasil. Coba kata kunci/provider lain.</div>}
      <Row title="Terbaru di Animesu" items={latest}/>
      <Row title="Populer Minggu Ini" items={popular}/>
      <Row title="Movie Pilihan" items={movies}/>
      <Row title="Completed / Tamat" items={completed}/>
      {providerRows.map(([provider, row]) => <Row key={provider} title={`Dari ${provider}`} items={row.slice(0, 18)}/>) }
    </section>
  </main>;
}
