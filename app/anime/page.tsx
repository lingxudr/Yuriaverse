import { CategoryPage } from '../../components/CategoryPage';
import { apiGet } from '../../lib/siteApi';
import type { ListPayload } from '../../lib/types';
import { toCategoryPageItems } from '../../lib/categoryPageData';

export default async function Page(){
  const data = await apiGet<ListPayload>('/api/category?kind=anime&tab=all&page=1&limit=24', { items: [], pagination: { page: 1 }, source: 'empty' });
  return <CategoryPage
    theme="anime"
    kind="anime"
    title="Anime"
    subtitle="Jelajahi katalog anime Sub Indo: ongoing, completed, movie, OVA, ONA, dan batch."
    bannerUrl="/home/category-anime-2026.webp"
    placeholder="Search anime..."
    initialItems={toCategoryPageItems(data.items, 'anime', 'all')}
    filters={[{id:'all',label:'Semua'},{id:'ongoing',label:'Ongoing'},{id:'completed',label:'Completed'},{id:'movie',label:'Movie'},{id:'ova',label:'OVA'},{id:'ona',label:'ONA'},{id:'batch',label:'Batch'}]}
  />;
}
