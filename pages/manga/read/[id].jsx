import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

function decodeReaderId(value = '') {
  try {
    let base64 = String(value).replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    try { return decodeURIComponent(String(value)); }
    catch { return ''; }
  }
}

function encodeReaderId(url = '') {
  try {
    return btoa(unescape(encodeURIComponent(url))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return encodeURIComponent(url);
  }
}

function proxiedImage(url = '', title = 'Comic') {
  return `/api/manga/poster?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&type=Chapter`;
}

function readKey(url = '') { return `animesu:manga:read:${url}`; }
function continueKey(id = '') { return `animesu:manga:continue:${id}`; }
function mirrorQuery(item, key = 'mirrors') { try { const mirrors = Array.isArray(item?.mirrors) ? item.mirrors.slice(0,6) : []; return mirrors.length ? `&${key}=${encodeURIComponent(JSON.stringify(mirrors))}` : ''; } catch { return ''; } }

export default function MangaReaderPage() {
  const router = useRouter();
  const { id, back, title } = router.query;
  const [images, setImages] = useState([]);
  const [visibleCount, setVisibleCount] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comic, setComic] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [uiVisible, setUiVisible] = useState(true);
  const [failedImages, setFailedImages] = useState({});
  const [retryNonce, setRetryNonce] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const sentinelRef = useRef(null);
  const lastScrollRef = useRef(0);
  const scrollRafRef = useRef(0);
  const lastProgressSaveRef = useRef(0);

  const chapterUrl = useMemo(() => id ? decodeReaderId(String(id)) : '', [id]);
  const decodedTitle = title ? String(title) : 'Manga Reader';
  const backSlug = back ? String(back) : '';
  const detailHref = backSlug ? `/manga/${encodeURIComponent(backSlug)}` : '/manga';

  useEffect(() => {
    if (!backSlug) return;
    let active = true;
    Promise.allSettled([
      fetch('/api/manga/latest', { cache: 'no-store' }).then((res) => res.ok ? res.json() : null),
      fetch('/data/latest-manga.json', { cache: 'no-store' }).then((res) => res.ok ? res.json() : [])
    ])
      .then((results) => {
        if (!active) return null;
        const live = results[0].status === 'fulfilled' && Array.isArray(results[0].value?.data) ? results[0].value.data : [];
        const saved = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
        const found = [...live, ...saved].find((item) => String(item?.id || '') === backSlug);
        setComic(found || null);
        if (!found?.detailUrl) return null;
        return fetch(`/api/scrape-detail?url=${encodeURIComponent(found.detailUrl)}&title=${encodeURIComponent(found.title || '')}${mirrorQuery(found)}`).then((res) => res.ok ? res.json() : null);
      })
      .then((json) => {
        if (!active || !json) return;
        setChapters(Array.isArray(json?.data?.chapters) ? json.data.chapters : []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [backSlug]);

  useEffect(() => {
    if (!chapterUrl) return;
    let active = true;
    setLoading(true);
    setError('');
    setImages([]);
    setVisibleCount(2);
    const chapterHint = chapters.find((chapter) => chapter?.url === chapterUrl)?.name || '';
    const detailMirrorParam = mirrorQuery(comic, 'detailMirrors');
    fetch(`/api/scrape-chapter?url=${encodeURIComponent(chapterUrl)}&title=${encodeURIComponent(comic?.title || decodedTitle)}&chapterName=${encodeURIComponent(chapterHint)}${detailMirrorParam}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('chapter failed')))
      .then((json) => {
        if (!active) return;
        const list = Array.isArray(json?.images) ? json.images : [];
        if (!list.length) throw new Error('empty images');
        setImages(list);
        setVisibleCount(Math.min(2, list.length));
        setFailedImages({});
        setRetryNonce(0);
        setCurrentPage(1);
        try {
          localStorage.setItem(readKey(chapterUrl), JSON.stringify({ progress: 5, at: Date.now() }));
          if (backSlug) localStorage.setItem(continueKey(backSlug), JSON.stringify({ url: chapterUrl, title: decodedTitle, progress: 5, at: Date.now() }));
        } catch {}
      })
      .catch(() => active && setError('Gagal memuat chapter, silakan coba lagi.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [chapterUrl, backSlug, decodedTitle, comic, chapters]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !images.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const saveData = navigator.connection?.saveData;
        const chunk = saveData ? 1 : 3;
        setVisibleCount((count) => Math.min(count + chunk, images.length));
      }
    }, { rootMargin: '700px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [images.length]);

  useEffect(() => {
    if (!images.length) return;
    const nodes = Array.from(document.querySelectorAll('[data-reader-page]'));
    if (!nodes.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      const page = Number(visible?.target?.getAttribute('data-reader-page') || 0);
      if (page) setCurrentPage(page);
    }, { threshold: [0.25, 0.5, 0.75], rootMargin: '-12% 0px -55% 0px' });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [images.length, visibleCount]);

  useEffect(() => {
    if (!images.length) return;
    const next = images.slice(visibleCount, visibleCount + 3);
    next.forEach((src, offset) => {
      const img = new window.Image();
      img.decoding = 'async';
      img.src = proxiedImage(src, `${decodedTitle} halaman ${visibleCount + offset + 1}`);
    });
  }, [images, visibleCount, decodedTitle, retryNonce]);

  useEffect(() => {
    function saveProgress(y) {
      if (!images.length) return;
      const now = Date.now();
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(99, Math.round((y / max) * 100));
      if (now - lastProgressSaveRef.current < 700 && progress < 99) return;
      lastProgressSaveRef.current = now;
      try {
        const payload = { progress, page: currentPage, total: images.length, at: now };
        localStorage.setItem(readKey(chapterUrl), JSON.stringify(payload));
        if (backSlug) localStorage.setItem(continueKey(backSlug), JSON.stringify({ url: chapterUrl, title: decodedTitle, ...payload }));
      } catch {}
    }

    function onScroll() {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = 0;
        const y = window.scrollY;
        const movingDown = y > lastScrollRef.current + 8;
        const movingUp = y < lastScrollRef.current - 8;
        if (movingDown && y > 120) setUiVisible(false);
        if (movingUp || y < 80) setUiVisible(true);
        lastScrollRef.current = y;
        saveProgress(y);
      });
    }
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [images.length, chapterUrl, backSlug, decodedTitle, currentPage]);

  const currentIndex = chapters.findIndex((chapter) => chapter?.url === chapterUrl);
  const prevChapter = currentIndex >= 0 ? chapters[currentIndex + 1] : null;
  const nextChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const currentChapterName = currentIndex >= 0 ? chapters[currentIndex]?.name : 'Chapter';
  const readerHref = (chapter) => chapter?.url ? `/manga/read/${encodeReaderId(chapter.url)}?back=${encodeURIComponent(backSlug)}&title=${encodeURIComponent(comic?.title || decodedTitle)}` : '#';

  return <main className="min-h-screen bg-black text-white">
    <div className={`fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/70 px-3 py-3 backdrop-blur-md transition ${uiVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <a href={detailHref} className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white no-underline active:scale-95">← Detail</a>
        <div className="min-w-0 text-center"><b className="line-clamp-1 text-sm text-white">{comic?.title || decodedTitle}</b><p className="line-clamp-1 text-xs text-gray-400">{currentChapterName} • {images.length ? `${currentPage}/${images.length}` : '...'}</p></div>
        <Link href="/manga" className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white no-underline active:scale-95">Home</Link>
      </div>
    </div>

    <div className="mx-auto max-w-3xl pt-16">
      <h1 className="sr-only">{decodedTitle}</h1>
      {loading && <div className="p-8 text-center text-gray-300">Memuat chapter...</div>}
      {error && <div className="mx-4 rounded-2xl border border-gray-700 bg-[#191C2D] p-6 text-center text-gray-300">{error}</div>}
      {!error && images.slice(0, visibleCount).map((src, index) => <div key={`${src}-${index}`} data-reader-page={index + 1} className="reader-page min-h-[220px] bg-black" style={{ contentVisibility: 'auto', containIntrinsicSize: '900px' }}>
        {failedImages[index] ? <div className="mx-4 my-3 rounded-2xl border border-gray-700 bg-[#191C2D] p-5 text-center text-gray-300">
          <p className="text-sm font-bold">Gambar halaman {index + 1} gagal dimuat.</p>
          <button onClick={() => { setFailedImages((old) => ({ ...old, [index]: false })); setRetryNonce((n) => n + 1); }} className="mt-3 rounded-full bg-[#E53935] px-4 py-2 text-sm font-black text-white">Retry Image</button>
        </div> : <img
          src={`${proxiedImage(src, `${decodedTitle} halaman ${index + 1}`)}&r=${retryNonce}`}
          alt={`${decodedTitle} halaman ${index + 1}`}
          loading={index === 0 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : "auto"}
          decoding="async"
          onLoad={() => { if (failedImages[index]) setFailedImages((old) => ({ ...old, [index]: false })); }}
          onError={() => setFailedImages((old) => ({ ...old, [index]: true }))}
          className="block w-full bg-black object-contain"
        />}
      </div>)}
      {!error && images.length > 0 && visibleCount < images.length && <div ref={sentinelRef} className="h-20 text-center text-xs text-gray-500">Memuat halaman berikutnya...</div>}
      {!error && images.length > 0 && visibleCount >= images.length && <div className="py-8 text-center text-sm font-bold text-gray-500">Selesai membaca.</div>}
      {!images.length && !loading && !error && <div className="mx-4 rounded-2xl border border-gray-700 bg-[#191C2D] p-6 text-center text-gray-300">Gagal memuat chapter, silakan coba lagi.</div>}
    </div>

    {images.length > 0 && <div className="fixed bottom-[76px] left-0 right-0 z-40 h-1 bg-white/10"><i className="block h-full bg-[#E53935] transition-all" style={{ width: `${Math.min(100, Math.max(0, (currentPage / images.length) * 100))}%` }} /></div>}

    <div className={`fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/75 px-4 py-3 backdrop-blur-md transition ${uiVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-3">
        <a href={readerHref(prevChapter)} className={`rounded-2xl border border-white/10 px-3 py-3 text-center text-sm font-black no-underline ${prevChapter ? 'bg-white/10 text-white' : 'pointer-events-none bg-white/5 text-gray-600'}`}>← Prev</a>
        <a href={detailHref} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center text-sm font-black text-white no-underline">Chapter List</a>
        <a href={readerHref(nextChapter)} className={`rounded-2xl border border-white/10 px-3 py-3 text-center text-sm font-black no-underline ${nextChapter ? 'bg-white/10 text-white' : 'pointer-events-none bg-white/5 text-gray-600'}`}>Next →</a>
      </div>
    </div>

    <div className="fixed bottom-24 right-3 z-40 grid gap-2">
      <button onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md active:scale-95">↑</button>
      <button onClick={() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md active:scale-95">↓</button>
    </div>
  </main>;
}
