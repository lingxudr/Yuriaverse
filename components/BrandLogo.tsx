import Image from 'next/image';
import Link from 'next/link';

export function BrandLogo({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return <Link href={href} className={`brand-logo-v2 ${compact ? 'compact' : ''}`} aria-label="YuriaVerse Home">
    <span className="brand-mascot-v2"><Image src="/brand/yuriaverse/avatar-v2.png" alt="YuriaVerse mascot" width={48} height={48} priority/></span>
    <span className="brand-text-v2"><b>YuriaVerse</b><small>ユリアバース</small></span>
  </Link>;
}
