import fs from 'node:fs/promises';
const BASE = process.env.SANKA_BASE_URL || 'https://www.sankavollerei.web.id';
const endpoints = [
  ['Anime Home','/anime/home'],['Anime Ongoing','/anime/ongoing-anime?page=1'],['Anime Completed','/anime/complete-anime?page=1'],['Anime Unlimited','/anime/unlimited'],['Anime Genre','/anime/genre'],['Anime Genre Action','/anime/genre/action?page=1'],['Anime Schedule','/anime/schedule'],['Anime Search','/anime/search/one'],
  ['Samehadaku Popular','/anime/samehadaku/popular?page=1'],['Samehadaku Movies','/anime/samehadaku/movies?page=1&order=update'],['Samehadaku Batch','/anime/samehadaku/batch?page=1'],['Samehadaku Detail','/anime/samehadaku/anime/one-piece'],
  ['Donghua Ongoing','/anime/donghua/ongoing/1'],['Donghua Completed','/anime/donghua/completed/1'],['Donghua Latest','/anime/donghua/latest/1'],['Donghua Genres','/anime/donghua/genres'],['Donghua Genre Action','/anime/donghua/genres/action/1'],['Donghua Schedule','/anime/donghua/schedule'],['Donghua Detail','/anime/donghua/detail/crowned-in-a-hundred-days'],
  ['Animasu Ongoing','/anime/animasu/ongoing?page=1'],['Animasu Completed','/anime/animasu/completed?page=1'],['Animasu Movies','/anime/animasu/movies?page=1'],['Animasu Popular','/anime/animasu/popular?page=1'],['Animasu Schedule','/anime/animasu/schedule'],['Animasu Live Action Search','/anime/animasu/search/live%20action?page=1'],['Animasu Detail Live Action','/anime/animasu/detail/one-piece-season-2-live-action'],
  ['Kusonime OVA','/anime/kusonime/type/ova?page=1'],['Kusonime ONA','/anime/kusonime/type/ona?page=1'],['Kusonime Special','/anime/kusonime/type/special?page=1']
];
const imageFields=['poster','thumbnail','image','cover','banner','img','imageUrl','coverUrl','posterUrl'];
const titleFields=['title','judul','anime','name','animeTitle'];
const ratingFields=['score','rating','mal_score'];
function keysDeep(o, depth=2, prefix=''){ if(!o||typeof o!=='object'||depth<0) return []; let keys=[]; for(const [k,v] of Object.entries(o)){ keys.push(prefix+k); if(v&&typeof v==='object'&&!Array.isArray(v)) keys.push(...keysDeep(v,depth-1,`${prefix}${k}.`)); } return keys; }
function findArray(o){ if(Array.isArray(o)) return o; if(!o||typeof o!=='object') return []; for(const v of Object.values(o)){ if(Array.isArray(v)) return v; if(v&&typeof v==='object'){ const a=findArray(v); if(a.length) return a; } } return []; }
const report=[];
for(const [name,path] of endpoints){
  const url=BASE+path; const started=Date.now();
  try{ const res=await fetch(url,{headers:{accept:'application/json'}}); const text=await res.text(); let json; try{json=JSON.parse(text)}catch{json={parseError:text.slice(0,200)}}; const arr=findArray(json); const sample=arr[0]||json?.data||json; const fields=keysDeep(sample,2); const missing={image:!imageFields.some(f=>fields.includes(f)||fields.some(k=>k.endsWith('.'+f))),title:!titleFields.some(f=>fields.includes(f)),rating:!ratingFields.some(f=>fields.includes(f))}; report.push({name,path,status:res.status,ms:Date.now()-started,topKeys:Object.keys(json||{}),itemCount:arr.length,sampleFields:fields.slice(0,80),missing,sample}); }
  catch(e){ report.push({name,path,error:e.message}); }
}
await fs.writeFile('audit/sanka-api-audit.json', JSON.stringify(report,null,2));
await fs.writeFile('audit/SANKA_API_AUDIT.md', '# Sanka API Audit\n\n'+report.map(r=>`## ${r.name}\n- Endpoint: \`${r.path}\`\n- Status: ${r.status||'ERR'}\n- Items: ${r.itemCount||0}\n- Missing: ${JSON.stringify(r.missing||{})}\n- Fields: ${(r.sampleFields||[]).slice(0,30).join(', ')}\n`).join('\n'));
console.log(JSON.stringify(report.map(r=>({name:r.name,status:r.status,itemCount:r.itemCount,missing:r.missing})),null,2));
