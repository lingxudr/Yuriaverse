import dynamic from 'next/dynamic';
const ProfileDashboard = dynamic(() => import('../../components/ProfileDashboard').then((m) => m.ProfileDashboard), { loading: () => <main className="wrap"><div className="skeleton-hero"/></main> });
export default function Page(){return <ProfileDashboard/>}
