const dns = require('dns').promises;

function sleep(ms){ return new Promise((resolve)=>setTimeout(resolve, ms)); }
function cleanText(value=''){ return String(value || '').replace(/\s+/g,' ').trim(); }
function stripQuery(url='') { try { const u = new URL(url); u.hash=''; return u.toString(); } catch { return String(url||''); } }
function normalizeUrl(value, baseUrl=''){
  if(!value || typeof value !== 'string') return '';
  const clean=value.trim().replace(/&amp;/g,'&');
  if(!clean || clean.startsWith('data:') || clean.startsWith('javascript:')) return '';
  try { const u = new URL(clean, baseUrl || undefined); u.hash=''; if(u.protocol === 'http:') u.protocol='https:'; return u.toString(); }
  catch { return ''; }
}
function normalizeKey(value=''){ return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function slugify(value=''){ return normalizeKey(value).replace(/\s+/g,'-'); }
function uniqueBy(items, keyFn){ const seen=new Set(); return items.filter((item)=>{ const key=keyFn(item); if(!key || seen.has(key)) return false; seen.add(key); return true; }); }
function numberFromChapter(value='') { const m=String(value).match(/(?:chapter|ch\.?|bab)?\s*(\d+(?:\.\d+)?)/i); return m ? Number(m[1]) : NaN; }
function sortChapters(chapters=[]){
  const arr=uniqueBy(chapters.filter(x=>x && x.url), (x)=>stripQuery(x.url));
  if(arr.length < 2) return arr;
  const first=numberFromChapter(arr[0].name || arr[0].title || arr[0].url);
  const last=numberFromChapter(arr[arr.length-1].name || arr[arr.length-1].title || arr[arr.length-1].url);
  // Reader convention: latest first. If ascending, reverse.
  if(!Number.isNaN(first) && !Number.isNaN(last) && first < last) arr.reverse();
  return arr;
}
function isPrivateIP(ip=''){
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|::1$|fc|fd|fe80)/i.test(ip);
}
async function validatePublicUrl(value){
  const url = normalizeUrl(value);
  if(!url) return null;
  const parsed = new URL(url);
  if(!['http:','https:'].includes(parsed.protocol)) return null;
  const host = parsed.hostname.toLowerCase();
  if(host === 'localhost' || host.endsWith('.local') || /^\d+\.\d+\.\d+\.\d+$/.test(host) && isPrivateIP(host)) return null;
  try {
    const records = await dns.lookup(host, { all: true });
    if(records.some((r)=>isPrivateIP(r.address))) return null;
  } catch { /* DNS failures will be handled by request layer */ }
  return url;
}
function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
function hashString(value=''){ let h=0; for(let i=0;i<value.length;i++) h=((h<<5)-h)+value.charCodeAt(i)|0; return Math.abs(h).toString(36); }

module.exports = { sleep, cleanText, normalizeUrl, normalizeKey, slugify, uniqueBy, numberFromChapter, sortChapters, validatePublicUrl, escapeHtml, hashString, stripQuery };
