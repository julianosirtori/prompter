const PATHS = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  clipboard: 'M9 4h6v3H9zM9 5.5H5.5v15h13v-15H15',
  trash: 'M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  action: 'M13 3L5 13.5h6L10 21l9-11.5h-6z',
  pause: 'M8 5v14M16 5v14',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M9 6l6 6-6 6',
  redo: 'M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5',
  takes: 'M4 6h11v12H4zM15 10l5-3v10l-5-3',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  filled?: boolean;
}

/** Decorative stroke icon; the control that holds it carries the accessible name. */
export function Icon({ name, size = 20, filled = false }: IconProps) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
