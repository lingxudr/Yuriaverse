'use client';

import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class MangaErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Manga page recovered from error:', error);
  }

  render() {
    if (this.state.hasError) {
      return <main className="min-h-screen bg-[#0B0D17] px-4 py-10 pb-28 text-[#F0F4FF]">
        <section className="mx-auto max-w-md rounded-3xl border border-gray-700 bg-[#191C2D] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,.35)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#0B0D17] text-3xl">📚</div>
          <h1 className="mt-4 text-2xl font-black tracking-[-.04em] text-white">Manga belum termuat</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">Ada kendala kecil saat menampilkan halaman Manga. Coba muat ulang halaman.</p>
          <button onClick={() => location.reload()} className="mt-5 min-h-11 rounded-full bg-[#E53935] px-5 text-sm font-black text-white active:scale-95">Refresh Halaman</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}
