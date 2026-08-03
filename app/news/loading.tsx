import { NewsSkeleton } from '../../components/news/NewsSkeleton';
export default function Loading(){return <main id="main-content" className="wrap"><h1 style={{marginTop:24}}>Berita Anime</h1><p className="muted">Memuat berita terbaru...</p><NewsSkeleton count={9}/></main>}
