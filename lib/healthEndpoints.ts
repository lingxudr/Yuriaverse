export type HealthEndpoint = {
  group: 'Anime' | 'Donghua' | 'Movie' | 'Live Action' | 'Core' | 'News';
  name: string;
  path: string;
  critical?: boolean;
};

export const healthEndpoints: HealthEndpoint[] = [

  { group: 'Core', name: 'Anidong Anime Ongoing', path: 'https://dh.zhadev.my.id/api/v1/anime/ongoing?page=1' },
  { group: 'Core', name: 'Anidong Anime Search', path: 'https://dh.zhadev.my.id/api/v1/anime/search?s=one&page=1' },
  { group: 'Core', name: 'Anidong Donghua Ongoing', path: 'https://dh.zhadev.my.id/api/v1/donghua/ongoing?page=1' },
  { group: 'Core', name: 'Anidong Donghua Search', path: 'https://dh.zhadev.my.id/api/v1/donghua/search?s=crowned&page=1' },
  { group: 'Core', name: 'Anidong Donghua Detail', path: 'https://dh.zhadev.my.id/api/v1/donghua/detail/crowned-in-a-hundred-days' },
  { group: 'Anime', name: 'Home', path: '/anime/home', critical: true },
  { group: 'Anime', name: 'Ongoing', path: '/anime/ongoing-anime?page=1', critical: true },
  { group: 'Anime', name: 'Completed', path: '/anime/complete-anime?page=1', critical: true },
  { group: 'Anime', name: 'Search', path: '/anime/search/one', critical: true },
  { group: 'Anime', name: 'Genres', path: '/anime/genre', critical: true },
  { group: 'Anime', name: 'Schedule', path: '/anime/schedule' },
  { group: 'Anime', name: 'Unlimited', path: '/anime/unlimited' },
  { group: 'Anime', name: 'Detail Sample', path: '/anime/anime/neko-ryuu-sub-indo', critical: true },
  { group: 'Donghua', name: 'Ongoing', path: '/anime/donghua/ongoing/1', critical: true },
  { group: 'Donghua', name: 'Completed', path: '/anime/donghua/completed/1' },
  { group: 'Donghua', name: 'Latest', path: '/anime/donghua/latest/1', critical: true },
  { group: 'Donghua', name: 'Genres', path: '/anime/donghua/genres' },
  { group: 'Donghua', name: 'Schedule', path: '/anime/donghua/schedule' },
  { group: 'Movie', name: 'Samehadaku Movies', path: '/anime/samehadaku/movies?page=1&order=update', critical: true },
  { group: 'Movie', name: 'Samehadaku Popular', path: '/anime/samehadaku/popular?page=1' },
  { group: 'Movie', name: 'Animasu Movies', path: '/anime/animasu/movies?page=1' },
  { group: 'Live Action', name: 'Animasu Live Action Search', path: '/anime/animasu/search/live%20action?page=1', critical: true },
  { group: 'Live Action', name: 'Animasu Schedule', path: '/anime/animasu/schedule' },
  { group: 'News', name: 'AniNews', path: 'https://aninews.vercel.app/api/news' }
];
