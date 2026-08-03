import { NextResponse } from 'next/server';
import { detail } from '../../../../../services/sansekai/drama';
import type { DramaProvider } from '../../../../../services/sansekai/types';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(_:Request, ctx:{params:Promise<{provider:string;id:string}>}){try{const {provider,id}=await ctx.params; const data=await detail(provider as DramaProvider,id); return NextResponse.json({ok:true,data},{headers:{'cache-control':'s-maxage=300, stale-while-revalidate=900'}})}catch(e){return NextResponse.json({ok:false,message:e instanceof Error?e.message:'Failed'},{status:500})}}
