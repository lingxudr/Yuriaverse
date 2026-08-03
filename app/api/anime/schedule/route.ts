import { providerManager, safeJson } from '../../../../lib/api';
import { getAnimasuSchedule } from '../../../../lib/specialSources';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET() {
  return safeJson(async () => {
    const primary = await providerManager.execute('schedule:v1', providerManager.ttl('medium'), (p) => p.schedule()).catch(() => ({ days: [], source: 'primary-empty' }));
    if (primary.days?.some((d) => d.items?.length)) return primary;
    return getAnimasuSchedule();
  }, { days: [], source: 'fallback-empty' });
}
