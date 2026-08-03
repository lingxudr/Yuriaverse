// scheduler.js
// Menjalankan scraper-worker.js setiap 30 menit di VPS/lokal.
// Install: npm i node-cron axios cheerio p-limit

const cron = require('node-cron');
const { runScraper } = require('./scraper-worker');

let running = false;

async function safeRun(label = 'manual') {
  if (running) {
    console.log(`[scheduler] Skip ${label}: previous scraping job still running.`);
    return;
  }

  running = true;
  const started = Date.now();
  console.log(`[scheduler] Starting manga scraper (${label}) at ${new Date().toISOString()}`);

  try {
    const result = await runScraper();
    console.log(`[scheduler] Finished. total=${result.total}, duration=${Date.now() - started}ms`);
  } catch (error) {
    console.error('[scheduler] Scraper job failed safely:', error?.message || error);
  } finally {
    running = false;
  }
}

// Jalan setiap 30 menit sekali.
cron.schedule('*/30 * * * *', () => safeRun('cron-30-minutes'));

// Jalankan sekali saat scheduler start agar data langsung tersedia.
safeRun('startup');

console.log('[scheduler] Manga scraper scheduler is active. Cron: */30 * * * *');
