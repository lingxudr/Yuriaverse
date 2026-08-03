import { safeJson } from '../../../../../lib/api';
import { getDonghuaSchedule } from '../../../../../lib/specialSources';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(){return safeJson(()=>getDonghuaSchedule(), { days: [], source: 'donghua-schedule-empty' });}
