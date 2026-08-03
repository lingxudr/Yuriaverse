import Image from 'next/image';
import Link from 'next/link';
import { detail } from '../../../../services/sansekai/drama';
import type { DramaProvider } from '../../../../services/sansekai/types';

function publicProviderLabel(provider = '', type = '') {
  if (provider === 'drakorid') return /movie/i.test(type) ? 'Drakor Movie' : (/dracin|china/i.test(type) ? 'Dracin' : 'Drakor');
  if (provider === 'dramabox') return 'Short Drama';
  if (provider === 'pinedrama') return 'Mini Series';
  if (provider === 'reelshort') return 'Vertical Drama';
  if (provider === 'shortmax') return 'Short Series';
  if (provider === 'dramanova') return 'Drama Asia';
  return 'Drama';
}

export default async function Page({ params }: { params: Promise<{ provider: string; id: string }> }) {
  const { provider, id } = await params;
  const d = await detail(provider as DramaProvider, id);

  return (
    <main className="wrap" style={{ paddingTop: 42 }}>
      <nav className="breadcrumb">
        <Link href="/">Home</Link><span>/</span><Link href="/drama">Drama</Link><span>/</span><b>{d.title}</b>
      </nav>
      <div className="detail-hero panel">
        <div className="detail">
          <div className="detail-poster">
            {d.poster && (
              <Image
                src={d.poster}
                alt={d.title}
                width={360}
                height={540}
                sizes="(max-width: 640px) 220px, 300px"
                quality={72}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div>
            <span className="live-pill"><span /> {publicProviderLabel(d.provider, d.type)}</span>
            <h1>{d.title}</h1>
            <p className="muted">{d.description || 'Sinopsis belum tersedia dari provider.'}</p>
            <div className="meta-grid">
              {[
                ['Kategori', publicProviderLabel(d.provider, d.type)],
                ['Status', d.status],
                ['Episode', d.episodeCount],
                ['Country', d.country],
                ['Year', d.year]
              ].filter((x) => x[1]).map(([k, v]) => (
                <div className="meta" key={k}><small>{k}</small><b>{v}</b></div>
              ))}
            </div>
            {d.episodes[0] && (
              <Link className="btn big" href={`/drama/${d.provider}/${encodeURIComponent(d.id)}/episode/${d.episodes[0].episode}`}>▶ Tonton Episode 1</Link>
            )}
          </div>
        </div>
      </div>
      <h2>Episode List</h2>
      <div className="episodes">
        {d.episodes.slice(0, 100).map((e) => (
          <Link className="episode-row" key={e.episode} href={`/drama/${d.provider}/${encodeURIComponent(d.id)}/episode/${e.episode}`}>
            <b>{e.title}</b><span className="chip">Episode {e.episode}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
