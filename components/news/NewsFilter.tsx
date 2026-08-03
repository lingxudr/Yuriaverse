'use client';
import { Search } from 'lucide-react';
export function NewsFilter({ query, source, sort, sources, onChange }: { query: string; source: string; sort: string; sources: string[]; onChange: (v: { query?: string; source?: string; sort?: string }) => void }) {
  return <div className="news-filter"><label><Search size={17}/><input value={query} onChange={(e)=>onChange({ query: e.target.value })} placeholder="Cari berita anime..."/></label><select value={sort} onChange={(e)=>onChange({ sort: e.target.value })} aria-label="Urutkan berita"><option value="latest">Terbaru</option><option value="popular">Populer</option></select><select value={source} onChange={(e)=>onChange({ source: e.target.value })} aria-label="Filter sumber berita"><option value="">Semua Sumber</option>{sources.map((s)=><option value={s} key={s}>{s}</option>)}</select></div>;
}
