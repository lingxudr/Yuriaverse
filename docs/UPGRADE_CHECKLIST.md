# Upgrade Checklist

Before deploy:

1. `npm run lint`
2. `npm run build`
3. Smoke test:
   - `/`
   - `/anime`
   - `/donghua`
   - `/movie`
   - `/drama`
   - `/manga`
   - `/jadwal`
   - `/search?q=one`
   - `/api/manga/latest`
   - `/api/drama?provider=drakorid&limit=5`
4. Deploy with Vercel project `animesu`.
5. After deploy, test alias `https://animesu.vercel.app`, not old deployment URLs.

Common cache issue:
- If UI looks unchanged, clear PWA/browser cache or open incognito.

Provider notes:
- Cloudflare/challenge providers should be optional/SKIP, not critical.
- Add new manga providers through `lib/manga-latest-source.js` + provider adapter if detail/reader is needed.
- Add new drama/movie source through `services/sansekai/drama.ts` only if endpoint/routes remain compatible.
