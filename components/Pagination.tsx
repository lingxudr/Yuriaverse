import Link from 'next/link';
function href(base:string,page:number){return `${base}${base.includes('?')?'&':'?'}page=${page}`}
export function Pagination({ page, base }: { page: number; base: string }) {
  return <div className="server-list" style={{marginTop:24}}>
    {page > 1 && <Link className="btn secondary" href={href(base,page-1)}>← Sebelumnya</Link>}
    <span className="chip">Halaman {page}</span>
    <Link className="btn secondary" href={href(base,page+1)}>Berikutnya →</Link>
  </div>;
}
