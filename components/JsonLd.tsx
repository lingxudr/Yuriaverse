export function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Animesu',
    url: 'https://animesu.vercel.app',
    description: 'Anime Streaming Subtitle Indonesia modern, cepat, dan responsif.',
    potentialAction: { '@type': 'SearchAction', target: 'https://animesu.vercel.app/search?q={search_term_string}', 'query-input': 'required name=search_term_string' }
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
