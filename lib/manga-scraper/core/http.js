const axios = require('axios');
const https = require('https');
const { sleep, validatePublicUrl } = require('./utils');

const agent = new https.Agent({ keepAlive: true, maxSockets: 16, maxFreeSockets: 8, timeout: 30000 });
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
];
let lastRequestAt = 0;
function randomUA(){ return USER_AGENTS[Math.floor(Math.random()*USER_AGENTS.length)]; }
async function throttle(ms=350){ const wait=Math.max(0, lastRequestAt + ms - Date.now()); if(wait) await sleep(wait); lastRequestAt=Date.now(); }

function detectHtmlBlock(html = '', headers = {}, status = 0) {
  const body = String(html || '').slice(0, 120000).toLowerCase();
  const server = String(headers?.server || '').toLowerCase();
  const title = (body.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || '').toLowerCase();
  if (status === 403 || status === 429) return { blocked: true, reason: status === 429 ? 'rate-limited' : 'forbidden' };
  if (server.includes('cloudflare') && /just a moment|attention required|checking your browser|cf-chl|turnstile|challenge-platform|captcha/i.test(body)) return { blocked: true, reason: 'cloudflare-challenge' };
  if (/just a moment|attention required|checking your browser|cf-chl|turnstile|challenge-platform|captcha|ddos-guard|please enable cookies/i.test(body)) return { blocked: true, reason: 'anti-bot-challenge' };
  if (/access denied|temporarily unavailable|request blocked/i.test(title)) return { blocked: true, reason: 'access-denied' };
  return { blocked: false, reason: '' };
}

async function fetchHtml(url, opts={}){
  const safe = await validatePublicUrl(url);
  if(!safe) throw new Error('Blocked unsafe URL');
  const timeout = opts.timeout || 18000;
  const retries = opts.retries ?? 3;
  let lastError;
  for(let attempt=0; attempt<retries; attempt++){
    try{
      await throttle(opts.throttleMs || 300);
      const started=Date.now();
      const res = await axios.get(safe, { timeout, httpsAgent: agent, maxRedirects: 5, validateStatus: (s)=>s>=200 && s<500, headers: {
        'User-Agent': opts.userAgent || randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': new URL(safe).origin + '/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }});
      const html = String(res.data || '');
      const block = detectHtmlBlock(html, res.headers, res.status);
      if (block.blocked) {
        const err = new Error(block.reason);
        err.code = block.reason;
        err.status = res.status;
        err.blocked = true;
        throw err;
      }
      if (res.status >= 400) {
        const err = new Error(`http-${res.status}`);
        err.status = res.status;
        throw err;
      }
      return { html, status: res.status, url: safe, responseTime: Date.now()-started, finalUrl: res.request?.res?.responseUrl || safe, headers: res.headers };
    } catch(error){
      lastError=error;
      if (error?.blocked || /cloudflare|challenge|forbidden|rate-limited/i.test(error?.message || '')) break;
      await sleep(350 * Math.pow(2, attempt));
    }
  }
  throw lastError;
}
module.exports = { fetchHtml, randomUA, detectHtmlBlock };
