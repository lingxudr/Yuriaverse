import { sansekaiFetch } from './client';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import type { DramaDetail, DramaEpisode, DramaItem, DramaProvider, StreamSource } from './types';
const providers: DramaProvider[] = ['drakorid','dramabox','pinedrama','reelshort','shortmax','dramanova'];
const toStr=(v:any)=>v==null?'':String(v);
const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

const DRAKORID_BASE = process.env.DRAKORID_BASE_URL || 'https://drakorid.cam';
function abs(url = '', base = DRAKORID_BASE) { if (!url) return ''; try { return new URL(String(url || ''), base).toString(); } catch { return ''; } }
function idFromUrl(url = '') { try { return new URL(url).pathname.split('/').filter(Boolean)[0] || slug(url); } catch { return slug(url); } }
function cleanTitle(value = '') { return String(value || '').replace(/\s+/g, ' ').trim(); }
function episodeFromTitle(title = '') { return String(title).match(/Episode\s+(\d+)/i)?.[1] || (/movie/i.test(title) ? '1' : '1'); }
function seriesTitle(title = '') {
  return cleanTitle(String(title || '')
    .replace(/\s+Episode\s+\d+\s*(?:END|Extra)?\s*$/i, '')
    .replace(/\s+Episode\s+\d+\s*$/i, '')
    .replace(/\s+Extra\s*$/i, '')
    .replace(/\s+END\s*$/i, '')
  );
}
function seriesKey(title = '') { return slug(seriesTitle(title).replace(/\((19|20)\d{2}\)/g, '')); }
function drakorRegion(title = '', raw: any = {}) {
  const hay = `${title} ${raw?.text || ''} ${raw?.country || ''} ${raw?.genre || ''}`.toLowerCase();
  const chinaHints = ['china','chinese','dracin','cdrama','c-drama','xiao','yiran','fang','phoenix','sovereign','blossoms','overdo','spring over','silver linings','shadow sovereign','east palace','scheduled','love so invincible','dream to you'];
  if (chinaHints.some((x)=>hay.includes(x))) return 'Dracin';
  return 'Drakor';
}

async function readDrakorSeed(): Promise<DramaItem[]> {
  try {
    const file = path.join(process.cwd(), 'public', 'data', 'provider-seeds', 'drakorid.json');
    const json = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(json) ? json.map((x:any)=>({ ...x, provider: 'drakorid' as DramaProvider })) : [];
  } catch { return []; }
}
async function fetchText(url: string, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36', accept: 'text/html,application/xhtml+xml' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally { clearTimeout(t); }
}
function imgSrc($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>, base = DRAKORID_BASE) {
  const img = root.find('img').first();
  return abs(img.attr('data-src') || img.attr('data-lazy-src') || img.attr('src') || '', base);
}
function parseDrakorItem($: cheerio.CheerioAPI, link: cheerio.Cheerio<any>): DramaItem | null {
  const href = abs(link.attr('href') || '');
  if (!href || !href.startsWith(DRAKORID_BASE)) return null;
  const pathname = new URL(href).pathname.replace(/\/$/, '');
  if (!pathname || pathname === '/' || /^\/(movie|completed|series|az-list|schedule|bookmark|kontak-ads|kontak|random)(\/|$)/i.test(pathname)) return null;
  const text = cleanTitle(link.text());
  const img = imgSrc($, link);
  const imgTitle = cleanTitle(link.find('img').attr('alt') || link.find('img').attr('title') || '');
  const looksLikeEntry = /(Completed\s+)?(Drama|Movie|TV Show)\s+(Ep|Movie)/i.test(text) || /episode\s+\d+|END|\(20\d{2}\)/i.test(imgTitle || text);
  if (!looksLikeEntry && !/wp-content\/uploads/i.test(img)) return null;
  const title = imgTitle || cleanTitle(text.replace(/^(Completed\s+)?(Drama|Movie|TV Show)\s+(Ep\s+\d+|Movie)\s+/i, '').replace(/\s+\d+\s+(seconds?|minutes?|hours?|days?|weeks?)\s+ago$/i, ''));
  if (!title || title.length < 3 || /^<tanpa teks>|home|contact|bookmark|schedule|series list|az list$/i.test(title)) return null;
  const ep = episodeFromTitle(title);
  return { id: idFromUrl(href), provider: 'drakorid', title, poster: img, episodeCount: ep, status: /END|completed/i.test(text + title) ? 'Completed' : undefined, year: title.match(/(19|20)\d{2}/)?.[0], url: href, type: /movie/i.test(text + title) ? 'Movie' : drakorRegion(title, { text }), country: drakorRegion(title, { text }) === 'Dracin' ? 'China' : 'Korea', raw: { href, text, region: drakorRegion(title, { text }) } };
}

