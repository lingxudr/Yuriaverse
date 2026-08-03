import fs from 'node:fs/promises';
const BASE = process.env.ANIMESU_URL || 'https://animesu.vercel.app';
const MAX = Number(process.env.AUDIT_MAX || 3);
const samples = [
  { kind: 'anime', tab: 'ongoing', source: '' },
  { kind: 'donghua', tab: 'ongoing', source: 'donghua' },
  { kind: 'movie', tab: 'all', source: 'samehadaku' },
  { kind: 'live-action', tab: 'all', source: 'animasu' },
  { kind: 'anime', tab: 'ova', source: 'kusonime' },
  { kind: 'anime', tab: 'batch', source: 'batch' }
];
async function getJson(url){ const r=await fetch(url,{cache:'no-store'}); const text=await r.text(); let json; try{json=JSON.parse(text)}catch{json={parseError:text.slice(0,200)}}; return {ok:r.ok,status:r.status,json}; }
async function auditItem(item, source){
  const qs = source ? `?source=${source}` : '';
  const detailUrl = `${BASE}/api/anime/detail/${encodeURIComponent(item.slug)}${qs}`;
  const detail = await getJson(detailUrl);
  const d = detail.json?.data || {};
  const firstEp = d.episodes?.[0];
  const result = { title:item.title, slug:item.slug, source, detailStatus:detail.status, detailOk:detail.ok && d.title && !/tidak tersedia|gagal/i.test(d.title), detailTitle:d.title, poster:!!d.poster, episodeCount:d.episodes?.length||0, firstEpisode:firstEp?.slug, episodeOk:false, serverCount:0, downloadCount:0, streamOk:false, streamStatus:null, streamUrl:null, issues:[] };
  if(!result.detailOk) result.issues.push('DETAIL_FAILED');
  if(!result.poster) result.issues.push('NO_POSTER');
  if(firstEp?.slug && source !== 'batch' && source !== 'kusonime'){
    const epUrl = `${BASE}/api/anime/episode/${encodeURIComponent(firstEp.slug)}${qs}`;
    const ep = await getJson(epUrl);
    const e = ep.json?.data || {};
    result.episodeOk = ep.ok && e.title && !/tidak tersedia|gagal/i.test(e.title);
    result.serverCount = e.servers?.length || 0;
    result.downloadCount = e.downloads?.length || 0;
    if(!result.episodeOk) result.issues.push('EPISODE_FAILED');
    if(!result.serverCount && !result.downloadCount) result.issues.push('NO_SERVERS_OR_DOWNLOADS');
    const server = e.servers?.find(s=>s.id);
    if(server){
      if(/^https?:\/\//i.test(server.id)){ result.streamOk=true; result.streamUrl=server.id; result.streamStatus=200; }
      else { const stream = await getJson(`${BASE}/api/anime/stream?id=${encodeURIComponent(server.id)}`); result.streamStatus=stream.status; result.streamUrl=stream.json?.data?.url; result.streamOk=stream.ok && !!result.streamUrl; if(!result.streamOk) result.issues.push('STREAM_RESOLVE_FAILED'); }
    }
  } else if(source !== 'batch' && source !== 'kusonime') result.issues.push('NO_EPISODE_LIST');
  return result;
}
const report=[];
for(const sample of samples){
  const listUrl = `${BASE}/api/category?kind=${sample.kind}&tab=${sample.tab}&page=1&limit=${MAX}`;
  const list = await getJson(listUrl);
  const items = (list.json?.data?.items || []).slice(0,MAX);
  const results=[];
  for(const item of items) results.push(await auditItem(item, item.sourceProvider || sample.source));
  report.push({ ...sample, listStatus:list.status, listOk:list.ok, itemCount:items.length, results });
}
await fs.mkdir('audit',{recursive:true});
await fs.writeFile('audit/player-audit.json', JSON.stringify({at:new Date().toISOString(), base:BASE, report}, null, 2));
await fs.writeFile('audit/PLAYER_AUDIT.md', '# Animesu Player Audit\n\n'+report.map(g=>`## ${g.kind}/${g.tab}\n${g.results.map(r=>`- ${r.issues.length?'❌':'✅'} ${r.title} — detail:${r.detailOk} ep:${r.episodeOk} servers:${r.serverCount} downloads:${r.downloadCount} stream:${r.streamOk} ${r.issues.join(',')}`).join('\n')}`).join('\n\n'));
console.log(JSON.stringify(report,null,2));
