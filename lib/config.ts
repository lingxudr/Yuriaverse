export const config = {
  sankaBaseUrl: process.env.SANKA_BASE_URL || 'https://www.sankavollerei.web.id',
  timeoutMs: Number(process.env.SANKA_TIMEOUT_MS || 8000),
  retries: Number(process.env.SANKA_RETRIES || 2),
  cacheTtl: {
    short: Number(process.env.CACHE_TTL_SHORT || 120),
    medium: Number(process.env.CACHE_TTL_MEDIUM || 900),
    long: Number(process.env.CACHE_TTL_LONG || 86400)
  },
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  postgresUrl: process.env.POSTGRES_URL
};
