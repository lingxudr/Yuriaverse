import type { SVGProps } from 'react';

export type IconName =
  | 'arrow-up'
  | 'book-open'
  | 'bookmark'
  | 'calendar'
  | 'clapperboard'
  | 'coffee'
  | 'download'
  | 'film'
  | 'heart'
  | 'home'
  | 'menu'
  | 'refresh'
  | 'search'
  | 'share'
  | 'sparkles'
  | 'tv'
  | 'user'
  | 'x';

type LightIconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

const paths: Record<IconName, string[]> = {
  'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7'],
  'book-open': ['M4 5.5A2.5 2.5 0 0 1 6.5 3H21v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z', 'M4 5.5A2.5 2.5 0 0 0 1.5 3H3v18h-1.5A2.5 2.5 0 0 1 4 18.5', 'M12 3v16'],
  bookmark: ['M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z'],
  calendar: ['M7 2v4', 'M17 2v4', 'M4 9h16', 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'],
  clapperboard: ['M4 6h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z', 'M8 6l3-4', 'M14 6l3-4', 'M2 11h20'],
  coffee: ['M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z', 'M16 10h2a3 3 0 0 1 0 6h-2', 'M6 2v3', 'M10 2v3', 'M14 2v3'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
  film: ['M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M8 3v18', 'M16 3v18', 'M2 8h6', 'M16 8h6', 'M2 16h6', 'M16 16h6'],
  heart: ['M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z'],
  home: ['M3 11.5 12 4l9 7.5', 'M5 10v10h14V10', 'M9 20v-6h6v6'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  refresh: ['M20 12a8 8 0 1 1-2.34-5.66', 'M20 4v6h-6'],
  search: ['M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z', 'M21 21l-4.35-4.35'],
  share: ['M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .17 1L8.9 8.15a3 3 0 1 0 0 7.7L15.17 19A3 3 0 1 0 16 17.85L9.73 14.7a3.1 3.1 0 0 0 0-5.4L16 6.15A3 3 0 0 0 18 8Z'],
  sparkles: ['M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z', 'M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z', 'M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z'],
  tv: ['M4 6h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z', 'M8 22h8', 'M12 19v3'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21a8 8 0 0 1 16 0'],
  x: ['M18 6 6 18', 'M6 6l12 12']
};

export function LightIcon({ name, size = 24, strokeWidth = 2, ...props }: LightIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
