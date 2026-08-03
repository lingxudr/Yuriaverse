export type DramaProvider = 'dramabox' | 'reelshort' | 'shortmax' | 'pinedrama' | 'dramanova' | 'drakorid';
export type DramaItem = { id: string; provider: DramaProvider; title: string; poster?: string; description?: string; episodeCount?: string; genre?: string[]; country?: string; year?: string; status?: string; type?: string; url?: string; raw?: unknown };
export type DramaDetail = DramaItem & { altTitle?: string; banner?: string; episodes: DramaEpisode[] };
export type DramaEpisode = { episode: string; title: string; id?: string; url?: string };
export type StreamSource = { name: string; url: string; quality?: string };
