import { pageFrom, safeJson } from '../../../../lib/api';
import { getLiveActionList } from '../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: Request) { const page = pageFrom(req); return safeJson(() => getLiveActionList(page), { items: [], pagination: { page }, source: 'live-action-empty' }); }
