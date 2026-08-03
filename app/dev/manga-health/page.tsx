import { MangaHealthClient } from '../../../components/dev/MangaHealthClient';
import { requireDevAccess } from '../../../lib/devAuth';

export const metadata = { title: 'Manga Scraper Health Monitor' };

export default async function Page({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const sp = await searchParams;
  requireDevAccess(sp.key);
  return <main className="wrap" style={{ paddingTop: 42 }}><h1>Manga Scraper Health</h1><p className="muted">Monitor private untuk status provider manga, latest API, detail scraper, dan reader image scraper.</p><MangaHealthClient secretKey={sp.key || ''}/></main>;
}
