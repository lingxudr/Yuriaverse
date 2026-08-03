import { pageFrom, safeJson } from '../../../../../lib/api';
import { getKusonimeTypeList } from '../../../../../lib/specialSources';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:Request, ctx:{params:Promise<{type:string}>}){const {type}=await ctx.params; const page=pageFrom(req); return safeJson(()=>getKusonimeTypeList(type,page), {items:[],pagination:{page},source:'type-empty'});}
