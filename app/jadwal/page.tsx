import dynamic from 'next/dynamic';
import { apiGet } from '../../lib/siteApi';
import type { SchedulePayload } from '../../lib/types';
const ScheduleV2 = dynamic(() => import('../../components/ScheduleV2').then((m) => m.ScheduleV2), { loading: () => <main className="wrap"><div className="skeleton-hero"/><div className="skeleton-grid">{Array.from({length:8}).map((_,i)=><div className="skeleton-card" key={i}/>)}</div></main> });
export default async function Page() {
  const [data,donghua]=await Promise.all([
    apiGet<SchedulePayload>('/api/anime/schedule', { days: [], source: 'empty' }),
    apiGet<SchedulePayload>('/api/anime/donghua/schedule', { days: [], source: 'empty' })
  ]);
  return <ScheduleV2 anime={data} donghua={donghua}/>;
}
