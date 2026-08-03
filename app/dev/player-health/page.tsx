import { PlayerHealthClient } from '../../../components/dev/PlayerHealthClient';
import { requireDevAccess } from '../../../lib/devAuth';
export const metadata = { title: 'Player Health Monitor' };
export default async function Page({ searchParams }: { searchParams: Promise<{ key?: string }> }){ const sp = await searchParams; requireDevAccess(sp.key); return <main className="wrap" style={{paddingTop:42}}><h1>Player Health Monitor</h1><p className="muted">Audit sample detail, episode, server, stream URL, dan download untuk Anime, Donghua, Movie, Live Action, OVA, dan Batch.</p><PlayerHealthClient secretKey={sp.key || ''}/></main>}
