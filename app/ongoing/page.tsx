import { AnimeGrid } from '../../components/AnimeGrid';
import { Pagination } from '../../components/Pagination';
import { apiGet } from '../../lib/siteApi';
import type { ListPayload } from '../../lib/types';
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams; const page = Math.max(1, Number(sp.page || 1));
  const data = await apiGet<ListPayload>(`/api/anime/ongoing?page=${page}`, { items: [], pagination: { page }, source: 'empty' });
  return <main className="wrap"><h1 style={{marginTop:42}}>Ongoing Anime</h1><p className="muted">TTL pendek memastikan update episode mengikuti data terbaru Sanka.</p><AnimeGrid items={data.items}/><Pagination page={page} base="/ongoing"/></main>;
}
