const axios = require('axios');
const cheerio = require('cheerio');

// Edit daftar ini sesuai 4 sumber scraping yang ingin dicek.
const TARGETS = [
  { name: 'AinzScans', url: 'https://v2.ainzscans01.com/' },
  { name: 'Komikcast', url: 'https://v3.komikcast.fit/' },
  { name: 'Manhwalist', url: 'https://manhwalist.com/' },
  { name: 'Komiku', url: 'https://komiku.org/' }
];

const TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function checkTarget(target) {
  const started = Date.now();
  try {
    const res = await axios.get(target.url, {
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      }
    });

    const ms = Date.now() - started;
    const html = String(res.data || '');
    const $ = cheerio.load(html);
    const title = ($('title').first().text() || '').replace(/\s+/g, ' ').trim();
    const ok = res.status === 200 && Boolean(title) && !/just a moment|cloudflare|attention required/i.test(title + html.slice(0, 500));

    return {
      Source: target.name,
      URL: target.url,
      Status: res.status,
      'Time(ms)': ms,
      OK: ok ? 'YES' : 'NO',
      Title: title || '-',
      Error: ok ? '-' : 'HTTP bukan 200 / title kosong / challenge page'
    };
  } catch (error) {
    return {
      Source: target.name,
      URL: target.url,
      Status: '-',
      'Time(ms)': Date.now() - started,
      OK: 'NO',
      Title: '-',
      Error: error.code || error.message || 'Unknown error'
    };
  }
}

async function main() {
  console.log(`Manga source health check started: ${new Date().toISOString()}`);
  const results = [];
  for (const target of TARGETS) {
    results.push(await checkTarget(target));
  }
  console.table(results);

  const healthy = results.filter((item) => item.OK === 'YES').length;
  console.log(`Healthy sources: ${healthy}/${results.length}`);
}

main().catch((error) => {
  console.error('Checker fatal error was caught safely:', error);
  process.exitCode = 1;
});
