import Link from 'next/link';
import { apiGet } from '../../lib/siteApi';
import type { ListPayload } from '../../lib/types';
export default async function Page(){const d=await apiGet<ListPayload>('/api/anime/ongoing?page=1',{items:[],pagination:{page:1},source:'empty'}); return <main className="wrap"><h1 style={{marginTop:42}}>Upcoming</h1><div className="upcoming-grid">{d.items.slice(0,12).map((a,i)=><Link className="upcoming-card" href={`/anime/${a.slug}`} key={a.slug}><b>{a.title}</b><span>Countdown episode baru</span><em>{(i+1)*6} jam</em></Link>)}</div></main>}
