'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LightIcon } from './LightIcon';

const items = [
  ['/', 'Home', 'home'],
  ['/search', 'Search', 'search'],
  ['/jadwal', 'Schedule', 'calendar'],
  ['/favorite', 'Bookmark', 'bookmark'],
  ['/profile', 'Profile', 'user']
] as const;

export function MobileBottomNav(){
  const path = usePathname() || '/';
  return <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-[#0B0D17] px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 lg:hidden" aria-label="Navigasi bawah">
    <div className="mx-auto flex max-w-md items-center justify-between">
      {items.map(([href,label,icon])=>{
        const active = path === href || (href !== '/' && path.startsWith(href));
        return <Link key={href} href={href} prefetch={false} className={`flex min-h-[52px] min-w-[54px] flex-col items-center justify-center gap-1 rounded-2xl px-2 transition active:scale-95 ${active?'text-red-500':'text-gray-400 hover:text-gray-200'}`}>
          <LightIcon name={icon} size={21}/>
          <small className="text-[10px] font-semibold leading-none">{label}</small>
        </Link>;
      })}
    </div>
  </nav>;
}
