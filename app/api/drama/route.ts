import { NextResponse } from 'next/server';
import { listAll } from '../../../services/sansekai/drama';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:Request){const u=new URL(req.url); const provider=u.searchParams.get('provider')||'all'; const q=u.searchParams.get('q')||''; const type=u.searchParams.get('type')||'latest'; const limit=Math.min(80, Math.max(1, Number(u.searchParams.get('limit')||48))); const items=await listAll(provider,type,q,limit); return NextResponse.json({ok:true,data:{items,providers:['all','drakorid','dramabox','pinedrama','reelshort','shortmax','dramanova'],source:'sansekai-drama'}},{headers:{'cache-control':'s-maxage=300, stale-while-revalidate=900'}})}
