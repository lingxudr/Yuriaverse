import type { Metadata } from 'next';
import { apiGet } from '../../../lib/siteApi';
import type { EpisodeDetail } from '../../../lib/types';
import { validEpisode } from '../../../lib/validators';
import { DetailFallback } from '../../../components/detail/DetailFallback';
import { WatchPageView } from '../../../components/detail/WatchPageView';

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ source?: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const qs = sp.source ? `?source=${encodeURIComponent(sp.source)}` : '';
  try {
    const res = await fetch(`https://animesu.vercel.app/api/anime/episode/${encodeURIComponent(slug)}${qs}`, { next: { revalidate: 900 } });
    const json = await res.json(); const ep = json?.data;
    if (ep?.title && !/tidak tersedia|gagal/i.test(ep.title)) {
      const desc = `Nonton ${ep.title} subtitle Indonesia di Animesu.`;
      return { title: ep.title, description: desc, alternates: { canonical: `https://animesu.vercel.app/episode/${encodeURIComponent(slug)}${qs}` }, openGraph: { title: `${ep.title} | Animesu`, description: desc, images: ep.poster ? [{url: ep.poster}] : ['/og-image.png'], type: 'video.episode' }, twitter: { card: 'summary_large_image', title: `${ep.title} | Animesu`, description: desc, images: ep.poster ? [ep.poster] : ['/og-image.png'] } };
    }
  } catch {}
  return { title: 'Episode Anime', description: 'Nonton episode anime subtitle Indonesia di Animesu.' };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ source?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const qs = sp.source ? `?source=${encodeURIComponent(sp.source)}` : '';
  const episode = await apiGet<EpisodeDetail>(`/api/anime/episode/${slug}${qs}`, { title: 'Episode tidak tersedia', slug, servers: [], downloads: [] });
  if (!validEpisode(episode)) return <DetailFallback title="Episode sedang tidak tersedia dari provider." />;

  const groups = Object.entries(episode.downloads.reduce<Record<string, typeof episode.downloads>>((acc, download)=>{
    const quality=(download.quality||'Other').replace('Mp4_','').toUpperCase();
    (acc[quality] ||= []).push(download);
    return acc;
  }, {}));
  const detailHref = episode.animeSlug ? `/anime/${episode.animeSlug}${qs}` : '/anime';
  const jsonLd = { '@context':'https://schema.org', '@type':'TVEpisode', name: episode.title, image: episode.poster, partOfSeries: episode.animeSlug ? { '@type':'TVSeries', name: episode.animeSlug } : undefined };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
    <WatchPageView episode={episode} slug={slug} qs={qs} detailHref={detailHref} groups={groups} />
  </>;
}