async function listDrakorId(query = '', limit = 60): Promise<DramaItem[]> {
  try {
    const html = await fetchText(query ? `${DRAKORID_BASE}/?s=${encodeURIComponent(query)}` : `${DRAKORID_BASE}/`, 9000);
    const $ = cheerio.load(html);
    const map = new Map<string, DramaItem>();
    $('a[href]').each((_, el) => {
      const item = parseDrakorItem($, $(el));
      if (item && !map.has(item.id)) map.set(item.id, item);
    });
    const seed = await readDrakorSeed();
    for (const x of seed) if (!map.has(x.id)) map.set(x.id, x);
    const items = [...map.values()].filter((x)=>!query || x.title.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
    if (items.length) return items;
  } catch {}
  const seed = await readDrakorSeed();
  return seed.filter((x)=>!query || x.title.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
}
function decodeIframeOption(value = '') {
  try {
    const html = Buffer.from(String(value), 'base64').toString('utf8');
    const m = html.match(/<iframe[^>]+src=["']([^"']+)/i);
    return m?.[1] || '';
  } catch { return ''; }
}
async function drakorDetail(id: string): Promise<DramaDetail> {
  const seedItems = await readDrakorSeed();
  const seed = seedItems.find((x)=>x.id===id);
  const url = seed?.url || `${DRAKORID_BASE}/${id}/`;
  let title = seed?.title || id;
  let poster = seed?.poster || '';
  let description = seed?.description || '';
  let type = seed?.type || '';
  let status = seed?.status;
  let year = seed?.year;
  try {
    const html = await fetchText(url, 10000);
    const $ = cheerio.load(html);
    title = cleanTitle($('h1').first().text()) || title;
    const parsedPoster = abs($('.poster img, .thumb img, .entry-content img, img[alt]').filter((_, el)=>/wp-content\/uploads|resize|jpg|jpeg|png|webp/i.test($(el).attr('src') || '') && !/logo|icon|favicon|coffeebean/i.test($(el).attr('src') || '')).first().attr('src') || '');
    poster = poster || parsedPoster;
    description = cleanTitle($('.entry-content p, .post-content p, .sinopsis, .desc').first().text()) || description;
    status = /\bEND\b/i.test(title) ? 'Completed' : status;
    year = title.match(/\b(19|20)\d{2}\b/)?.[0] || year;
  } catch {}
  const region = drakorRegion(title, seed?.raw || {});
  type = /movie/i.test(`${type} ${title}`) ? 'Movie' : region;
  const baseSeries = seriesKey(title);
  let pool = await listDrakorId('', 160);
  const searched = await listDrakorId(seriesTitle(title), 160).catch(() => []);
  for (const item of searched) if (!pool.some((x)=>x.id===item.id)) pool.push(item);
  // Include seed explicitly so completed older episodes are not lost if homepage/search only has latest.
  for (const item of seedItems) if (!pool.some((x)=>x.id===item.id)) pool.push(item);
  const related = pool
    .filter((x)=>seriesKey(x.title) === baseSeries)
    .sort((a,b)=>Number(episodeFromTitle(a.title))-Number(episodeFromTitle(b.title)));
  const foundEpisodes = (related.length ? related : [seed || { id, provider: 'drakorid' as DramaProvider, title, url, episodeCount: episodeFromTitle(title) } as DramaItem])
    .map((x)=>({ episode: episodeFromTitle(x.title), title: x.title, id: x.url || `${DRAKORID_BASE}/${x.id}/`, url: x.url || `${DRAKORID_BASE}/${x.id}/` }))
    .filter((ep, idx, arr)=>arr.findIndex((x)=>x.episode===ep.episode)===idx);
  const maxEpisode = Math.max(
    Number(episodeFromTitle(title)) || 1,
    Number(seed?.episodeCount || 0) || 0,
    ...foundEpisodes.map((x)=>Number(x.episode)||0)
  );
  const baseName = seriesTitle(title) || title;
  const baseSlug = slug(baseName);
  const byEpisode = new Map(foundEpisodes.map((ep)=>[String(ep.episode), ep]));
  const episodes = Array.from({ length: Math.max(1, Math.min(maxEpisode, 300)) }, (_, idx) => {
    const no = String(idx + 1);
    const guess = `${DRAKORID_BASE}/${baseSlug}-episode-${no}/`;
    const known = byEpisode.get(no);
    if (known && !/\/series\//i.test(known.url || '')) return known;
    return { episode: no, title: `${baseName} Episode ${no}`, id: guess, url: guess };
  });
  const base: DramaItem = { id, provider: 'drakorid', title: baseName, poster, description, episodeCount: String(episodes.length || episodeFromTitle(title)), status, country: region === 'Dracin' ? 'China' : 'Korea', year, url, type };
  return { ...base, episodes };
}

async function drakorEpisode(id: string, ep: string): Promise<{ title: string; sources: StreamSource[] }> {
  const d = await drakorDetail(id);
  const selected = d.episodes.find((x)=>String(x.episode)===String(ep)) || d.episodes[0];
  const url = selected?.url || d.url || `${DRAKORID_BASE}/${id}/`;
  const html = await fetchText(url, 10000).catch(() => '');
  const $ = cheerio.load(html);
  const sources: StreamSource[] = [];
  $('iframe[src]').each((i, el) => { const src = abs($(el).attr('src') || '', url); if (src && !sources.some((s)=>s.url===src)) sources.push({ name: i === 0 ? 'Default' : `Server ${i+1}`, url: src }); });
  $('select option[value]').each((_, el) => { const label = cleanTitle($(el).text()) || 'Server'; const src = decodeIframeOption($(el).attr('value') || ''); if (/^https?:/.test(src) && !sources.some((s)=>s.url===src)) sources.push({ name: label, url: src }); });
  return { title: selected?.title || d.title || `Episode ${ep}`, sources };
}

function item(provider:DramaProvider, x:any): DramaItem | null {
  const id = toStr(x.bookId || x.book_id || x.collection_id || x.shortPlayId || x.shortPlayCode || x.dramaId || x.id || x.slug || x.url);
  const title = toStr(x.bookName || x.title || x.name || x.dramaName);
  const poster = x.coverWap || x.cover || x.posterImg || x.posterImgUrl || x.thumbnail || x.image || x.verticalCover;
  if(!id || !title) return null;
  return { id, provider, title, poster, description: x.introduction || x.description || x.synopsis, episodeCount: toStr(x.chapterCount || x.total_episodes || x.totalEpisodes || x.totalEpisode), genre: x.tags || x.categories?.split?.(',') || x.genre, status: x.isCompleted==='1'?'Completed':x.status, year: toStr(x.year || x.releaseYear || '').trim() || undefined, raw:x };
}
function arr(provider:DramaProvider, json:any): DramaItem[] {
  const data = json?.data ?? json;
  const rows = Array.isArray(data) ? data : data?.items || data?.results || data?.collections || data?.rows || data?.list || data?.data || [];
  return (Array.isArray(rows)?rows:[]).map((x:any)=>item(provider,x)).filter(Boolean) as DramaItem[];
}
export async function listProvider(provider:DramaProvider, type='latest', query=''): Promise<DramaItem[]> {
  try {
    if(provider==='drakorid') return listDrakorId(query, 80);
    if(provider==='dramabox') return arr(provider, await sansekaiFetch(query?`/dramabox/search?query=${encodeURIComponent(query)}`:`/dramabox/${type==='popular'?'trending':'latest'}`));
    if(provider==='pinedrama') return arr(provider, await sansekaiFetch(query?`/pinedrama/search?query=${encodeURIComponent(query)}`:'/pinedrama/trending'));
    if(provider==='reelshort') return arr(provider, await sansekaiFetch(query?`/reelshort/search?query=${encodeURIComponent(query)}&page=1`:'/reelshort/homepage'));
    if(provider==='shortmax') return arr(provider, await sansekaiFetch(query?`/shortmax/search?keyword=${encodeURIComponent(query)}`:`/shortmax/${type==='popular'?'rekomendasi':'latest'}`));
    if(provider==='dramanova') return arr(provider, await sansekaiFetch(query?`/dramanova/search?query=${encodeURIComponent(query)}`:'/dramanova/home'));
  } catch { return []; }
  return [];
}
export async function listAll(provider='all', type='latest', query='', limit = 60): Promise<DramaItem[]> {
  const ps = provider==='all'?providers:[provider as DramaProvider];
  const settled = await Promise.allSettled(ps.map(p=>listProvider(p,type,query)));
  const all = settled.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  const map = new Map<string,DramaItem>();
  for(const it of all){ const k=`${it.provider}:${it.id}`; if(!map.has(k)) map.set(k,it); }
  return [...map.values()].slice(0, limit);
}
function episodesFrom(d:any): DramaEpisode[] {
  const list = d.episode_list || d.episodes || d.chapterList || d.chapters || d.list || [];
  if (Array.isArray(list) && list.length) return list.map((e:any,i:number)=>({episode:toStr(e.episodeNumber||e.number||e.episode||i+1), title:toStr(e.title||e.name||`Episode ${e.episodeNumber||i+1}`), id: toStr(e.id||e.chapterId||e.episodeId||e.url)}));
  const total = Number(d.chapterCount||d.total_episodes||d.totalEpisodes||d.totalEpisode||0);
  return Array.from({length: Math.min(total, 200)},(_,i)=>({episode:String(i+1), title:`Episode ${i+1}`}));
}
export async function detail(provider:DramaProvider, id:string): Promise<DramaDetail> {
  if(provider==='drakorid') return drakorDetail(id);
  const path = provider==='dramabox'?`/dramabox/detail?bookId=${id}`:provider==='pinedrama'?`/pinedrama/detail?collection_id=${id}`:provider==='reelshort'?`/reelshort/detail?bookId=${id}`:provider==='shortmax'?`/shortmax/detail?shortPlayId=${id}`:`/dramanova/detail?dramaId=${id}`;
  const json:any = await sansekaiFetch(path); const d=json?.data||json?.detail||json;
  const base = item(provider, d) || {id,provider,title:toStr(d.title||d.bookName||d.name||id)} as DramaItem;
  return {...base, altTitle:d.alterTitle||d.subtitle, banner:d.bannerImg||d.banner||d.horizontalCover, episodes: episodesFrom(d)};
}
function extractUrl(v:any){ const s=toStr(v?.url||v?.playUrl||v?.videoUrl||v?.src||v); return s; }
export async function episode(provider:DramaProvider, id:string, ep:string): Promise<{title:string; sources:StreamSource[]}> {
  if(provider==='drakorid') return drakorEpisode(id, ep);
  const path = provider==='dramabox'?`/dramabox/allepisode?bookId=${id}`:provider==='pinedrama'?`/pinedrama/episode?collection_id=${id}&episodeNumber=${ep}`:provider==='reelshort'?`/reelshort/episode?bookId=${id}&episodeNumber=${ep}`:provider==='shortmax'?`/shortmax/episode?shortPlayId=${id}&episodeNumber=${ep}`:`/dramanova/getvideo?dramaId=${id}&episodeNumber=${ep}`;
  const json:any = await sansekaiFetch(path, 12000); const data=json?.data||json;
  let sources:any[] = [];
  if(provider==='dramabox') sources = (Array.isArray(data)?data:data?.episodes||[]).filter((x:any)=>String(x.episode||x.episodeNumber||'')===String(ep));
  else sources = Array.isArray(data)?data:(data?.sources||data?.streams||data?.videos||[data]);
  const out = sources.map((s:any,i:number)=>({name:s.name||s.quality||`Server ${i+1}`, url:extractUrl(s), quality:s.quality})).filter((s:any)=>/^https?:/.test(s.url));
  return { title:`Episode ${ep}`, sources: out };
}
