import { AnimeGrid } from '../../../components/AnimeGrid';
import { Pagination } from '../../../components/Pagination';
import { apiGet } from '../../../lib/siteApi';
import type { ListPayload } from '../../../lib/types';
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params; const sp = await searchParams; const page = Math.max(1, Number(sp.page || 1));
  const data = await apiGet<ListPayload>(`/api/anime/genre/${slug}?page=${page}`, { items: [], pagination: { page }, source: 'empty' });
  return <main className="wrap"><h1 style={{marginTop:42}}>Genre: {slug}</h1><AnimeGrid items={data.items}/><Pagination page={page} base={`/genre/${slug}`}/></main>;
}
