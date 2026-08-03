# Animesu / YuriaVerse Architecture Notes

## Routing

### App Router
- `/` homepage: `app/page.tsx` -> `components/HomeV4.tsx`
- `/anime`, `/donghua`, `/movie`, `/drama`: category/catalog pages
- `/anime/[slug]`: detail anime/donghua/movie/live-action via existing APIs
- `/episode/[slug]`: player page
- `/jadwal`: schedule page
- `/search`: global search
- `/dev/*`: private health monitors

### Pages Router
- `/manga`: `pages/manga.jsx`
- `/manga/[slug]`: manga detail
- `/manga/read/[id]`: manga reader
- manga APIs: `pages/api/manga/*`, `pages/api/scrape-*`

## Main UI Components
- `components/HomeV4.tsx`: YuriaVerse homepage UI only.
- `components/CategoryPage.tsx`: anime/donghua/movie category UI.
- `components/NetflixCatalogPage.tsx`: Netflix-style movie/drama catalog UI.
- `components/detail/AnimeDetailView.tsx`: detail anime UI.
- `components/detail/WatchPageView.tsx`: episode/player UI.
- `components/Player.tsx`: player iframe/server/settings UI.
- `components/BrandLogo.tsx`, `FooterLogo.tsx`: YuriaVerse branding.

## Manga Scraper
- Latest/merge: `lib/manga-latest-source.js`
- Provider health: `lib/manga-provider-health.js`
- Core scraper manager: `lib/manga-scraper/manager.js`
- Provider adapters: `lib/manga-scraper/providers/*`
- Parser core: `lib/manga-scraper/core/parser.js`
- Cache core: `lib/manga-scraper/core/cache.js`

Important behavior:
- Provider first-wins dedupe.
- Mirrors stored for fallback.
- Freshness-aware latest chapter.
- Provider health scoring + cooldown.
- Challenge detection avoids parsing Cloudflare/anti-bot pages.
- Wurmz/Natsu/ManhwaIndo are active/fallback providers.

## Drama / Drakor
- Service: `services/sansekai/drama.ts`
- DrakorID provider is integrated as `drakorid`.
- Drakor/Dracin labels are UI labels; route provider remains `drakorid`.
- DrakorID detail synthesizes episode list based on detected total episode when older episode URLs are not present.

## Telegram Bot
- Shared helper: `lib/telegramBot.js`
- Notify endpoint: `/api/telegram/notify`
- Public safe hourly endpoint: `/api/telegram/hourly`
- Webhook endpoint: `/api/telegram/webhook`
- Vercel Hobby does not allow hourly cron. Use cron-job.org or UptimeRobot to call `/api/telegram/hourly` every hour.

## Assets
- YuriaVerse assets: `public/brand/yuriaverse/*`
- PWA icons: `public/icons/*`, `public/icon.png`, `public/apple-touch-icon.png`
- Provider seed fallback: `public/data/provider-seeds/*`

## Do Not Change Without Explicit Request
- API routes and response shape.
- Provider env values.
- Auth/database schema.
- Manga reader image filtering rules.
- PWA cache strategy.
