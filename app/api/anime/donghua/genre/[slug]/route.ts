import { pageFrom, safeJson } from '../../../../../../lib/api';
import { getDonghuaGenreList } from '../../../../../../lib/specialSources';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:Request, ctx:{params:Promise<{slug:string}>}){const {slug}=await ctx.params; const page=pageFrom(req); return safeJson(()=>getDonghuaGenreList(slug,page), {items:[],pagination:{page},source:'donghua-genre-empty'});}
