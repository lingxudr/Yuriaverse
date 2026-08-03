import { providerManager, safeJson } from '../../../../lib/api';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET() {
  return safeJson(
    () => providerManager.execute('home:v1', providerManager.ttl('short'), (p) => p.home()),
    { ongoing: [], complete: [], popular: [], source: 'fallback-empty' }
  );
}
