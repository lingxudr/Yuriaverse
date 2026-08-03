import { AnimeGrid } from '../../components/AnimeGrid';
import { apiGet } from '../../lib/siteApi';
import type { HomePayload } from '../../lib/types';
export default async function Page(){const h=await apiGet<HomePayload>('/api/anime/home',{ongoing:[],complete:[],popular:[],source:'empty'}); return <main className="wrap"><h1 style={{marginTop:42}}>Trending Hari Ini</h1><AnimeGrid items={[...h.ongoing,...h.complete].slice(0,24)}/></main>}
