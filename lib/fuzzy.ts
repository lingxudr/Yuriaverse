export function distance(a: string, b: string) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return dp[a.length][b.length];
}
export function fuzzyMatch(text: string, query: string) {
  const q = query.trim().toLowerCase(); if (!q) return true;
  const t = text.toLowerCase(); if (t.includes(q)) return true;
  return t.split(/[^a-z0-9]+/i).some((w) => w.length > 2 && distance(w, q) <= Math.max(1, Math.floor(q.length * 0.25)));
}
export function fuzzyScore(text: string, query: string) {
  const q = query.trim().toLowerCase(); const t = text.toLowerCase();
  if (!q) return 0; if (t === q) return 1000; if (t.startsWith(q)) return 800; if (t.includes(q)) return 600;
  const best = Math.min(...t.split(/[^a-z0-9]+/i).filter(Boolean).map((w) => distance(w, q)), 99);
  return Math.max(0, 300 - best * 40);
}
