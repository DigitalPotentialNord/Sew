/** Präzise 16px-Icons, 1.5px Strich, keine Dekoration. */
import type { JSX } from 'react';

interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly className?: string;
  readonly strokeWidth?: number;
}

export type IconName =
  | 'plus' | 'minus' | 'search' | 'chevron' | 'chevronDown' | 'chevronRight' | 'close' | 'check'
  | 'undo' | 'redo' | 'download' | 'upload' | 'printer' | 'image' | 'file' | 'trash' | 'copy'
  | 'lock' | 'unlock' | 'grid' | 'magnet' | 'zoomIn' | 'zoomOut' | 'fit' | 'rotate' | 'menu'
  | 'alert' | 'info' | 'error' | 'layers' | 'scissors' | 'ruler' | 'spool' | 'needle' | 'list'
  | 'settings' | 'folder' | 'sparkle' | 'arrowRight' | 'arrowLeft' | 'arrowUp' | 'arrowDown' | 'swap' | 'book' | 'help' | 'reset' | 'shield' | 'award' | 'drag' | 'pocket' | 'divided' | 'zip'
  | 'loops' | 'strap' | 'channel' | 'button' | 'ring' | 'earring' | 'necklace' | 'brush' | 'flap'
  | 'pouch' | 'tape' | 'scissorsTool' | 'sliders' | 'play' | 'save' | 'eye' | 'eyeOff' | 'pencil';

