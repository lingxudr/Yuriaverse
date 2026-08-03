import './globals.css';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/header.css';
import './styles/home.css';
import './styles/category.css';
import './styles/detail.css';
import './styles/player.css';
import './styles/schedule.css';
import './styles/news.css';
import './styles/pwa.css';
import './styles/mobile.css';
import './styles/final-polish.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { PWARegister } from '../components/PWARegister';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { JsonLd } from '../components/JsonLd';
import { PageMotion } from '../components/PageMotion';
import { AppHeader } from '../components/AppHeader';
import { FooterLogo } from '../components/FooterLogo';
import { DeferredClientExtras } from '../components/DeferredClientExtras';
import { AuthProvider } from '../components/auth/AuthProvider';
import { BackButton } from '../components/BackButton';

export const metadata: Metadata = {
  metadataBase: new URL('https://animesu.vercel.app'),
  title: { default: 'Animesu - Nonton Anime, Donghua & Movie Subtitle Indonesia', template: '%s | Animesu' },
  description: 'Nonton anime, donghua, dan movie subtitle Indonesia di Animesu. Update ongoing, complete, jadwal rilis, ranking, genre, favorite, history, dan PWA mobile-first.',
  manifest: '/manifest.json',
  icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icons/icon-192x192.png', type: 'image/png' }], apple: [{ url: '/apple-touch-icon.png', type: 'image/png' }] },
  keywords: ['Animesu','nonton anime','streaming anime','anime subtitle indonesia','donghua subtitle indonesia','anime movie','jadwal anime','anime ongoing','anime complete'],
  alternates: { canonical: 'https://animesu.vercel.app' },
  openGraph: { title: 'Animesu - Anime Streaming Subtitle Indonesia', description: 'Nonton anime, donghua, dan movie subtitle Indonesia dengan UI mobile-first.', url: 'https://animesu.vercel.app', siteName: 'Animesu', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }, { url: '/brand/animesu-logo-horizontal-dark.png', width: 760, height: 220 }] },
  twitter: { card: 'summary_large_image', title: 'Animesu - Nonton Anime Subtitle Indonesia', description: 'Streaming anime, donghua, movie, jadwal rilis, dan ranking terbaru.', images: ['/og-image.png'] },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: 'Animesu', statusBarStyle: 'black-translucent' },
  applicationName: 'Animesu',
  other: { 'mobile-web-app-capable': 'yes', 'msapplication-TileColor': '#ef4444', 'msapplication-TileImage': '/icons/icon-144x144.png' }
};
export const viewport: Viewport = { themeColor: '#EF4444', width: 'device-width', initialScale: 1 };

const nav = [['/','Home'],['/trending','Trending'],['/anime','Semua Anime'],['/ongoing','Ongoing'],['/movie','Movie'],['/complete','Complete'],['/donghua','Donghua'],['/genre','Genre'],['/jadwal','Jadwal'],['/ranking','Ranking'],['/search','Search'],['/profile','Profile']];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>
    <a href="#main-content" className="skip-link">Lewati ke konten utama</a><JsonLd/><PWARegister />
    <AuthProvider><DeferredClientExtras/><AppHeader/>
    <BackButton/>
    <main id="main-content"><PageMotion>{children}</PageMotion></main></AuthProvider>
    <MobileBottomNav />
    <footer className="footer footer-minimal"><div className="wrap footer-minimal-inner"><FooterLogo/><nav className="footer-minimal-links" aria-label="Footer"><Link href="/about">Tentang Animesu</Link><Link href="/contact">Contact</Link></nav><div className="footer-version"><span>© 2026 Animesu</span><span>Version 1.0.0</span></div></div></footer>
  </body></html>;
}
