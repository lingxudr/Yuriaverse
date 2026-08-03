import { NetflixCatalogPage } from '../../components/NetflixCatalogPage';
import { apiGet } from '../../lib/siteApi';
import type { ListPayload } from '../../lib/types';
import { toCategoryPageItems } from '../../lib/categoryPageData';
import { listAll } from '../../services/sansekai/drama';

export const metadata={title:'Movie Streaming',description:'Koleksi movie anime, Asia, Drakor, dan film pilihan di Animesu.'};

export default async function Page(){
  const [animeMovie, drakor] = await Promise.all([
    apiGet<ListPayload>('/api/category?kind=movie&tab=all&page=1&limit=36', { items: [], pagination: { page: 1 }, source: 'empty' }),
    listAll('drakorid','latest','',36).catch(()=>[])
  ]);
  const animeItems = toCategoryPageItems(animeMovie.items, 'movie', 'all').map((item)=>({
    id:item.id,
    title:item.title,
    image:item.image,
    href:item.href,
    badge:'Anime Movie',
    meta:item.meta || item.episode || 'Movie',
    provider:'Anime Movie',
    type:'Movie'
  }));
  const drakorMovies = drakor.filter((x)=>/movie/i.test(`${x.type} ${x.title}`)).map((item)=>({
    id:`drakorid-${item.id}`,
    title:item.title,
    image:item.poster,
    href:`/drama/${item.provider}/${encodeURIComponent(item.id)}`,
    badge:'Drakor Movie',
    meta:item.year ? `${item.year} • Movie` : 'Movie',
    description:item.description,
    provider:'Drakor Movie',
    type:'Movie',
    status:item.status
  }));
  const items = [...drakorMovies, ...animeItems];
  return <NetflixCatalogPage
    title="Movie"
    subtitle="Movie anime, Drakor, Asia, dan film pilihan dengan tampilan sinematik."
    eyebrow="CINEMA MODE"
    heroImage="/home/category-movie-2026.webp"
    accent="blue"
    searchPlaceholder="Cari movie, film, drakor..."
    filters={[{id:'all',label:'Semua',href:'/movie'},{id:'drakor',label:'Drakor Movie',href:'/drama?provider=drakorid'},{id:'anime',label:'Anime Movie',href:'/movie'}]}
    activeFilter="all"
    items={items}
  />;
}
