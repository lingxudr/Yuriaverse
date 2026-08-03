import { providerManager, safeJson } from '../../../../lib/api';
import { getMergedGenres } from '../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET() {
  return safeJson(async () => getMergedGenres(await providerManager.execute('genres:v1', providerManager.ttl('long'), (p) => p.genres()).catch(() => [])), []);
}
