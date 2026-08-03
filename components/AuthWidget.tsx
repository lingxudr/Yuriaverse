'use client';
import Link from 'next/link';
import Image from 'next/image';
import { getProviders, signIn, signOut, useSession } from 'next-auth/react';
import { LogOut, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AuthWidget(){
  const { data: session, status } = useSession();
  const [hasGoogle, setHasGoogle] = useState(false);
  useEffect(()=>{getProviders().then((p)=>setHasGoogle(Boolean(p?.google))).catch(()=>setHasGoogle(false));},[]);
  const user = session?.user;
  if (status === 'loading') return <div className="auth-loading" aria-label="Memuat akun"/>;
  if (user) return <div className="auth-user-menu"><Link href="/profile" className="auth-avatar" aria-label="Buka profil">{user.image ? <Image src={user.image} alt={user.name || user.email || 'Avatar pengguna'} width={34} height={34}/> : <UserRound size={18}/>}<span>{user.name || user.email?.split('@')[0]}</span></Link><button className="icon-btn" onClick={()=>signOut({ callbackUrl: '/' })} aria-label="Logout"><LogOut size={17}/></button></div>;
  return <button className="btn auth-btn" disabled={!hasGoogle} title={!hasGoogle ? 'Login Google segera hadir' : 'Login dengan Google'} onClick={()=>signIn('google', { callbackUrl: '/profile' })}>{hasGoogle ? 'Login Google' : 'Akun'}</button>;
}
