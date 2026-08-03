import dynamic from 'next/dynamic';
const ImageSearchClient = dynamic(() => import('../../components/ImageSearchClient').then((m) => m.ImageSearchClient), { loading: () => <main className="wrap"><div className="skeleton-hero"/></main> });
export default function Page(){return <ImageSearchClient/>}
