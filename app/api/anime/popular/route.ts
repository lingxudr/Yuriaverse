import { pageFrom, safeJson } from '../../../../lib/api';
import { getPopularList } from '../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request) { const page = pageFrom(req); return safeJson(() => getPopularList(page), { items: [], pagination: { page }, source: 'popular-empty' }); }
