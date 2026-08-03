'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Download, HardDrive, Server } from 'lucide-react';
import { Player } from '../Player';
import type { DownloadLink, EpisodeDetail } from '../../lib/types';

type Props = {
  episode: EpisodeDetail;
  slug: string;
  qs: string;
  detailHref: string;
  groups: [string, DownloadLink[]][];
};

const pageAnim: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

function GhostLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <motion.div whileTap={{ scale: 0.95 }} className="min-w-0 flex-1 sm:flex-none">
    <Link href={href} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#F0F4FF]/20 bg-transparent px-4 text-sm font-black text-[#F0F4FF] transition hover:border-[#E53935] hover:text-[#FF9AB3] sm:w-auto">
      {children}
    </Link>
  </motion.div>;
}

function DownloadCard({ link, quality }: { link: DownloadLink; quality: string }) {
  return <motion.a
    whileTap={{ scale: 0.95 }}
    href={link.url}
    target="_blank"
    rel="noreferrer"
    download
    className="group rounded-2xl bg-[#191C2D] p-4 shadow-[0_16px_42px_rgba(0,0,0,.22)] ring-1 ring-[#F0F4FF]/[0.06] transition hover:-translate-y-1 hover:ring-[#E53935]/40"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-2xl font-black tracking-[-.04em] text-[#F0F4FF]">{quality}</h3>
        <p className="mt-1 text-sm font-bold text-[#8A92B2]">{link.size || 'Ukuran N/A'}</p>
      </div>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E53935]/15 text-[#FF9AB3] ring-1 ring-[#E53935]/20"><Download size={18}/></span>
    </div>
    <div className="mt-4 flex items-center gap-2 text-xs font-black text-[#D1D5DB]">
      <Server size={14}/>
      <span className="truncate">{link.server || 'Provider'}</span>
    </div>
  </motion.a>;
}

export function WatchPageView({ episode, slug, qs, detailHref, groups }: Props) {
  return <motion.main variants={pageAnim} initial="hidden" animate="show" className="watch-page mx-auto w-[min(1040px,92vw)] py-5 pb-32 text-[#F0F4FF] sm:py-7">
    <section className="overflow-hidden rounded-[22px] bg-[#0B0D17] ring-1 ring-[#F0F4FF]/[0.06] sm:rounded-[26px]">
      <div className="border-b border-[#191C2D] px-1 pb-3 sm:px-0 sm:pb-4">
        <h1 className="watch-title text-[28px] font-black leading-[.98] tracking-[-.055em] text-[#F0F4FF] sm:text-2xl md:text-3xl">{episode.title}</h1>
      </div>
      <div className="mt-4">
        <Player servers={episode.servers} title={episode.title} slug={slug} nextEpisode={episode.nextEpisode ? `${episode.nextEpisode}${qs}` : undefined}/>
      </div>
    </section>

    <nav className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap" aria-label="Episode navigation">
      {episode.previousEpisode && <GhostLink href={`/episode/${episode.previousEpisode}${qs}`}>← Prev</GhostLink>}
      {episode.animeSlug && <GhostLink href={detailHref}>Detail Anime</GhostLink>}
      {episode.nextEpisode && <GhostLink href={`/episode/${episode.nextEpisode}${qs}`}>Next →</GhostLink>}
    </nav>

    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-[-.04em] text-[#F0F4FF]">Download untuk Offline Viewing</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8A92B2]">Pilih resolusi dan provider download. File akan dibuka di tab provider terkait.</p>
        </div>
        <HardDrive className="hidden text-[#E53935] sm:block" size={28}/>
      </div>

      {groups.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {groups.flatMap(([quality, links]) => links.map((link, index) => <DownloadCard key={`${quality}-${link.server}-${index}`} link={link} quality={quality}/>))}
      </div> : <div className="rounded-2xl bg-[#191C2D] p-6 text-center text-[#8A92B2]">Link download tidak tersedia.</div>}
    </section>
  </motion.main>;
}
