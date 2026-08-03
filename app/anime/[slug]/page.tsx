import type { Metadata } from 'next';
import { apiGet } from '../../../lib/siteApi';
import type { AnimeDetail } from '../../../lib/types';
import { validDetail, validEpisodeItem } from '../../../lib/validators';
import { duration, episodeCount, genres, rating, releaseDate, status, studio, valueText } from '../../../lib/formatters';
import { DetailFallback } from '../../../components/detail/DetailFallback';
import { AnimeDetailView } from '../../../components/detail/AnimeDetailView';

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ source?: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const qs = sp.source ? `?source=${encodeURIComponent(sp.source)}` : '';
  try {
    const res = await fetch(`https://animesu.vercel.app/api/anime/detail/${encodeURIComponent(slug)}${qs}`, { next: { revalidate: 1800 } });
    const json = await res.json();
    const d = json?.data;
    if (d?.title && !/tidak tersedia|gagal/i.test(d.title)) {
      const desc = (d.synopsis || `Nonton ${d.title} subtitle Indonesia di Animesu.`).slice(0, 160);
      return {
        title: d.title,
        description: desc,
        alternates: { canonical: `https://animesu.vercel.app/anime/${encodeURIComponent(slug)}${qs}` },
        openGraph: { title: `${d.title} | Animesu`, description: desc, images: d.poster ? [{ url: d.poster }] : ['/og-image.png'], type: 'video.tv_show' },
        twitter: { card: 'summary_large_image', title: `${d.title} | Animesu`, description: desc, images: d.poster ? [d.poster] : ['/og-image.png'] }
      };
    }
  } catch {}
  return { title: 'Detail Anime', description: 'Detail anime subtitle Indonesia di Animesu.' };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ source?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const source = sp.source ? `?source=${encodeURIComponent(sp.source)}` : '';
  const anime = await apiGet<AnimeDetail>(`/api/anime/detail/${slug}${source}`, { title: 'Anime tidak tersedia', slug, genres: [], episodes: [] });
  if (!validDetail(anime)) return <DetailFallback />;

  const raw: any = anime.raw || {};
  const validEpisodes = (anime.episodes || []).filter(validEpisodeItem);
  const recommendations = (raw.recommendedAnimeList || []).slice(0, 6);
  const episodeSource = sp.source ? `?source=${encodeURIComponent(sp.source)}` : '';
  const episodeGroups = validEpisodes.reduce<{ label: string; items: typeof validEpisodes }[]>((acc, episode, index) => {
    const seasonLabel = raw.season ? String(raw.season) : `Bagian ${Math.floor(index / 24) + 1}`;
    let group = acc.find((g) => g.label === seasonLabel);
    if (!group) { group = { label: seasonLabel, items: [] }; acc.push(group); }
    group.items.push(episode);
    return acc;
  }, []);
  const meta: [string, string][] = [
    ['Score', rating(anime.rating || raw.score?.value || raw.score)],
    ['Studio', studio(anime.studio || raw.studios)],
    ['Genre', genres(anime.genres)],
    ['Status', status(anime.status)],
    ['Release', releaseDate(anime.released || raw.aired || raw.released_on)],
    ['Duration', duration(anime.duration)],
    ['Season', valueText(raw.season)],
    ['Source', valueText(raw.source || sp.source || 'Sanka')],
    ['Total Episode', episodeCount(raw.total_episode ?? raw.episode_count ?? raw.episodes_count ?? raw.episodes, validEpisodes)],
    ['Subtitle', raw.subtitle || 'Indonesia']
  ];
  const jsonLd = { '@context': 'https://schema.org', '@type': 'TVSeries', name: anime.title, image: anime.poster, description: anime.synopsis, genre: anime.genres.map(g=>g.name), datePublished: anime.released, aggregateRating: anime.rating ? { '@type': 'AggregateRating', ratingValue: anime.rating, bestRating: '10' } : undefined };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
    <AnimeDetailView anime={anime} meta={meta} episodeGroups={episodeGroups} episodeSource={episodeSource} recommendations={recommendations} />
  </>;
}
