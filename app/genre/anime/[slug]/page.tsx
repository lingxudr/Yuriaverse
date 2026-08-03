import { apiGet } from '../../../../lib/siteApi';
import type { ListPayload } from '../../../../lib/types';
import { GenreDetailPage } from '../../../../components/GenreDetailPage';
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{page?:string}>}){const {slug}=await params; const sp=await searchParams; const page=Math.max(1,Number(sp.page||1)); const data=await apiGet<ListPayload>(`/api/anime/genre/${slug}?page=${page}`,{items:[],pagination:{page},source:'empty'}); return <GenreDetailPage slug={slug} category="Anime" data={data} page={page}/>}
