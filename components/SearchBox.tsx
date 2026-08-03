'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
export function SearchBox({ defaultValue = '' }: { defaultValue?: string }) {
  const [q, setQ] = useState(defaultValue); const router = useRouter();
  function submit(e: FormEvent) { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }
  return <form className="search" onSubmit={submit}><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari anime favorit..."/><button className="btn">Cari</button></form>;
}
