import { providerManager, safeJson } from '../../../../lib/api';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/.test(id)) return safeJson(async () => ({ url: '', serverId: id }), { url: '', serverId: id });
  return safeJson(() => providerManager.execute(`stream:${id}:v1`, providerManager.ttl('short'), (p) => p.stream(id)), { url: '', serverId: id });
}
