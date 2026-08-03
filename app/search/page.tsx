import { GlobalSearch } from '../../components/GlobalSearch';

export const metadata = {
  title: 'Global Search',
  description: 'Cari anime, donghua, movie, dan manga di Animesu dalam satu halaman.'
};

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  return <main className="wrap"><GlobalSearch initial={sp.q || ''}/></main>;
}
