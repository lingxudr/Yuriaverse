'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LightIcon, type IconName } from './LightIcon';

type PortalLink = { href: string; title: string; desc: string; icon: IconName; badge?: string };
type YuriaItem = { title: string; href: string; poster?: string; badge: string; meta: string; kind: string };
type BotUpdate = { title: string; label: string; href: string; time: string; kind: string };

type ApiResult = { items?: any[]; days?: any[] } | any[] | null;

const links: PortalLink[] = [
  { href: '/anime', title: 'Anime', desc: 'Streaming anime subtitle Indonesia', icon: 'tv', badge: 'Hot' },
  { href: '/donghua', title: 'Donghua', desc: 'Donghua ongoing dan completed', icon: 'sparkles', badge: 'Baru' },
  { href: '/movie', title: 'Movie', desc: 'Film anime dan movie pilihan', icon: 'clapperboard' },
  { href: '/drama', title: 'Drama', desc: 'Drakor, dracin, dan drama Asia', icon: 'film' },
  { href: '/manga', title: 'Manga', desc: 'Baca manga, manhwa, manhua', icon: 'book-open', badge: 'Fresh' }
];

const shortcuts = [
  { href: '/jadwal', title: 'Jadwal Rilis Hari Ini', icon: 'calendar' as IconName },
  { href: '/search', title: 'Rekomendasi Untukmu', icon: 'sparkles' as IconName },
  { href: '/ranking', title: 'Daftar Populer', icon: 'heart' as IconName },
  { href: '/genre', title: 'Genre Anime', icon: 'book-open' as IconName },
  { href: '/manga', title: 'Update Manga', icon: 'bookmark' as IconName }
];

const initialStats = [
  ['Koleksi Aktif', '...', 'grid'],
  ['Provider Aman', '...', 'fire'],
  ['Update Harian', '...', 'clock'],
  ['Terbaik Untukmu', '...', 'gem']
] as const;

async function json(path: string) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(path);
  return res.json();
}
function todayIndex(day = '') {
  const order = ['minggu','senin','selasa','rabu','kamis','jumat','sabtu'];
  const clean = day.toLowerCase().replace(/[^a-z]/g, '').replace('jumat','jumat');
  const idx = order.findIndex((x) => clean.includes(x));
  return idx < 0 ? -1 : idx;
}
function animeHref(x: any, fallback = '') {
  const source = x?.sourceProvider || fallback;
  return `/anime/${encodeURIComponent(x?.slug || '')}${source ? `?source=${encodeURIComponent(source)}` : ''}`;
}
function posterOf(x: any) { return x?.poster || x?.image || x?.cover || x?.thumbnail || ''; }

function Card({ item }: { item: YuriaItem }) {
  return <Link href={item.href} prefetch={false} className="yuria-update-card">
    <div className="yuria-update-poster">
      {item.poster ? <Image src={item.poster} alt={item.title} fill sizes="(max-width:640px) 42vw, 190px" quality={72} className="object-cover"/> : <div className="yuria-empty-poster">✦</div>}
      <span>{item.badge}</span>
      <button aria-label="Bookmark" type="button"><LightIcon name="bookmark" size={15}/></button>
    </div>
    <div className="yuria-update-body"><b>{item.title}</b><small>{item.meta}</small></div>
  </Link>;
}
function Row({ title, items, href }: { title: string; items: YuriaItem[]; href: string }) {
  if (!items.length) return null;
  return <section className="yuria-row"><div className="yuria-section-head"><h2>{title} ✦</h2><Link href={href}>Lihat Semua →</Link></div><div className="yuria-track">{items.map((item, i)=><Card item={item} key={`${item.href}-${i}`}/>)}</div></section>;
}

