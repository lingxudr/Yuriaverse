import { safeJson } from '../../../../lib/api';
import { getAllAnimeList } from '../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request) { const u = new URL(req.url); const page = Math.max(1, Number(u.searchParams.get('page') || 1)); const limit = Math.min(100, Math.max(12, Number(u.searchParams.get('limit') || 48))); const q = u.searchParams.get('q') || ''; return safeJson(() => getAllAnimeList(page, limit, q), { items: [], pagination: { page }, source: 'all-empty', totalItems: 0 }); }
