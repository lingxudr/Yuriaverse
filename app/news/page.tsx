import dynamic from 'next/dynamic';
import { getLatestNews } from '../../lib/api/news';
import { NewsSkeleton } from '../../components/news/NewsSkeleton';
const NewsList = dynamic(() => import('../../components/news/NewsList').then((m) => m.NewsList), { loading: () => <NewsSkeleton count={9}/> });
export const metadata = { title: 'Berita Anime Terbaru', description: 'Berita anime, manga, donghua, movie, seiyuu, dan industri Jepang terbaru di Animesu.' };
export default async function Page(){ const initial = await getLatestNews(1,20); return <main className="wrap"><h1 style={{marginTop:24}}>Berita Anime</h1><p className="muted">Update berita anime dari berbagai sumber seperti MyAnimeList, Anime Corner, ComicBook, Crunchyroll, ANN, dan lainnya.</p><NewsList initial={initial}/></main> }
