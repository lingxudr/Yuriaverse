import { DevHealthClient } from '../../../components/dev/DevHealthClient';
import { requireDevAccess } from '../../../lib/devAuth';
export const metadata = { title: 'Dev Health Monitor' };
export default async function Page({ searchParams }: { searchParams: Promise<{ key?: string }> }){ const sp = await searchParams; requireDevAccess(sp.key); return <main className="wrap" style={{paddingTop:42}}><h1>Dev Health Monitor</h1><p className="muted">Pantau status endpoint Sanka, response time, jumlah item, dan endpoint yang gagal.</p><DevHealthClient secretKey={sp.key || ''}/></main>; }
