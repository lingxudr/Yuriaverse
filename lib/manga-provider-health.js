const { getCache, setCache } = require('./manga-scraper/core/cache');

const GLOBAL_KEY = '__ANIMESU_MANGA_PROVIDER_HEALTH_V1__';
const CACHE_KEY = 'provider-health:v2';
const PERSIST_TTL_MS = Number(process.env.MANGA_PROVIDER_HEALTH_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const FAIL_THRESHOLD = Number(process.env.MANGA_PROVIDER_DISABLE_AFTER_FAILS || 2);
const BASE_COOLDOWN_MS = Number(process.env.MANGA_PROVIDER_COOLDOWN_MS || 15 * 60 * 1000);
const MAX_COOLDOWN_MS = Number(process.env.MANGA_PROVIDER_MAX_COOLDOWN_MS || 24 * 60 * 60 * 1000);
const CHALLENGE_COOLDOWN_MS = Number(process.env.MANGA_PROVIDER_CHALLENGE_COOLDOWN_MS || 60 * 60 * 1000);

function providerKey(value = '') {
  return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

const PROTECTED = new Set(String(process.env.MANGA_PROVIDER_PROTECTED || 'Komiku').split(',').map((x) => x.trim()).filter(Boolean).map((x) => providerKey(x)));
const MANUAL_DISABLED = new Set(String(process.env.MANGA_DISABLED_PROVIDERS || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => providerKey(x)));

function state() {
  if (!globalThis[GLOBAL_KEY]) globalThis[GLOBAL_KEY] = { providers: {}, hydrated: false, hydrating: null, saving: false };
  return globalThis[GLOBAL_KEY];
}
function store() { return state().providers; }

async function hydrateProviderHealth() {
  const s = state();
  if (s.hydrated) return s.providers;
  if (s.hydrating) return s.hydrating;
  s.hydrating = (async () => {
    try {
      const hit = await getCache(CACHE_KEY, { stale: true });
      if (hit?.value && typeof hit.value === 'object') s.providers = { ...hit.value, ...s.providers };
    } catch {}
    s.hydrated = true;
    s.hydrating = null;
    return s.providers;
  })();
  return s.hydrating;
}

function persistProviderHealthSoon() {
  const s = state();
  if (s.saving) return;
  s.saving = true;
  setTimeout(() => {
    setCache(CACHE_KEY, s.providers, PERSIST_TTL_MS).catch(() => undefined).finally(() => { s.saving = false; });
  }, 25);
}

function baseHealth(provider) {
  const id = providerKey(typeof provider === 'string' ? provider : provider?.id || provider?.name || provider?.provider);
  return store()[id] || { id, name: typeof provider === 'string' ? provider : provider?.name || provider?.provider || id, success: 0, fail: 0, totalMs: 0, consecutiveFail: 0, lastOk: 0, lastError: '', lastChecked: 0, disabledUntil: 0, disabledReason: '', reasons: {} };
}

function isChallengeReason(reason = '') {
  return /cloudflare|challenge|captcha|turnstile|rate-limited|forbidden|anti-bot|access-denied/i.test(String(reason));
}

function cooldownFor(h, reason = '') {
  if (isChallengeReason(reason)) return Math.min(MAX_COOLDOWN_MS, Math.max(CHALLENGE_COOLDOWN_MS, BASE_COOLDOWN_MS));
  const exponent = Math.max(0, (h.consecutiveFail || 0) - FAIL_THRESHOLD);
  return Math.min(MAX_COOLDOWN_MS, BASE_COOLDOWN_MS * Math.pow(2, exponent));
}

function recordProviderHealth(provider, ok, ms = 0, reason = '') {
  const id = providerKey(typeof provider === 'string' ? provider : provider?.id || provider?.name || provider?.provider);
  const name = typeof provider === 'string' ? provider : provider?.name || provider?.provider || id;
  const all = store();
  const now = Date.now();
  const h = all[id] || baseHealth(provider);
  h.name = name || h.name;
  h.lastChecked = now;
  h.totalMs += Number(ms) || 0;
  if (ok) {
    h.success += 1;
    h.consecutiveFail = 0;
    h.lastOk = now;
    h.disabledUntil = 0;
    h.disabledReason = '';
  } else {
    h.fail += 1;
    h.consecutiveFail += 1;
    h.lastError = reason || 'provider-error';
    if (reason) h.reasons[reason] = (h.reasons[reason] || 0) + 1;
    if (!PROTECTED.has(id) && h.consecutiveFail >= FAIL_THRESHOLD) {
      const cooldown = cooldownFor(h, reason);
      h.disabledUntil = now + cooldown;
      h.disabledReason = reason || 'consecutive-failures';
      h.cooldownMs = cooldown;
    }
  }
  all[id] = h;
  persistProviderHealthSoon();
  return h;
}

function shouldSkipProvider(provider) {
  const id = providerKey(typeof provider === 'string' ? provider : provider?.id || provider?.name || provider?.provider);
  if (MANUAL_DISABLED.has(id)) return { skip: true, reason: 'manual-disabled', disabledUntil: Number.MAX_SAFE_INTEGER, remainingMs: Number.MAX_SAFE_INTEGER };
  if (PROTECTED.has(id)) return { skip: false, reason: 'protected', disabledUntil: 0, remainingMs: 0 };
  const h = baseHealth(provider);
  const now = Date.now();
  if (h.disabledUntil && h.disabledUntil > now) return { skip: true, reason: h.disabledReason || 'cooldown', disabledUntil: h.disabledUntil, remainingMs: h.disabledUntil - now };
  return { skip: false, reason: h.disabledUntil ? 'recovery-probe' : '', disabledUntil: h.disabledUntil || 0, remainingMs: 0 };
}

function providerHealth(provider) {
  const id = providerKey(typeof provider === 'string' ? provider : provider?.id || provider?.name || provider?.provider);
  const h = baseHealth(provider);
  const total = h.success + h.fail;
  const successRate = total ? h.success / total : 0.75;
  const avgMs = total ? Math.round(h.totalMs / total) : 0;
  const speedScore = avgMs ? Math.max(0, 20 - Math.min(20, avgMs / 500)) : 10;
  const reliabilityScore = successRate * 70;
  const recentPenalty = h.consecutiveFail * 12;
  const stalePenalty = h.lastChecked && Date.now() - h.lastChecked > 1000 * 60 * 60 ? 4 : 0;
  const score = Math.max(0, Math.min(100, Math.round(reliabilityScore + speedScore - recentPenalty - stalePenalty)));
  const skip = shouldSkipProvider(id);
  const status = skip.reason === 'manual-disabled' ? 'disabled-manual' : skip.skip ? 'disabled' : score >= 75 ? 'healthy' : score >= 45 ? 'degraded' : 'unhealthy';
  return { ...h, total, successRate, failureRate: total ? h.fail / total : 0, avgMs, score, status, skip, persistent: true, protected: PROTECTED.has(id), manualDisabled: MANUAL_DISABLED.has(id) };
}

function providerHealthSummary() {
  const all = store();
  const summary = {};
  for (const id of Object.keys(all)) summary[id] = providerHealth(id);
  for (const id of MANUAL_DISABLED) if (!summary[id]) summary[id] = providerHealth(id);
  return summary;
}

function mirrorProviderName(mirror = {}) { return mirror.provider || mirror.source || mirror.primaryProvider || mirror.latestProvider || 'unknown'; }
function sortMirrorsByHealth(mirrors = [], options = {}) {
  const includeDisabled = options.includeDisabled !== false;
  return [...(Array.isArray(mirrors) ? mirrors : [])]
    .filter((mirror) => includeDisabled || !shouldSkipProvider(mirrorProviderName(mirror)).skip)
    .sort((a, b) => {
      const ah = providerHealth(mirrorProviderName(a));
      const bh = providerHealth(mirrorProviderName(b));
      const askip = ah.skip?.skip ? 1 : 0;
      const bskip = bh.skip?.skip ? 1 : 0;
      if (askip !== bskip) return askip - bskip;
      if (bh.score !== ah.score) return bh.score - ah.score;
      return 0;
    });
}

module.exports = { providerKey, recordProviderHealth, providerHealth, providerHealthSummary, sortMirrorsByHealth, mirrorProviderName, shouldSkipProvider, hydrateProviderHealth, FAIL_THRESHOLD, BASE_COOLDOWN_MS, MAX_COOLDOWN_MS, CHALLENGE_COOLDOWN_MS, PERSIST_TTL_MS };
