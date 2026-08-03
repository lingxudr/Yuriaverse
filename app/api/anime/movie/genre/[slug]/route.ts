import { pageFrom, safeJson } from '../../../../../../lib/api';
import { getMovieGenreList } from '../../../../../../lib/specialSources';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:Request, ctx:{params:Promise<{slug:string}>}){const {slug}=await ctx.params; const page=pageFrom(req); return safeJson(()=>getMovieGenreList(slug,page), {items:[],pagination:{page},source:'movie-genre-empty'});}
