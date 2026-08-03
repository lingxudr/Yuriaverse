const enabled = process.env.SANKA_DEBUG === '1' || process.env.NODE_ENV === 'development';
const imageFields = ['poster','thumbnail','image','cover','banner','img','imageUrl','coverUrl','posterUrl'];
const requiredFields = ['title','judul','anime','name','poster','thumbnail','image','cover','score','rating','status','slug','id','animeId'];
function collectKeys(obj: any, depth = 2, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object' || depth < 0) return [];
  return Object.entries(obj).flatMap(([k, v]) => [prefix + k, ...(v && typeof v === 'object' && !Array.isArray(v) ? collectKeys(v, depth - 1, `${prefix}${k}.`) : [])]);
}
function firstArray(obj: any): any[] { if (Array.isArray(obj)) return obj; if (!obj || typeof obj !== 'object') return []; for (const v of Object.values(obj)) { const a = firstArray(v); if (a.length) return a; } return []; }
export function debugSankaResponse(url: string, status: number, json: any, ms: number) {
  if (!enabled || !url.includes('sankavollerei')) return;
  const arr = firstArray(json); const sample = arr[0] || json?.data || json; const keys = collectKeys(sample);
  const missing = requiredFields.filter((f) => !keys.includes(f) && !keys.some((k) => k.endsWith('.' + f)));
  const imageUrl = imageFields.map((f) => sample?.[f] || sample?.images?.jpg?.image_url || sample?.images?.webp?.image_url).find(Boolean);
  console.info('[SANKA_AUDIT]', JSON.stringify({ endpoint: url, status, ms, itemCount: arr.length, topKeys: Object.keys(json || {}), sampleKeys: keys.slice(0,50), missingFields: missing, imageUrl, fallbackUsed: !imageUrl }));
}
