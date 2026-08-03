'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { AnimeDetail, EpisodeItem } from '../../lib/types';

type EpisodeGroup = { label: string; items: EpisodeItem[] };
type Recommendation = { animeId?: string; slug?: string; poster?: string; title?: string };

type Props = {
  anime: AnimeDetail;
  meta: [string, string][];
  episodeGroups: EpisodeGroup[];
  episodeSource: string;
  recommendations: Recommendation[];
};

const pageAnim: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } }
};

const listAnim: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } }
};

const itemAnim: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32 } }
};

function useWatchedSlugs() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('animesu:history') || '[]');
      setWatched(new Set(history.map((x: any) => x.slug || x.episodeSlug).filter(Boolean)));
    } catch {
      setWatched(new Set());
    }
  }, []);
  return watched;
}

export function AnimeDetailView({ anime, meta, episodeGroups, episodeSource, recommendations }: Props) {
  const watched = useWatchedSlugs();
  const firstEpisode = episodeGroups.flatMap((g) => g.items)[0];
  const compactMeta = useMemo(() => meta.filter(([, value]) => value && value !== '-' && value !== 'Belum tersedia'), [meta]);

  return <motion.main variants={pageAnim} initial="hidden" animate="show" className="anime-detail-page mx-auto w-full max-w-md px-4 py-6 pb-32 text-[#F0F4FF] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl lg:px-6 lg:py-8">
    <section className="overflow-hidden rounded-[28px] bg-[#191C2D] p-4 shadow-[0_24px_80px_rgba(0,0,0,.34)] ring-1 ring-[#F0F4FF]/[0.06] sm:p-5 lg:rounded-[34px] lg:p-7">
      <div className="anime-detail-layout grid grid-cols-1 gap-5 sm:grid-cols-[150px_1fr] md:grid-cols-[230px_1fr] md:gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[230px] overflow-hidden rounded-xl bg-[#0B0D17] shadow-[0_18px_50px_rgba(0,0,0,.45)] ring-1 ring-[#F0F4FF]/[0.08] sm:max-w-none lg:rounded-2xl">
          {anime.poster ? <Image src={anime.poster} alt={anime.title} fill sizes="(max-width: 640px) 230px, (max-width: 1024px) 230px, 280px" className="object-cover" priority/> : <div className="grid h-full place-items-center text-[#8A92B2]">No Poster</div>}
        </div>

        <div className="min-w-0 self-center">
          <span className="inline-flex rounded-full bg-[#E53935]/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#F0F4FF] ring-1 ring-[#E53935]/25">Detail Anime</span>
          <h1 className="anime-detail-title mt-3 line-clamp-3 text-[32px] font-black leading-[.98] tracking-[-.055em] text-[#F0F4FF] sm:text-[34px] md:text-4xl lg:text-5xl xl:text-[56px]">{anime.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8A92B2] lg:text-base">Lihat sinopsis, genre, studio, status, rating, dan daftar episode sebelum menonton.</p>

          <div className="anime-meta-grid mt-5 divide-y divide-[#F0F4FF]/[0.08] rounded-2xl bg-[#0B0D17]/35 px-4 lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0 lg:px-0">
            {compactMeta.map(([label, value]) => <div key={label} className="grid grid-cols-[116px_1fr] gap-3 py-3 text-sm sm:grid-cols-[150px_1fr] lg:grid-cols-[110px_1fr] lg:px-4">
              <span className="font-bold text-[#8A92B2]">{label}</span>
              <span className="font-semibold leading-6 text-[#F0F4FF]">{value}</span>
            </div>)}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {anime.genres.map((genre) => <Link key={genre.slug} href={`/genre/${genre.slug}`} className="rounded-full bg-[#1f2330] px-3 py-2 text-xs font-black text-[#D1D5DB] transition hover:bg-[#E53935] hover:text-[#F0F4FF]">{genre.name}</Link>)}
          </div>

          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
            {firstEpisode && <motion.div whileTap={{ scale: 0.95 }}><Link className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#E53935] px-5 text-sm font-black text-[#F0F4FF] shadow-[0_14px_30px_rgba(229,57,53,.28)] transition hover:bg-[#FF3366] sm:w-auto" href={`/episode/${firstEpisode.slug}${episodeSource}`}>▶ Tonton Episode Terbaru</Link></motion.div>}
            <motion.button whileTap={{ scale: 0.95 }} type="button" className="min-h-12 rounded-full border border-[#F0F4FF]/20 bg-transparent px-5 text-sm font-black text-[#F0F4FF] transition hover:border-[#E53935] hover:text-[#FF9AB3]">♡ Favorit</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} type="button" className="min-h-12 rounded-full border border-[#F0F4FF]/20 bg-transparent px-5 text-sm font-black text-[#F0F4FF] transition hover:border-[#E53935] hover:text-[#FF9AB3]">Share Anime</motion.button>
          </div>
        </div>
      </div>
    </section>

    <section className="mt-5 rounded-[24px] bg-[#191C2D] p-4 shadow-[0_18px_55px_rgba(0,0,0,.22)] ring-1 ring-[#F0F4FF]/[0.06] sm:px-6 sm:py-5">
      <h2 className="text-2xl font-black tracking-[-.04em] text-[#F0F4FF]">Sinopsis</h2>
      <p className="mt-3 whitespace-pre-line px-0 text-[15px] leading-[1.6] text-[#D1D5DB] sm:px-4">{anime.synopsis || 'Sinopsis belum tersedia dari provider.'}</p>
    </section>

    <section className="mt-7">
      <div className="mb-4">
        <h2 className="text-2xl font-black tracking-[-.04em] text-[#F0F4FF]">Episode List</h2>
        <p className="mt-1 text-sm text-[#8A92B2]">Total {episodeGroups.reduce((total, group) => total + group.items.length, 0)} episode tersedia.</p>
      </div>

      {episodeGroups.map((group) => <div key={group.label} className="mb-4 rounded-[24px] bg-[#191C2D] p-4 ring-1 ring-[#F0F4FF]/[0.06]">
        <h3 className="mb-3 text-lg font-black text-[#F0F4FF]">{group.label}</h3>
        <motion.div variants={listAnim} initial="hidden" animate="show" className="episode-grid-desktop grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {group.items.map((episode, index) => {
            const isWatched = watched.has(episode.slug);
            return <motion.div key={episode.slug} variants={itemAnim} whileTap={{ scale: 0.98 }}>
              <Link href={`/episode/${episode.slug}${episodeSource}`} className={`flex min-h-[58px] items-center justify-between gap-3 rounded-xl px-4 py-3 transition ${isWatched ? 'bg-[#111421] text-[#8A92B2]' : 'bg-[#1f2330] text-[#F0F4FF] hover:bg-[#252A3A]'}`}>
                <div className="min-w-0">
                  <b className="block truncate text-sm font-black">Episode {episode.episode || index + 1}</b>
                  <span className="line-clamp-1 text-xs text-[#8A92B2]">{episode.title}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!isWatched && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-300 ring-1 ring-emerald-400/20">Baru</span>}
                  {isWatched && <span className="rounded-full bg-[#0B0D17] px-2.5 py-1 text-[11px] font-black text-[#8A92B2]">Ditonton</span>}
                  <span className="text-[#E53935]">▶</span>
                </div>
              </Link>
            </motion.div>;
          })}
        </motion.div>
      </div>)}

      {!episodeGroups.length && <div className="rounded-2xl bg-[#191C2D] p-6 text-center text-[#8A92B2]">Daftar episode belum tersedia dari provider ini.</div>}
    </section>

    {recommendations.length > 0 && <section className="mt-7">
      <h2 className="mb-4 text-2xl font-black tracking-[-.04em] text-[#F0F4FF]">Recommendation</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {recommendations.map((rec) => {
          const href = `/anime/${rec.slug || rec.animeId}`;
          return <Link href={href} key={href} className="overflow-hidden rounded-2xl bg-[#191C2D] ring-1 ring-[#F0F4FF]/[0.06] transition hover:-translate-y-1">
            <div className="relative aspect-[3/4] bg-[#0B0D17]">{rec.poster && <Image src={rec.poster} alt={rec.title || 'Recommendation'} fill sizes="160px" className="object-cover"/>}</div>
            <div className="p-3 text-sm font-black leading-snug text-[#F0F4FF]">{rec.title}</div>
          </Link>;
        })}
      </div>
    </section>}
  </motion.main>;
}
