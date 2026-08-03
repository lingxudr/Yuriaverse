import Link from 'next/link';
import { Bookmark, Play } from 'lucide-react';
import { SafeImage } from './SafeImage';
import type { AnimeCard } from '../lib/types';
export function LatestEpisodes({items}:{items:AnimeCard[]}){return <div className="latest-list">{items.slice(0,8).map((a,i)=><Link href={`/anime/${a.slug}`} className="latest-card" key={a.slug} prefetch={false}><span className="latest-thumb"><SafeImage src={a.poster} alt={a.title} fallbackText={a.title} fill sizes="120px" loading="lazy"/></span><div className="latest-info"><b>{a.title}</b><span>Episode {a.episode||i+1}</span><small>{a.latestRelease||'Update terbaru'} • 24 menit • SUB</small></div><button className="mini-bookmark" aria-label="Bookmark"><Bookmark size={17}/></button><span className="play-float"><Play size={17} fill="currentColor"/></span></Link>)}</div>}
