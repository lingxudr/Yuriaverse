const cheerio = require('cheerio');
const { cached } = require('./core/cache');
const { fetchHtml } = require('./core/http');
const { providerForUrl, providers } = require('./providers');
const { validatePublicUrl } = require('./core/utils');
const { recordProviderHealth, providerHealthSummary, shouldSkipProvider } = require('../manga-provider-health');

const TTL = {
  detail: Number(process.env.MANGA_DETAIL_CACHE_TTL_MS || 24 * 60 * 60 * 1000),
  chapter: Number(process.env.MANGA_CHAPTER_CACHE_TTL_MS || 6 * 60 * 60 * 1000)
};

const health = new Map();
function record(provider, ok, ms, reason = '') {
  const h = health.get(provider.id) || { success: 0, fail: 0, totalMs: 0, reasons: {} };
  if (ok) h.success++; else h.fail++;
  if (reason) h.reasons[reason] = (h.reasons[reason] || 0) + 1;
  h.totalMs += ms || 0;
  health.set(provider.id, h);
  recordProviderHealth(provider, ok, ms, reason);
}
function stats(provider) {
  const h = health.get(provider.id) || { success: 0, fail: 0, totalMs: 0, reasons: {} };
  const total = h.success + h.fail;
  return { successRate: total ? h.success / total : 1, failureRate: total ? h.fail / total : 0, avgMs: total ? Math.round(h.totalMs / total) : 0, reasons: h.reasons };
}

function providerCandidates(url) {
  const primary = providerForUrl(url);
  const fallback = providers.filter((provider) => provider.id !== primary.id && provider.id === 'generic');
  const candidates = [primary, ...fallback].filter((provider, index) => index === 0 || !shouldSkipProvider(provider).skip);
  return candidates.length ? candidates : [primary];
}

async function scrapeDetail(url) {
  const safe = await validatePublicUrl(url);
  if (!safe) throw new Error('Invalid URL');
  return cached(`detail:v3:${safe}`, TTL.detail, async () => {
    let lastError;
    for (const provider of providerCandidates(safe)) {
      const started = Date.now();
      try {
        const { html, responseTime, finalUrl } = await fetchHtml(safe);
        const parsed = provider.parseDetail(html, finalUrl || safe);
        const valid = provider.validateDetail(parsed);
        record(provider, valid, responseTime, valid ? '' : 'invalid-detail');
        if (valid) return { ...parsed, provider: provider.name, health: stats(provider) };
        lastError = new Error('invalid detail parse');
      } catch (error) {
        lastError = error;
        record(provider, false, Date.now() - started, error?.message || 'detail-error');
      }
    }
    throw lastError || new Error('All detail providers failed');
  });
}

async function scrapeChapterImages(url) {
  const safe = await validatePublicUrl(url);
  if (!safe) throw new Error('Invalid URL');
  return cached(`chapter:v3:${safe}`, TTL.chapter, async () => {
    let lastError;
    for (const provider of providerCandidates(safe)) {
      const started = Date.now();
      try {
        const { html, responseTime, finalUrl } = await fetchHtml(safe);
        const $ = cheerio.load(html || '');
        const images = provider.parseReaderImages($, finalUrl || safe);
        const valid = provider.validateReader(images);
        record(provider, valid, responseTime, valid ? '' : 'invalid-reader');
        if (valid) return { images, provider: provider.name, health: stats(provider) };
        lastError = new Error(`Reader images invalid: ${images.length}`);
      } catch (error) {
        lastError = error;
        record(provider, false, Date.now() - started, error?.message || 'reader-error');
      }
    }
    throw lastError || new Error('All reader providers failed');
  });
}

module.exports = { scrapeDetail, scrapeChapterImages, healthStats: () => ({ parser: Object.fromEntries([...health.entries()]), providers: providerHealthSummary() }) };
