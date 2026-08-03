'use client';
import { ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
export function BackButton(){
  const router = useRouter();
  const path = usePathname();
  if (path === '/') return null;
  return <button className="floating-back" onClick={()=>router.back()} aria-label="Kembali ke halaman sebelumnya"><ArrowLeft size={18}/><span>Kembali</span></button>
}