export function HomeV4() {
  const [stats, setStats] = useState<readonly (readonly [string,string,string])[]>(initialStats);
  const [updates, setUpdates] = useState<YuriaItem[]>([]);
  const [schedule, setSchedule] = useState<YuriaItem[]>([]);
  const [botUpdates, setBotUpdates] = useState<BotUpdate[]>([]);

  useEffect(() => {
    let active = true;
    async function run() {
      const today = new Date().getDay();
      const results = await Promise.allSettled([
        json('/api/category?kind=anime&tab=ongoing&page=1&limit=8'),
        json('/api/category?kind=donghua&tab=ongoing&page=1&limit=8'),
        json('/api/category?kind=movie&tab=all&page=1&limit=8'),
        json('/api/drama?limit=8'),
        json('/api/anime/schedule'),
        json('/api/anime/donghua/schedule'),
        json('/api/manga/latest')
      ]);
      if (!active) return;
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const val = (i: number): ApiResult => results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value?.data : null;
      const anime = (val(0) as any)?.items || [];
      const donghua = (val(1) as any)?.items || [];
      const movie = (val(2) as any)?.items || [];
      const drama = (val(3) as any)?.items || [];
      const manga = Array.isArray(val(6)) ? val(6) as any[] : [];
      const scheduleDays = [...(((val(4) as any)?.days) || []), ...(((val(5) as any)?.days) || [])];
      const todayItems = scheduleDays.filter((d: any) => todayIndex(d.day) === today).flatMap((d: any) => d.items || []).slice(0, 8);
      const updateCards: YuriaItem[] = [
        ...anime.map((x: any) => ({ title: x.title, href: animeHref(x), poster: posterOf(x), badge: 'Anime', meta: x.episode ? `Ep. ${x.episode}` : x.status || 'Update', kind: 'Anime' })),
        ...donghua.map((x: any) => ({ title: x.title, href: animeHref(x, 'donghua'), poster: posterOf(x), badge: 'Donghua', meta: x.episode ? `Ep. ${x.episode}` : x.status || 'Update', kind: 'Donghua' })),
        ...movie.slice(0, 4).map((x: any) => ({ title: x.title, href: animeHref(x, 'samehadaku'), poster: posterOf(x), badge: 'Movie', meta: x.status || 'Movie', kind: 'Movie' })),
        ...drama.slice(0, 4).map((x: any) => ({ title: x.title, href: `/drama/${x.provider}/${encodeURIComponent(x.id)}`, poster: posterOf(x), badge: /dracin|china/i.test(`${x.type} ${x.country}`) ? 'Dracin' : 'Drakor', meta: x.episodeCount ? `${x.episodeCount} EP` : x.status || 'Drama', kind: 'Drama' })),
        ...manga.slice(0, 6).map((x: any) => ({ title: x.title, href: `/manga/${encodeURIComponent(x.id || '')}`, poster: posterOf(x), badge: 'Manga', meta: x.displayChapter || x.latestChapter || x.chapter || 'Chapter terbaru', kind: 'Manga' }))
      ].filter((x) => x.title && x.href);
      const scheduleCards: YuriaItem[] = todayItems.map((x: any) => ({ title: x.title, href: animeHref(x, x.type === 'Donghua' ? 'donghua' : ''), poster: posterOf(x), badge: x.type || 'Schedule', meta: x.episode ? `Ep. ${x.episode}` : x.status || 'Hari ini', kind: 'Schedule' }));
      const bot: BotUpdate[] = updateCards.slice(0, 12).map((x) => ({ title: x.title, label: `Update: ${x.title} ${x.meta}`.trim(), href: x.href, time: x.meta || 'baru', kind: x.kind }));
      const collection = anime.length + donghua.length + movie.length + drama.length + manga.length;
      setUpdates(updateCards.slice(0, 24));
      setSchedule(scheduleCards.slice(0, 8));
      setBotUpdates(bot);
      setStats([
        ['Koleksi Aktif', String(collection || 0), 'grid'],
        ['Provider Aman', `${ok}/7`, 'fire'],
        ['Update Harian', String(todayItems.length || 0), 'clock'],
        ['Terbaik Untukmu', 'Yuria+', 'gem']
      ]);
    }
    run().catch(() => undefined);
    return () => { active = false; };
  }, []);

  const hero = useMemo(() => updates[0], [updates]);

  return <main className="yuria-home">
    <div className="yuria-stars" aria-hidden="true" />
    <aside className="yuria-sidebar" aria-label="YuriaVerse navigation">
      <Link href="/" className="yuria-logo"><span className="yuria-mark"><Image src="/brand/yuriaverse/crystal-logo-v2.webp" alt="" width={52} height={52}/></span><b>YuriaVerse</b><small>ユリアバース</small></Link>
      <nav>{links.map((item)=><Link key={item.href} href={item.href}><LightIcon name={item.icon} size={18}/><span>{item.title}</span></Link>)}</nav>
      <div className="yuria-premium"><Image src="/brand/yuriaverse/mascot-v2.webp" alt="Yuria" width={96} height={96}/><b>Selamat Datang</b><p>Yuria akan menemanimu menjelajahi dunia anime.</p></div>
    </aside>

    <aside className="yuria-showcase" aria-label="YuriaVerse preview">
      <div className="showcase-logo"><Image src="/brand/yuriaverse/crystal-logo-v2.webp" alt="" width={64} height={64}/><b>YuriaVerse</b><small>ユリアバース</small></div>
      <section className="showcase-panel"><h3>Rebranding Animesu menjadi <span>YuriaVerse</span></h3><p>Dunia anime tanpa batas, bersama Yuria.</p></section>
      <section className="phone-preview"><div className="phone-shell"><div className="phone-screen"><Image src="/brand/yuriaverse/mascot-v2.webp" alt="Yuria mobile" width={160} height={220}/><b>Dunia Anime Tanpa Batas</b><span>Jelajahi Sekarang ✦</span><div className="phone-icons">{links.slice(0,4).map((x)=><i key={x.title}><LightIcon name={x.icon} size={18}/><small>{x.title}</small></i>)}</div></div></div></section>
      <section className="showcase-panel list"><h3>Perubahan Desain</h3><p>✿ Desain lebih premium</p><p>● Warna ungu elegan</p><p>✦ UI/UX lebih clean</p><p>♛ Maskot Yuria</p></section>
      <section className="showcase-panel mascot-card"><Image src="/brand/yuriaverse/mascot-v2.webp" alt="Yuria" width={190} height={190}/><p>Akan menemanimu menjelajahi dunia anime!</p></section>
    </aside>

    <section className="yuria-main">
      <header className="yuria-topbar"><form action="/search"><input name="q" placeholder="Cari anime, donghua, movie..."/><button><LightIcon name="search" size={20}/></button></form><Link href="/profile" className="yuria-avatar"><Image src="/brand/yuriaverse/mascot-v2.webp" alt="Yuria avatar" fill sizes="42px"/></Link></header>

      <section className="yuria-hero">
        <div className="yuria-crystals" aria-hidden="true">✦ ✧ ◆ ✦</div>
        <div className="yuria-copy"><span>#1 Premium Anime Portal</span><h1>Dunia Anime Tanpa Batas, Bersama Yuria.</h1><p>{hero?.title ? `Sedang hangat: ${hero.title}. ` : ''}Nonton anime, donghua, movie, drama, dan baca manga favoritmu dalam portal ringan, cepat, dan premium.</p><div><Link href="/anime" className="yuria-primary">Jelajahi Sekarang ✦</Link><Link href="/jadwal" className="yuria-secondary">Lihat Jadwal</Link></div></div>
        <div className="yuria-mascot"><Image src="/brand/yuriaverse/mascot-v2.webp" alt="Yuria mascot" fill priority sizes="(max-width: 768px) 70vw, 520px"/></div>
      </section>

      <section className="yuria-stats">{stats.map(([label,value,tone])=><article key={label} className={String(tone)}><b>{value}</b><span>{label}</span></article>)}</section>

      <section className="yuria-worlds"><div className="yuria-section-head"><h2>Pilih Dunia Kamu ✦</h2><Link href="/search">Lihat Semua →</Link></div><div className="yuria-world-grid">{links.map((item)=><Link href={item.href} key={item.href} className="yuria-world-card"><i><LightIcon name={item.icon} size={30}/></i><strong>{item.title}</strong><small>{item.desc}</small><em>→</em></Link>)}</div></section>

      <Row title="Update Terbaru" items={updates.slice(0, 12)} href="/search" />
      <Row title="Sedang Tayang" items={updates.filter((x)=>x.kind==='Anime' || x.kind==='Donghua').slice(0, 12)} href="/anime" />
      <Row title="Jadwal Rilis Hari Ini" items={schedule} href="/jadwal" />

      <section className="bot-board-wrap" aria-label="Bot Animesu updates"><h2>Daftar Update Animesu ↓</h2><div className="bot-board"><div className="bot-board-head">Update Anime, Donghua & Manga Cepat</div><div className="bot-list">{(botUpdates.length ? botUpdates : links.slice(0, 6).map((x) => ({ title: x.title, label: `Buka ${x.title} terbaru`, href: x.href, time: 'siap', kind: x.title }))).map((item, index) => <Link href={item.href} prefetch={false} className="bot-row" key={`${item.href}-${index}`}><span className="bot-avatar"><Image src="/brand/yuriaverse/mascot-v2.webp" alt="Bot Animesu" width={44} height={44}/></span><span className="bot-text"><b>Bot Animesu</b><em>{item.label}</em></span><time>{item.time}</time></Link>)}</div><div className="bot-board-foot">🐾 Simpan link <b>animesu.vercel.app</b> 🐶 🐾</div></div><div className="bot-logo"><span>ANIMESU</span><Image src="/brand/yuriaverse/mascot-v2.webp" alt="" width={72} height={72}/></div></section>

      <section className="yuria-shortcuts">{shortcuts.map((item)=><Link href={item.href} key={item.href}><LightIcon name={item.icon} size={22}/><span>{item.title}</span></Link>)}</section>

      <section className="yuria-transform" aria-label="Transformasi brand">
        <div><b>ANIMESU</b><span>Sederhana, fungsional</span></div><strong>→→→</strong><div><b>YuriaVerse</b><span>Premium, modern, berkarakter</span></div><strong>✦</strong><div><b>Dunia Baru</b><span>Pengalaman lebih nyaman & cepat</span></div><Image src="/brand/yuriaverse/mascot-v2.webp" alt="Yuria" width={120} height={120}/>
      </section>
    </section>

    <style jsx global>{`
      body:has(.yuria-home){background:#080914!important}.yuria-home{position:relative;min-height:100vh;overflow:hidden;background:#080914;color:#f7f3ff;padding:20px 0 120px}.yuria-stars{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 70% 0%,rgba(139,92,246,.34),transparent 28%),radial-gradient(circle at 20% 20%,rgba(192,132,252,.22),transparent 24%),linear-gradient(rgba(168,85,247,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(168,85,247,.08) 1px,transparent 1px);background-size:auto,auto,44px 44px,44px 44px}.yuria-home:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,#c4b5fd 0 1px,transparent 1.8px),radial-gradient(circle,#fff 0 1px,transparent 1.8px);background-size:120px 120px,190px 190px;opacity:.42;animation:yuriaFloat 24s linear infinite}@media(min-width:1024px){body:has(.yuria-home) .mobile-first-header{display:none!important}}body:has(.yuria-home) .footer.footer-minimal{background:#080914!important;border-top:1px solid rgba(196,181,253,.12)!important}.yuria-sidebar{position:fixed;left:18px;top:18px;bottom:18px;z-index:5;width:230px;border:1px solid rgba(196,181,253,.22);border-radius:28px;background:rgba(8,9,20,.72);backdrop-filter:blur(22px);box-shadow:0 0 60px rgba(124,58,237,.16);padding:18px;display:flex;flex-direction:column}.yuria-logo{display:grid;text-align:center;text-decoration:none;color:#fff;margin-bottom:18px}.yuria-logo .yuria-mark{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 4px;border-radius:18px;background:rgba(124,58,237,.14);box-shadow:0 0 28px rgba(168,85,247,.35)}.yuria-logo .yuria-mark img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 14px rgba(192,132,252,.75))}.yuria-logo b{font-family:serif;font-size:28px}.yuria-logo small{color:#c4b5fd}.yuria-sidebar nav{display:grid;gap:8px}.yuria-sidebar nav a{display:flex;align-items:center;gap:12px;border-radius:14px;padding:12px;color:#d8ccff;text-decoration:none;font-weight:800}.yuria-sidebar nav a:hover,.yuria-sidebar nav a:first-child{background:linear-gradient(90deg,rgba(124,58,237,.75),rgba(168,85,247,.22));color:#fff}.yuria-premium{margin-top:auto;border:1px solid rgba(196,181,253,.18);border-radius:20px;background:linear-gradient(145deg,rgba(124,58,237,.18),rgba(15,23,42,.82));padding:14px;text-align:center}.yuria-premium img{object-fit:contain}.yuria-premium b{display:block}.yuria-premium p{color:#b7a8de;font-size:12px;line-height:1.5}.yuria-main{position:relative;z-index:2;width:min(1180px,calc(100vw - 300px));margin-left:280px}.yuria-topbar{display:flex;justify-content:space-between;gap:16px;margin-bottom:18px}.yuria-topbar form{display:flex;align-items:center;gap:10px;flex:1;border:1px solid rgba(196,181,253,.18);border-radius:999px;background:rgba(17,17,34,.72);padding:7px 8px 7px 18px;backdrop-filter:blur(16px)}.yuria-topbar input{flex:1;border:0;background:transparent;color:#fff;outline:0}.yuria-topbar button{display:grid;width:40px;height:40px;place-items:center;border:0;border-radius:50%;background:rgba(168,85,247,.22);color:#fff}.yuria-avatar{position:relative;width:48px;height:48px;border-radius:50%;overflow:hidden;border:1px solid rgba(196,181,253,.4);background:#12091f}.yuria-hero{position:relative;min-height:500px;overflow:hidden;border:1px solid rgba(196,181,253,.22);border-radius:32px;background:linear-gradient(135deg,rgba(13,9,28,.90),rgba(30,14,60,.78)),url('/brand/yuriaverse/hero-v2.webp') center/cover;box-shadow:0 30px 100px rgba(124,58,237,.22);display:grid;grid-template-columns:1fr 520px;align-items:center;padding:46px}.yuria-hero:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 68% 40%,rgba(168,85,247,.28),transparent 32%),linear-gradient(90deg,rgba(8,9,20,.94),rgba(8,9,20,.28));pointer-events:none}.yuria-copy,.yuria-mascot{position:relative;z-index:2}.yuria-copy span{color:#c084fc;font-weight:1000}.yuria-copy h1{max-width:620px;margin:14px 0;color:#fff;font-family:serif;font-size:clamp(42px,6vw,74px);line-height:.92;text-shadow:0 0 26px rgba(168,85,247,.5)}.yuria-copy p{max-width:560px;color:#d8ccff;font-size:17px;line-height:1.75}.yuria-copy div{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.yuria-primary,.yuria-secondary{display:inline-flex;min-height:48px;align-items:center;border-radius:999px;padding:0 20px;text-decoration:none;font-weight:1000}.yuria-primary{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;box-shadow:0 14px 38px rgba(124,58,237,.34)}.yuria-secondary{border:1px solid rgba(196,181,253,.26);color:#fff;background:rgba(255,255,255,.06)}.yuria-mascot{height:480px}.yuria-mascot img{object-fit:contain;filter:drop-shadow(0 0 34px rgba(168,85,247,.55))}.yuria-crystals{position:absolute;right:32px;top:20px;z-index:3;color:#c084fc;font-size:42px;letter-spacing:10px;text-shadow:0 0 28px #a855f7}.yuria-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.yuria-stats article,.yuria-world-card,.yuria-shortcuts a,.yuria-update-card{border:1px solid rgba(196,181,253,.16);border-radius:20px;background:rgba(17,17,34,.72);backdrop-filter:blur(18px);box-shadow:0 18px 60px rgba(0,0,0,.22)}.yuria-stats article{padding:18px}.yuria-stats b{display:block;color:#fff;font-size:24px}.yuria-stats span{color:#b7a8de;font-size:13px;font-weight:800}.yuria-section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:34px 0 16px}.yuria-section-head h2{margin:0;color:#fff}.yuria-section-head a{color:#c084fc;text-decoration:none;font-weight:900}.yuria-world-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.yuria-world-card{position:relative;overflow:hidden;min-height:190px;padding:18px;color:#fff;text-decoration:none}.yuria-world-card:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(124,58,237,.18),transparent),url('/brand/yuriaverse/card-pattern.webp') center/cover;opacity:.34}.yuria-world-card>*{position:relative}.yuria-world-card i{display:grid;width:56px;height:56px;place-items:center;border-radius:16px;background:rgba(124,58,237,.34);color:#d8b4fe;font-style:normal}.yuria-world-card strong{display:block;margin-top:18px;font-size:18px}.yuria-world-card small{display:block;margin-top:8px;color:#c8b8e8;line-height:1.4}.yuria-world-card em{position:absolute;bottom:16px;right:16px;font-style:normal;color:#c084fc}.yuria-track{display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:12px}.yuria-track::-webkit-scrollbar{display:none}.yuria-update-card{flex:0 0 160px;overflow:hidden;color:#fff;text-decoration:none}.yuria-update-poster{position:relative;aspect-ratio:2/3;background:#111018}.yuria-update-poster span{position:absolute;left:8px;top:8px;border-radius:999px;background:#7c3aed;color:#fff;padding:4px 8px;font-size:10px;font-weight:1000}.yuria-update-poster button{position:absolute;right:8px;top:8px;display:grid;width:30px;height:30px;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(8,9,20,.6);color:#fff}.yuria-empty-poster{display:grid;height:100%;place-items:center;color:#c084fc;font-size:34px}.yuria-update-body{padding:11px}.yuria-update-body b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;line-height:1.25}.yuria-update-body small{display:block;margin-top:6px;color:#b7a8de;font-size:11px;font-weight:800}.bot-board-wrap{position:relative;z-index:3;width:min(820px,100%);margin:38px auto 0;text-align:center}.bot-board-wrap h2{margin:0 0 18px;color:#22d3ee;font-size:clamp(30px,5vw,44px);font-weight:1000;letter-spacing:-.04em;text-shadow:0 0 18px rgba(34,211,238,.35)}.bot-board{overflow:hidden;border:4px solid #16b9d2;border-radius:8px;background:#11101a}.bot-board-head{background:#16b9d2;color:#071323;padding:14px 16px;font-size:18px;font-weight:1000}.bot-list{max-height:620px;overflow:auto}.bot-row{display:grid;grid-template-columns:54px minmax(0,1fr) 82px;gap:10px;align-items:start;border-bottom:5px solid #171621;background:#12111a;padding:9px 10px;text-align:left;text-decoration:none;color:#fff}.bot-avatar{display:grid;width:48px;height:48px;place-items:center;overflow:hidden;border:2px solid #16b9d2;background:#071323}.bot-avatar img{width:100%;height:100%;object-fit:cover}.bot-text{min-width:0;display:grid;gap:2px}.bot-text b{color:#fde047;font-size:18px;line-height:1;font-weight:900}.bot-text em{display:block;color:#19b6c9;font-size:18px;line-height:1.28;font-style:normal}.bot-row time{color:#8b8a94;font-size:14px;text-align:right;white-space:nowrap}.bot-board-foot{padding:14px;background:#161520;color:#f8fafc;font-size:17px}.bot-board-foot b{color:#22d3ee}.bot-logo{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:24px;color:#22d3ee;font-size:38px;font-weight:1000;letter-spacing:.04em;text-shadow:0 0 8px #22d3ee}.yuria-shortcuts{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:34px}.yuria-shortcuts a{display:flex;align-items:center;gap:10px;min-height:64px;padding:12px;color:#fff;text-decoration:none}.yuria-shortcuts svg{color:#c084fc}@keyframes yuriaFloat{to{transform:translateY(220px)}}@media(max-width:1100px){.yuria-sidebar{display:none}.yuria-main{width:min(1180px,92vw);margin:auto}.yuria-hero{grid-template-columns:1fr;min-height:620px}.yuria-mascot{height:360px;order:-1}.yuria-world-grid{grid-template-columns:repeat(2,1fr)}.yuria-stats,.yuria-shortcuts{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.yuria-home{padding-top:118px}.yuria-topbar{display:none}.yuria-hero{padding:22px;min-height:590px;border-radius:26px}.yuria-copy h1{font-size:42px}.yuria-copy div{display:grid}.yuria-mascot{height:300px}.yuria-world-grid{grid-template-columns:1fr}.bot-row{grid-template-columns:46px minmax(0,1fr) 68px}.bot-avatar{width:42px;height:42px}.bot-text b,.bot-text em{font-size:16px}.bot-row time{font-size:12px}.bot-list{max-height:560px}.bot-logo{font-size:30px}.yuria-stats,.yuria-shortcuts{grid-template-columns:1fr}}
      .yuria-showcase{display:none}.showcase-logo,.showcase-panel,.phone-preview,.yuria-transform{border:1px solid rgba(196,181,253,.18);border-radius:22px;background:rgba(17,17,34,.72);backdrop-filter:blur(18px);box-shadow:0 18px 60px rgba(0,0,0,.22)}.showcase-logo{display:grid;place-items:center;text-align:center;padding:22px;color:#fff}.showcase-logo img{filter:drop-shadow(0 0 18px rgba(192,132,252,.8))}.showcase-logo b{font-family:serif;font-size:32px}.showcase-logo small{color:#c4b5fd}.showcase-panel{padding:20px;color:#d8ccff}.showcase-panel h3{margin:0 0 10px;color:#fff;font-size:18px}.showcase-panel h3 span{display:block;color:#c084fc;font-family:serif;font-size:30px}.showcase-panel p{margin:8px 0;color:#c8b8e8;line-height:1.5}.showcase-panel.list p{font-weight:800}.phone-preview{display:grid;place-items:center;padding:22px}.phone-shell{width:210px;height:410px;border:8px solid #121124;border-radius:34px;background:#05050b;box-shadow:0 0 40px rgba(124,58,237,.25);padding:10px}.phone-screen{height:100%;overflow:hidden;border-radius:24px;background:linear-gradient(180deg,rgba(30,14,60,.82),rgba(8,9,20,.96)),url('/brand/yuriaverse/hero-v2.webp') center/cover;padding:16px;text-align:center}.phone-screen img{object-fit:contain;filter:drop-shadow(0 0 22px rgba(168,85,247,.6))}.phone-screen b{display:block;margin-top:4px;color:#fff;font-family:serif;font-size:22px;line-height:1.1}.phone-screen>span{display:inline-flex;margin-top:10px;border-radius:999px;background:#7c3aed;color:#fff;padding:8px 12px;font-size:12px;font-weight:900}.phone-icons{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}.phone-icons i{display:grid;place-items:center;gap:4px;border-radius:12px;background:rgba(124,58,237,.25);padding:8px 3px;color:#d8b4fe;font-style:normal}.phone-icons small{font-size:9px;color:#fff}.mascot-card{text-align:center}.mascot-card img{object-fit:contain;filter:drop-shadow(0 0 24px rgba(168,85,247,.55))}.yuria-transform{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:34px;padding:20px}.yuria-transform div{display:grid;gap:5px}.yuria-transform b{color:#fff;font-size:24px;font-family:serif}.yuria-transform span{color:#b7a8de;font-size:13px}.yuria-transform strong{color:#a855f7;font-size:28px;text-shadow:0 0 18px #a855f7}.yuria-transform img{margin-left:auto;object-fit:contain;filter:drop-shadow(0 0 20px rgba(168,85,247,.6))}@media(min-width:1420px){.yuria-showcase{position:fixed;right:18px;top:18px;bottom:18px;z-index:5;width:330px;display:grid;grid-template-rows:auto auto 1fr auto auto;gap:14px;overflow:auto;scrollbar-width:none}.yuria-showcase::-webkit-scrollbar{display:none}.yuria-main{width:calc(100vw - 660px);max-width:980px}}@media(max-width:780px){.yuria-transform{display:none}}
    `}</style>
  </main>;
}
