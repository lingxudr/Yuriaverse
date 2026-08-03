import { NetflixCatalogPage } from '../../components/NetflixCatalogPage';
import { listAll } from '../../services/sansekai/drama';

export const metadata={title:'Drama Asia & Drakor Movie',description:'Drama Korea, China, Asia, movie Drakor, dan short drama terbaru di Animesu.'};

function publicProviderLabel(provider = '', type = '') {
  if (provider === 'drakorid') return /movie/i.test(type) ? 'Drakor Movie' : (/dracin|china/i.test(type) ? 'Dracin' : 'Drakor');
  if (provider === 'dramabox') return 'Short Drama';
  if (provider === 'pinedrama') return 'Mini Series';
  if (provider === 'reelshort') return 'Vertical Drama';
  if (provider === 'shortmax') return 'Short Series';
  if (provider === 'dramanova') return 'Drama Asia';
  return 'Drama';
}

export default async function Page({searchParams}:{searchParams:Promise<{provider?:string;q?:string}>}){
  const sp=await searchParams;
  const provider=sp.provider||'all';
  const q=sp.q||'';
  const items=await listAll(provider,'latest',q,72);
  const filters=['all','drakorid','dramabox','pinedrama','reelshort','shortmax','dramanova'].map((p)=>({
    id:p,
    label:p==='all'?'Semua':publicProviderLabel(p),
    href:`/drama?provider=${p}${q?`&q=${encodeURIComponent(q)}`:''}`
  }));
  return <NetflixCatalogPage
    title="Drama & Drakor"
    subtitle="Drama Korea, China, movie, dan short drama dengan desain sinematik ala Netflix."
    eyebrow="DRAMA UNIVERSE"
    heroImage="/home/category-drama-2026.webp"
    accent="red"
    filters={filters}
    activeFilter={provider}
    searchPlaceholder="Cari drama, drakor, movie..."
    items={items.map((item)=>({
      id:`${item.provider}-${item.id}`,
      title:item.title,
      image:item.poster,
      href:`/drama/${item.provider}/${encodeURIComponent(item.id)}`,
      badge:publicProviderLabel(item.provider, item.type),
      meta:item.episodeCount?`${item.episodeCount} EP • ${item.status || item.type || 'Drama'}`:(item.status || item.country || item.type || 'Drama'),
      description:item.description,
      provider:publicProviderLabel(item.provider, item.type),
      year:item.year,
      status:item.status,
      type:item.type
    }))}
  />;
}
