import { pageFrom, safeJson } from '../../../../lib/api';
import { getBatchList } from '../../../../lib/specialSources';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:Request){const page=pageFrom(req); return safeJson(()=>getBatchList(page), {items:[],pagination:{page},source:'batch-empty'});}
