import { pageFrom, safeJson } from '../../../../lib/api';
import { getDonghuaList, getDonghuaMultiList } from '../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request) { const page = pageFrom(req); const u = new URL(req.url); const type = u.searchParams.get('type') || 'ongoing'; const multi = u.searchParams.get('multi') !== '0' && page === 1; return safeJson(() => multi ? getDonghuaMultiList(type, 2) : getDonghuaList(type, page), { items: [], pagination: { page }, source: 'donghua-empty' }); }
