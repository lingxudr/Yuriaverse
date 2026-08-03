# AnimeSu Sanka Streaming

Website anime streaming berbasis **Next.js App Router** dengan seluruh data lewat backend API internal. Provider utama adalah **Sanka Vollerei Anime API** endpoint Otakudesu. Frontend tidak memanggil Sanka langsung.

## Fitur

- Home, Ongoing, Complete, Detail Anime, Episode, Search, Genre, Jadwal Rilis
- Streaming via `/api/anime/stream?id=SERVER_ID` dengan validasi URL embed
- Download episode dan batch JSON
- `SankaProvider` memakai **Adapter Pattern** (`AnimeProvider` interface)
- Fallback provider: endpoint Sanka Samehadaku
- Retry otomatis, timeout, structured logging JSON
- Cache bertingkat:
  1. Memory cache
  2. Redis cache opsional via Upstash REST
  3. Database cache opsional via Vercel Postgres
- Stale cache fallback jika upstream/provider gagal
- Health check: `/api/anime/health`
- Siap deploy ke Vercel

## Instalasi

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`.

## Environment

```env
SANKA_BASE_URL=https://www.sankavollerei.web.id
SANKA_TIMEOUT_MS=8000
SANKA_RETRIES=2

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
POSTGRES_URL=

CACHE_TTL_SHORT=120
CACHE_TTL_MEDIUM=900
CACHE_TTL_LONG=86400
```

Redis dan Postgres bersifat opsional. Jika env kosong, sistem tetap berjalan dengan memory cache dan fallback provider. Di Vercel, tambahkan Upstash Redis dan Vercel Postgres untuk cache persisten.

## Struktur penting

```txt
lib/providers/AnimeProvider.ts             # interface adapter
lib/providers/SankaProvider.ts             # provider utama Sanka Otakudesu
lib/providers/SamehadakuFallbackProvider.ts# provider cadangan
lib/providers/ProviderManager.ts           # retry provider + cache fallback
lib/cache/                                # memory, Upstash Redis, database cache
app/api/anime/**                          # semua endpoint backend internal
components/Player.tsx                     # player hanya load server valid dari backend
```

## Endpoint backend internal

- `GET /api/anime/home`
- `GET /api/anime/ongoing?page=1`
- `GET /api/anime/complete?page=1`
- `GET /api/anime/detail/:slug`
- `GET /api/anime/episode/:slug`
- `GET /api/anime/search?q=naruto&page=1`
- `GET /api/anime/genre`
- `GET /api/anime/genre/:slug?page=1`
- `GET /api/anime/schedule`
- `GET /api/anime/stream?id=:serverId`
- `GET /api/anime/download/batch/:slug`
- `GET /api/anime/health`

## Catatan sinkronisasi & performa

- Ongoing, episode, dan stream memakai TTL pendek agar update musim terbaru/episode cepat masuk.
- Complete, detail, search, genre, dan jadwal memakai TTL menengah/panjang sesuai volatilitas data.
- Jika Sanka gagal, `ProviderManager` otomatis mencoba fallback. Jika semuanya gagal, stale cache digunakan tanpa menampilkan error upstream ke pengguna.
- Route API memakai `cache-control` Vercel `s-maxage` + `stale-while-revalidate` untuk respons cepat.

## Validasi

Sudah diuji:

```bash
npm run typecheck
npm run build
```
