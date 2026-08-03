import { NextResponse } from 'next/server';
import { episode } from '../../../../../../../services/sansekai/drama';
import type { DramaProvider } from '../../../../../../../services/sansekai/types';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(_:Request, ctx:{params:Promise<{provider:string;id:string;episode:string}>}){try{const {provider,id,episode:ep}=await ctx.params; const data=await episode(provider as DramaProvider,id,ep); return NextResponse.json({ok:true,data},{headers:{'cache-control':'no-store'}})}catch(e){return NextResponse.json({ok:false,message:e instanceof Error?e.message:'Failed'},{status:500})}}
