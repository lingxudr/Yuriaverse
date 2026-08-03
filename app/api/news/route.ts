import { NextResponse } from 'next/server';
import { getLatestNews } from '../../../lib/api/news';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  const u = new URL(req.url);
  const page = Math.max(1, Number(u.searchParams.get('page') || 1));
  const limit = Math.min(40, Math.max(5, Number(u.searchParams.get('limit') || 20)));
  const query = u.searchParams.get('q') || '';
  const source = u.searchParams.get('source') || '';
  const sort = u.searchParams.get('sort') || 'latest';
  const data = await getLatestNews(page, limit, { query, source, sort });
  return NextResponse.json({ ok: true, data }, { headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=900' } });
}
