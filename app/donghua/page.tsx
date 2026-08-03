import { CategoryPage } from '../../components/CategoryPage';
import { apiGet } from '../../lib/siteApi';
import type { ListPayload } from '../../lib/types';
import { toCategoryPageItems } from '../../lib/categoryPageData';

export default async function Page(){
  const data = await apiGet<ListPayload>('/api/category?kind=donghua&tab=all&page=1&limit=24', { items: [], pagination: { page: 1 }, source: 'empty' });
  return <CategoryPage
    theme="donghua"
    kind="donghua"
    title="Donghua"
    subtitle="Dunia kultivasi, legenda, dan petualangan fantasi China dari provider aktif."
    bannerUrl="/home/category-donghua-2026.webp"
    placeholder="Search donghua..."
    initialItems={toCategoryPageItems(data.items, 'donghua', 'all')}
    filters={[{id:'all',label:'Semua'},{id:'ongoing',label:'Ongoing'},{id:'completed',label:'Completed'},{id:'movie',label:'Movie'},{id:'batch',label:'Batch'}]}
  />;
}
