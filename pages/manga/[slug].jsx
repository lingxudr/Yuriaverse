import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

function slugify(value = '') { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function proxyImage(url = '', title = 'Comic', type = 'Cover') { return `/api/manga/poster?url=${encodeURIComponent(url || '')}&title=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}`; }
function encodeReaderId(url = '') { try { return btoa(unescape(encodeURIComponent(url))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); } catch { return encodeURIComponent(url); } }
function chapterNumber(name = '') { const m = String(name).match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; }
function readKey(url='') { return `animesu:manga:read:${url}`; }
function continueKey(id='') { return `animesu:manga:continue:${id}`; }
function mirrorQuery(item) { try { const mirrors = Array.isArray(item?.mirrors) ? item.mirrors.slice(0,6) : []; return mirrors.length ? `&mirrors=${encodeURIComponent(JSON.stringify(mirrors))}` : ''; } catch { return ''; } }

const EMPTY_DETAIL = { synopsis: '', genres: [], status: '', chapters: [], title: '', cover: '', author: '', artist: '', alternativeTitles: '', rating: '', views: '', releaseYear: '', type: '', latestChapter: '' };

export default function MangaDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [comic, setComic] = useState(null);
  const [detail, setDetail] = useState(EMPTY_DETAIL);
  const [coverSrc, setCoverSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chapters');
  const [expandedSynopsis, setExpandedSynopsis] = useState(false);
  const [chapterQuery, setChapterQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(30);
  const chapterSentinelRef = useRef(null);
  const [readMap, setReadMap] = useState({});
  const [continueData, setContinueData] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    Promise.allSettled([
      fetch('/api/manga/latest', { cache: 'no-store' }).then((res) => res.ok ? res.json() : null),
      fetch('/data/latest-manga.json', { cache: 'no-store' }).then((res) => res.ok ? res.json() : [])
    ])
      .then((results) => {
        if (!active) return;
        const live = results[0].status === 'fulfilled' && Array.isArray(results[0].value?.data) ? results[0].value.data : [];
        const saved = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
        const list = [...live, ...saved];
        const currentSlug = String(slug || '');
        const found = list.find((item) => {
          const idSlug = String(item?.id || '');
          const titleSlug = slugify(item?.title || '');
          const urlSlug = slugify(item?.detailUrl || '');
          return idSlug === currentSlug || titleSlug === currentSlug || urlSlug === currentSlug;
        });
        setComic(found || null);
        if (found?.id) {
          try { setContinueData(JSON.parse(localStorage.getItem(continueKey(found.id)) || 'null')); } catch {}
        }
      })
      .catch(() => active && setComic(null))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!comic?.detailUrl) { setDetail(EMPTY_DETAIL); setDetailLoading(false); return; }
    let active = true;
    setDetailLoading(true);
    fetch(`/api/scrape-detail?url=${encodeURIComponent(comic.detailUrl)}&title=${encodeURIComponent(comic.title || '')}${mirrorQuery(comic)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('detail failed'))))
      .then(async (json) => {
        if (!active) return;
        const data = json?.data || EMPTY_DETAIL;
        setDetail(data);
        const firstCover = data.cover || data.coverUrl || data.thumbnail || data.thumbnailUrl || data.poster || data.image || data.imageUrl || comic.image || comic.cover || comic.poster || '';
        if (firstCover) setCoverSrc(proxyImage(firstCover, data.title || comic.title, 'Cover'));
        const firstChapter = Array.isArray(data.chapters) ? data.chapters[0] : null;
        if (!firstCover && firstChapter?.url) {
          const chapter = await fetch(`/api/scrape-chapter?url=${encodeURIComponent(firstChapter.url)}&title=${encodeURIComponent(title || comic.title || '')}&chapterName=${encodeURIComponent(firstChapter.name || '')}${mirrorQuery(comic).replace('&mirrors=', '&detailMirrors=')}`).then((r)=>r.ok?r.json():null).catch(()=>null);
          const img = chapter?.images?.[0];
          if (active && img) setCoverSrc(proxyImage(img, data.title || comic.title, 'Cover'));
        }
        try {
          const map = {};
          (data.chapters || []).forEach((chapter) => { const saved = localStorage.getItem(readKey(chapter.url)); if (saved) map[chapter.url] = JSON.parse(saved); });
          setReadMap(map);
        } catch {}
      })
      .catch(() => active && setDetail(EMPTY_DETAIL))
      .finally(() => active && setDetailLoading(false));
    return () => { active = false; };
  }, [comic?.detailUrl]);

  const chapters = useMemo(() => (Array.isArray(detail?.chapters) ? detail.chapters.filter((chapter)=>!/baca di sumber asli/i.test(String(chapter?.name||''))) : []), [detail]);
  const genres = useMemo(() => (Array.isArray(detail?.genres) ? detail.genres : []), [detail]);
  const title = detail.title || comic?.title || '';
  const altTitle = detail.alternativeTitles || detail.alternativeTitle || '';
  const latestChapter = chapters[0];
  const firstChapter = chapters[chapters.length - 1];
  const readTarget = continueData?.url || latestChapter?.url || comic?.detailUrl || '';
  const readNowHref = readTarget ? `/manga/read/${encodeReaderId(readTarget)}?back=${encodeURIComponent(String(slug || ''))}&title=${encodeURIComponent(title)}` : '#';
  const firstHref = firstChapter?.url ? `/manga/read/${encodeReaderId(firstChapter.url)}?back=${encodeURIComponent(String(slug || ''))}&title=${encodeURIComponent(title)}` : readNowHref;

  const filteredChapters = useMemo(() => {
    const q = chapterQuery.trim().toLowerCase();
    const list = chapters.filter((chapter) => !q || String(chapter.name || '').toLowerCase().includes(q) || String(chapterNumber(chapter.name)).includes(q));
    return [...list].sort((a,b) => sort === 'newest' ? chapterNumber(b.name) - chapterNumber(a.name) : chapterNumber(a.name) - chapterNumber(b.name));
  }, [chapters, chapterQuery, sort]);
  const visibleChapters = filteredChapters.slice(0, visibleCount);

  useEffect(() => { setVisibleCount(30); }, [chapterQuery, sort]);

  useEffect(() => {
    const el = chapterSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => Math.min(count + 30, filteredChapters.length));
      }
    }, { rootMargin: '650px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredChapters.length]);

  if (loading || detailLoading) return <main className="min-h-screen bg-[#0B0D17] p-4 text-white"><div className="mx-auto max-w-5xl animate-pulse rounded-[28px] border border-white/10 bg-[#191C2D] p-6 text-gray-300">Memuat detail manga...</div></main>;
  if (!comic) return <main className="min-h-screen bg-[#0B0D17] p-4 text-white"><button onClick={() => router.push('/manga')} className="mb-4 flex min-h-11 items-center gap-2 text-gray-400 hover:text-white">&lt; Kembali ke Manga</button><div className="mx-auto max-w-md rounded-2xl border border-gray-700 bg-[#191C2D] p-5 text-center"><h1 className="text-2xl font-bold text-white">Komik tidak ditemukan</h1></div></main>;

  return <main className="manga-detail-page min-h-screen bg-[#06111f] p-4 pb-28 text-white">
    <div className="mx-auto max-w-6xl">
      <button onClick={() => router.push('/manga')} className="mb-4 flex min-h-11 items-center gap-2 text-gray-400 hover:text-white" type="button">&lt; Kembali ke Manga</button>
      <section className="relative overflow-hidden rounded-[34px] border border-cyan-200/20 bg-[#0d1b2e]/90 shadow-[0_28px_100px_rgba(56,189,248,.14)] ring-1 ring-cyan-300/10 backdrop-blur-xl">
        {coverSrc && <Image src={coverSrc} alt="" aria-hidden="true" fill sizes="100vw" quality={50} className="scale-110 object-cover opacity-25 blur-3xl" />}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(125,211,252,.22),transparent_30%),linear-gradient(135deg,rgba(6,17,31,.92),rgba(15,23,42,.82),rgba(8,47,73,.72))]" /><div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle,rgba(255,255,255,.75)_0_1px,transparent_1.6px)] [background-size:70px_70px]" />
        <div className="relative grid gap-5 p-5 md:grid-cols-[280px_1fr] md:p-7">
          {coverSrc && <div className="relative mx-auto aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-2xl border border-gray-700 bg-[#0B0D17] shadow-2xl md:max-w-[260px]"><Image src={coverSrc} alt={title} fill sizes="(max-width: 768px) 220px, 260px" quality={72} className="object-contain" onError={()=>setCoverSrc('')} /></div>}
          <div className="flex min-w-0 flex-col justify-center">
            <div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">❄ Manga Frost</span>{detail.status && <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">{detail.status}</span>}{detail.rating && <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-bold text-gray-200">⭐ {detail.rating}</span>}{detail.views && <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-bold text-gray-200">👁 {detail.views}</span>}</div>
            <h1 className="text-3xl font-black leading-none tracking-[-.05em] text-white md:text-5xl">{title}</h1>
            {altTitle && <p className="mt-3 text-sm leading-6 text-gray-300">{altTitle}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl border border-cyan-200/10 bg-[#06111f]/45 p-4 text-sm text-gray-300 md:grid-cols-3">
              {detail.author && <span><b className="text-white">Author</b><br/>{detail.author}</span>}
              {detail.artist && <span><b className="text-white">Artist</b><br/>{detail.artist}</span>}
              {detail.releaseYear && <span><b className="text-white">Year</b><br/>{detail.releaseYear}</span>}
              <span><b className="text-white">Chapters</b><br/>{chapters.length}</span>
              {latestChapter && <span><b className="text-white">Latest</b><br/>{latestChapter.name}</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">{genres.map((g)=><span key={g} className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-200">{g}</span>)}</div>
            <div className="mt-6 grid grid-cols-2 gap-3"><a href={readNowHref} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-5 text-sm font-black text-white no-underline hover:bg-[#2563EB] active:scale-[.98]">Continue Reading →</a><a href={firstHref} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-gray-700 bg-white/5 px-5 text-sm font-black text-white no-underline hover:bg-white/10 active:scale-[.98]">Read First</a></div>
          </div>
        </div>
      </section>

      <nav className="mt-5 flex gap-2 overflow-x-auto rounded-3xl border border-cyan-200/10 bg-[#0d1b2e]/60 p-2 pb-2 [scrollbar-width:none] backdrop-blur-xl [&::-webkit-scrollbar]:hidden">{['chapters','synopsis','information'].map((tab)=><button key={tab} onClick={()=>setActiveTab(tab)} className={`min-h-11 rounded-full px-5 text-sm font-black capitalize ${activeTab===tab?'bg-red-500 text-white':'bg-[#191C2D] text-gray-300 border border-gray-800'}`}>{tab}</button>)}</nav>

      {activeTab === 'synopsis' && <section className="mt-5 rounded-3xl border border-gray-700 bg-[#191C2D] p-5"><h2 className="mb-3 text-xl font-black text-white">Synopsis</h2><p className={`text-sm leading-relaxed text-gray-300 ${expandedSynopsis?'':'line-clamp-5'}`}>{detail.synopsis}</p><button onClick={()=>setExpandedSynopsis(!expandedSynopsis)} className="mt-3 text-sm font-black text-red-400">{expandedSynopsis?'Show Less':'Show More'}</button></section>}
      {activeTab === 'information' && <section className="mt-5 grid gap-3 rounded-3xl border border-gray-700 bg-[#191C2D] p-5 text-sm text-gray-300 md:grid-cols-2"><span>Title: <b className="text-white">{title}</b></span><span>Status: <b className="text-white">{detail.status || '-'}</b></span><span>Author: <b className="text-white">{detail.author || '-'}</b></span><span>Artist: <b className="text-white">{detail.artist || '-'}</b></span><span>Rating: <b className="text-white">{detail.rating || '-'}</b></span><span>Views: <b className="text-white">{detail.views || '-'}</b></span></section>}
      {activeTab === 'chapters' && <section className="mt-5"><div className="mb-4 flex flex-col gap-3 rounded-3xl border border-cyan-200/10 bg-[#0d1b2e]/80 p-4 shadow-[0_18px_60px_rgba(56,189,248,.08)] md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-black text-white">📖 Chapters</h2><p className="text-sm text-gray-400">Total {filteredChapters.length} chapters • tampil {Math.min(visibleCount, filteredChapters.length)}</p></div><div className="flex gap-2"><input value={chapterQuery} onChange={e=>setChapterQuery(e.target.value)} placeholder="Search chapter" className="min-h-11 rounded-full border border-gray-700 bg-[#0B0D17] px-4 text-sm text-white outline-none"/><button onClick={()=>setSort(sort==='newest'?'oldest':'newest')} className="min-h-11 rounded-full bg-gray-800 px-4 text-sm font-black text-white">{sort==='newest'?'Newest':'Oldest'}</button></div></div>{!filteredChapters.length&&<div className="rounded-3xl border border-cyan-200/15 bg-[#0d1b2e]/75 p-6 text-center text-gray-300"><div className="text-4xl">🧊</div><h3 className="mt-3 text-xl font-black text-white">Chapter belum bisa dibaca otomatis</h3><p className="mt-2 text-sm leading-6 text-gray-400">Provider utama sedang membatasi akses atau belum menyediakan daftar chapter. Sistem akan tetap mencoba mirror lain saat tersedia.</p>{(detail.externalUrl||comic?.detailUrl)&&<a className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-500 px-5 text-sm font-black text-[#06111f] no-underline" href={detail.externalUrl||comic?.detailUrl} target="_blank" rel="noreferrer">Buka Sumber Eksternal</a>}</div>}<div className="grid gap-3">{visibleChapters.map((chapter,index)=>{ const href=`/manga/read/${encodeReaderId(chapter.url)}?back=${encodeURIComponent(String(slug||''))}&title=${encodeURIComponent(title)}`; const progress=readMap[chapter.url]?.progress||0; const isLatest=chapter.url===latestChapter?.url; return <a href={href} key={`${chapter.url}-${index}`} className={`rounded-xl border border-gray-700 border-l-4 ${isLatest?'border-l-red-500':'border-l-cyan-500'} bg-[#191C2D] p-4 text-white no-underline transition hover:bg-[#20263a] active:scale-[.98]`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="line-clamp-2 text-sm font-bold text-white">{chapter.name}</h3>{isLatest&&<span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">Latest</span>}{progress>=95&&<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">Read</span>}</div><p className="mt-1 text-xs text-gray-400">{chapter.date || 'Tanggal tidak tersedia'}</p>{progress>0&&progress<95&&<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800"><i className="block h-full bg-blue-500" style={{width:`${progress}%`}}/></div>}</div><span className="shrink-0 rounded-full bg-gray-800 px-3 py-1 text-[11px] font-bold text-gray-300">{chapter.views || `${Math.max(1,120-index*3)} views`}</span></div></a>})}</div>{visibleCount<filteredChapters.length&&<div ref={chapterSentinelRef} className="mt-4 rounded-2xl border border-gray-700 bg-[#191C2D] py-4 text-center text-sm font-black text-gray-300">Memuat chapter berikutnya...</div>}</section>}
    </div>
  </main>;
}
