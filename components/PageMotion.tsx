'use client';
import { usePathname } from 'next/navigation';

export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/') return <>{children}</>;
  return <div key={pathname} className="page-motion-lite">{children}</div>;
}
