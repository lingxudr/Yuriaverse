import Link from 'next/link';
import type { AnimeCard } from '../lib/types';
import { SafeImage } from './SafeImage';
import { Bookmark, Info, Play } from 'lucide-react';

type Source = '' | 'donghua' | 'samehadaku' | 'animasu';
type Section = { title: string; items: AnimeCard[]; href?: string; empty?: string; source?: Source };

type Props = {
  kind: 'anime' | 'donghua' | 'movie' | 'live-action';
  eyebrow: string;
  title: string;
  description: string;
  bannerClass: string;
  searchPlaceholder: string;
  filters: string[];
  sections: Section[];
  q?: string;
  activeFilter?: string;
};

const sourceByKind: Record<Props['kind'], Source> = { anime: '', donghua: 'donghua', movie: 'samehadaku', 'live-action': 'animasu' };

function detailHref(item: AnimeCard, source: Source) {
  return `/anime/${item.slug}${source ? `?source=${source}` : ''}`;
}

function watchHref(item: AnimeCard, source: Source) {
  return detailHref(item, source);
}

function filterItems(items: AnimeCard[], q = '', filter = 'Semua') {
  const query = q.trim().toLowerCase();
  const f = filter.toLowerCase();
  const byQuery = items.filter((item) => {
    const text = `${item.title} ${item.status || ''} ${item.type || ''} ${item.releaseDay || ''}`.toLowerCase();
    return !query || text.includes(query);
  });
  if (filter === 'Semua') return byQuery;
  const filtered = byQuery.filter((item) => {
    const text = `${item.title} ${item.status || ''} ${item.type || ''} ${item.releaseDay || ''} ${item.latestRelease || ''}`.toLowerCase();
    return text.includes(f)
      || (f === 'ongoing' && (Boolean(item.episode) || text.includes('on-going')))
      || (f === 'completed' && (text.includes('complete') || text.includes('finished') || text.includes('tamat')))
      || (f === 'terbaru' && Boolean(item.latestRelease))
      || (f === 'populer' && Boolean(item.score));
  });
  // Jangan kosongkan section hanya karena filter metadata provider tidak konsisten.
  return filtered.length || query ? filtered : byQuery;
}

function RailCard({ item, source }: { item: AnimeCard; source: Source }) {
  return <article className="hub-card">
    <Link href={detailHref(item, source)} className="hub-poster" prefetch={false} aria-label={`Detail ${item.title}`}>
      <SafeImage src={item.poster} alt={item.title} fallbackText={item.title} fill sizes="190px" loading="lazy"/>
      <span className="hub-badge">{item.status || item.type || 'SUB'}</span>
      {item.score && <span className="hub-rating">⭐ {item.score}</span>}
    </Link>
    <div className="hub-card-body"><h3>{item.title}</h3><p>{item.episode ? `Episode ${item.episode}` : item.type || 'Detail tersedia'}</p><div className="hub-actions"><Link href={watchHref(item, source)} className="btn"><Play size={14}/> Tonton</Link><Link href={detailHref(item, source)} className="btn secondary"><Info size={14}/> Detail</Link><button className="icon-btn" aria-label={`Bookmark ${item.title}`}><Bookmark size={15}/></button></div></div>
  </article>;
}

function SectionRail({ section, fallbackSource, q, filter }: { section: Section; fallbackSource: Source; q?: string; filter?: string }) {
  const source = section.source ?? fallbackSource;
  const items = filterItems(section.items || [], q, filter);
  return <section className="hub-section"><div className="hub-section-head"><h2>{section.title}</h2>{section.href && <Link href={section.href}>Lihat Semua →</Link>}</div>{items.length ? <div className="hub-rail">{items.map((item) => <RailCard key={`${section.title}-${item.slug}`} item={item} source={source}/>)}</div> : <div className="hub-empty"><b>Data belum tersedia</b><p>{section.empty || 'Data untuk section ini belum tersedia dari provider.'}</p></div>}</section>;
}

export function CategoryHub({ kind, eyebrow, title, description, bannerClass, searchPlaceholder, filters, sections, q = '', activeFilter = 'Semua' }: Props) {
  const base = kind === 'anime' ? '/anime' : `/${kind}`;
  const source = sourceByKind[kind];
  return <main className="wrap category-hub"><section className={`hub-hero ${bannerClass}`}><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p><form className="hub-search" action={base}><input name="q" defaultValue={q} placeholder={searchPlaceholder}/><button className="btn">Search</button></form></div></section><div className="hub-filters"><Link href={base} className={activeFilter === 'Semua' ? 'active' : ''}>Semua</Link>{filters.filter((f) => f !== 'Semua').map((f) => <Link key={f} href={`${base}?filter=${encodeURIComponent(f)}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={activeFilter === f ? 'active' : ''}>{f}</Link>)}</div>{sections.map((section) => <SectionRail key={section.title} section={section} fallbackSource={source} q={q} filter={activeFilter}/>)}</main>;
}
