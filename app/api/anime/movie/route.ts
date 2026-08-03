import { NextResponse } from 'next/server';
import { pageFrom, safeJson } from '../../../../lib/api';
import { getMovieList } from '../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const page = pageFrom(req); const order = new URL(req.url).searchParams.get('order') || 'update';
  return safeJson(() => getMovieList(page, order), { items: [], pagination: { page }, source: 'movie-empty' });
}