const P: Record<IconName, JSX.Element> = {
  plus: <path d="M8 3v10M3 8h10" />,
  minus: <path d="M3 8h10" />,
  search: <><circle cx="7" cy="7" r="4.2" /><path d="M10.2 10.2L14 14" /></>,
  chevron: <path d="M4 6l4 4 4-4" />,
  chevronDown: <path d="M4 6l4 4 4-4" />,
  chevronRight: <path d="M6 4l4 4-4 4" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  check: <path d="M3 8.5l3.2 3.2L13 5" />,
  undo: <><path d="M6 5H9.5a3.5 3.5 0 010 7H7" /><path d="M8 2.5L5.5 5 8 7.5" /></>,
  redo: <><path d="M10 5H6.5a3.5 3.5 0 000 7H9" /><path d="M8 2.5L10.5 5 8 7.5" /></>,
  download: <><path d="M8 2v8" /><path d="M5 7.5L8 10.5 11 7.5" /><path d="M2.5 12.5h11" /></>,
  upload: <><path d="M8 11V3" /><path d="M5 5.5L8 2.5 11 5.5" /><path d="M2.5 12.5h11" /></>,
  printer: <><path d="M4.5 6V2.5h7V6" /><rect x="2" y="6" width="12" height="5" rx="1" /><path d="M4.5 11h7v2.5h-7z" /></>,
  image: <><rect x="2.5" y="3" width="11" height="10" rx="1" /><circle cx="6" cy="6.5" r="1" /><path d="M3 11l3.5-3 2.5 2 2-1.5 2 2.5" /></>,
  file: <><path d="M4 2.5h5l3 3v8H4z" /><path d="M9 2.5v3h3" /></>,
  trash: <><path d="M2.5 4.5h11" /><path d="M6 4.5V3h4v1.5" /><path d="M4 4.5l.7 9h6.6l.7-9" /></>,
  copy: <><rect x="5.5" y="5.5" width="8" height="8" rx="1" /><path d="M10.5 5.5V3a.5.5 0 00-.5-.5H3a.5.5 0 00-.5.5v7a.5.5 0 00.5.5h2" /></>,
  lock: <><rect x="3.5" y="7" width="9" height="6.5" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></>,
  unlock: <><rect x="3.5" y="7" width="9" height="6.5" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 014.8-1" /></>,
  grid: <><path d="M2.5 6h11M2.5 10h11M6 2.5v11M10 2.5v11" /></>,
  magnet: <><path d="M5 3v5a3 3 0 006 0V3" /><path d="M5 3h2.5M8.5 3H11" /><path d="M5 6h2.5M8.5 6H11" /></>,
  zoomIn: <><circle cx="7" cy="7" r="4.2" /><path d="M5.5 7h3M7 5.5v3M10.2 10.2L14 14" /></>,
  zoomOut: <><circle cx="7" cy="7" r="4.2" /><path d="M5.5 7h3M10.2 10.2L14 14" /></>,
  fit: <><path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" /></>,
  rotate: <><path d="M3 8a5 5 0 018.5-3.5" /><path d="M12 2v3.5H8.5" /><circle cx="8" cy="8" r="1.2" /></>,
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />,
  alert: <><path d="M8 2.5L14.5 13.5h-13z" /><path d="M8 6.5v3.2M8 11.8v.4" /></>,
  info: <><circle cx="8" cy="8" r="5.8" /><path d="M8 7.2v3.6M8 5.4v.3" /></>,
  error: <><circle cx="8" cy="8" r="5.8" /><path d="M6 6l4 4M10 6l-4 4" /></>,
  layers: <><path d="M8 2.5l5.5 3L8 8.5 2.5 5.5z" /><path d="M2.5 8.5L8 11.5l5.5-3" /><path d="M2.5 11.2L8 14.2l5.5-3" /></>,
  scissors: <><circle cx="4" cy="11.5" r="2" /><circle cx="4" cy="4.5" r="2" /><path d="M5.6 10.2L13 3M5.6 5.8L13 13" /></>,
  ruler: <><rect x="2" y="5.5" width="12" height="5" rx=".8" transform="rotate(-8 8 8)" /><path d="M4.5 6.4v1.6M6.5 6.2v2M8.5 6v1.6M10.5 5.8v2" /></>,
  spool: <><rect x="3.5" y="4" width="9" height="8" rx="1" /><path d="M3.5 6.5h9M3.5 9.5h9" /></>,
  needle: <><path d="M13 3L4 12" /><circle cx="12.2" cy="3.8" r="1.2" /><path d="M4 12l-1 1" /></>,
  list: <path d="M3 4.5h10M3 8h10M3 11.5h7" />,
  settings: <><circle cx="8" cy="8" r="2.2" /><path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2" /></>,
  folder: <path d="M2 4.5A1 1 0 013 3.5h3l1.2 1.5H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1z" />,
  sparkle: <><path d="M8 2l1.3 3.4L12.5 6.6 9.3 8 8 11.5 6.7 8 3.5 6.6 6.7 5.4z" /><path d="M12.5 10.5l.6 1.4 1.4.6-1.5.6-.5 1.4-.6-1.4-1.4-.6 1.4-.6z" /></>,
  arrowRight: <><path d="M3 8h10" /><path d="M9.5 4.5L13 8l-3.5 3.5" /></>,
  arrowLeft: <><path d="M13 8H3" /><path d="M6.5 4.5L3 8l3.5 3.5" /></>,
  arrowUp: <><path d="M8 13V3" /><path d="M4.5 6.5L8 3l3.5 3.5" /></>,
  arrowDown: <><path d="M8 3v10" /><path d="M4.5 9.5L8 13l3.5-3.5" /></>,
  swap: <><path d="M3 5.5h10M10.5 3L13 5.5 10.5 8" /><path d="M13 10.5H3M5.5 8L3 10.5 5.5 13" /></>,
  book: <><path d="M2.5 3.5h4.5a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 00-1.5-1.5H2.5z" /><path d="M13.5 3.5H9A1.5 1.5 0 007.5 5v8A1.5 1.5 0 019 11.5h4.5z" /></>,
  help: <><circle cx="8" cy="8" r="6" /><path d="M6.2 6.3a1.9 1.9 0 013.6.7c0 1.2-1.8 1.5-1.8 2.6" /><circle cx="8" cy="11.7" r=".6" fill="currentColor" stroke="none" /></>,
  reset: <><path d="M3.5 8a4.5 4.5 0 101.2-3.1" /><path d="M3.5 3v2.6h2.6" /></>,
  shield: <path d="M8 2.2l5 2v3.6c0 3.2-2.2 5.4-5 6.4-2.8-1-5-3.2-5-6.4V4.2l5-2z" />,
  award: <><circle cx="8" cy="6.2" r="3.6" /><path d="M6 9.5L5 14l3-1.6L11 14l-1-4.5" /></>,
  drag: <><circle cx="6" cy="4" r="1" /><circle cx="10" cy="4" r="1" /><circle cx="6" cy="8" r="1" /><circle cx="10" cy="8" r="1" /><circle cx="6" cy="12" r="1" /><circle cx="10" cy="12" r="1" /></>,
  pocket: <><path d="M2.5 4.5h11v7h-11z" /><path d="M2.5 7h11" /></>,
  divided: <><path d="M2.5 4.5h11v7h-11z" /><path d="M2.5 7h11M6.2 7v4.5M9.8 7v4.5" /></>,
  zip: <><path d="M2.5 4.5h11v7h-11z" /><path d="M2.5 6.8h11" strokeDasharray="1 1.4" /><circle cx="4.2" cy="6.8" r=".8" /></>,
  loops: <><path d="M2 5v6M5 5v6M8 5v6M11 5v6M14 5v6" /></>,
  strap: <><path d="M4 2.5h3v11H4z" /><path d="M11 2.5h3v11h-3z" /><path d="M7 8h4" strokeDasharray="2 1.5" /></>,
  channel: <><path d="M5 2v12M11 2v12" /><path d="M5 5h6M5 8h6M5 11h6" strokeDasharray="2 1.5" /></>,
  button: <><circle cx="8" cy="8" r="4.5" /><circle cx="6.6" cy="6.6" r=".7" /><circle cx="9.4" cy="6.6" r=".7" /><circle cx="6.6" cy="9.4" r=".7" /><circle cx="9.4" cy="9.4" r=".7" /></>,
  ring: <><circle cx="8" cy="8" r="4" /><circle cx="8" cy="8" r="1.6" /></>,
  earring: <><circle cx="6" cy="6" r="2" /><circle cx="10" cy="6" r="2" /><path d="M6 8v5M10 8v5" /></>,
  necklace: <><path d="M3 3v4a5 5 0 0010 0V3" /><circle cx="8" cy="12" r="1.2" /></>,
  brush: <><path d="M6 2h4l-.6 7H6.6z" /><path d="M6.2 9h3.6v2.5a1.8 1.8 0 01-3.6 0z" /></>,
  flap: <><path d="M2.5 2.5h11v9h-11z" /><path d="M2.5 5.5h11" /><path d="M5.5 12v1.5h5V12" strokeDasharray="2 1.5" /></>,
  pouch: <><path d="M4 5h8l-1 8.5H5z" /><path d="M4 5c0-1.4 1.8-2.5 4-2.5S12 3.6 12 5" /><path d="M5.5 7.5h5" strokeDasharray="1.5 1.5" /></>,
  tape: <><circle cx="8" cy="8" r="5" /><circle cx="8" cy="8" r="1.5" /><path d="M11.5 11.5l2 2" /></>,
  scissorsTool: <><circle cx="4.5" cy="11" r="1.8" /><circle cx="4.5" cy="5" r="1.8" /><path d="M6 9.8L12.5 3M6 6.2L12.5 13" /></>,
  sliders: <><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /><circle cx="6" cy="4.5" r="1.4" fill="currentColor" /><circle cx="10" cy="8" r="1.4" fill="currentColor" /><circle cx="5" cy="11.5" r="1.4" fill="currentColor" /></>,
  play: <path d="M5 3.5l7 4.5-7 4.5z" />,
  save: <><path d="M3 3h8l2 2v8H3z" /><path d="M5.5 3v3.5h5V3" /><path d="M5.5 13V9h5v4" /></>,
  eye: <><path d="M1.5 8S4 4 8 4s6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4z" /><circle cx="8" cy="8" r="1.8" /></>,
  eyeOff: <><path d="M6.2 4.3A6.7 6.7 0 018 4c4 0 6.5 4 6.5 4a12 12 0 01-2.2 2.6M4 5.6C2.4 6.9 1.5 8 1.5 8S4 12 8 12a6.6 6.6 0 002.4-.5" /><path d="M2 2l12 12" /></>,
  pencil: <><path d="M11 2.5l2.5 2.5L5.5 13H3v-2.5z" /><path d="M9.5 4l2.5 2.5" /></>,
};

export function Icon({ name, size = 16, className, strokeWidth = 1.5 }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {P[name]}
    </svg>
  );
}

export function ModuleIcon({ icon, size = 16 }: { readonly icon: string; readonly size?: number }): JSX.Element {
  const map: Record<string, IconName> = {
    pocket: 'pocket',
    divided: 'divided',
    zip: 'zip',
    loops: 'loops',
    strap: 'strap',
    channel: 'channel',
    button: 'button',
    ring: 'ring',
    earring: 'earring',
    necklace: 'necklace',
    brush: 'brush',
    flap: 'flap',
    pouch: 'pouch',
    tape: 'tape',
    scissors: 'scissorsTool',
  };
  return <Icon name={map[icon] ?? 'layers'} size={size} />;
}
