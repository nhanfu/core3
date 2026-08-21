const ICON_PATHS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 5 5"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>',
  upload: '<path d="M12 15V3m0 0 4 4m-4-4L8 7M5 21h14"/>',
  settings: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="3"/>',
  filter: '<path d="M4 5h16M7 12h10m-7 7h4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-1.1 1-1.8 1.3-1.8 2.8M12 17h.01"/>',
  columns: '<rect x="4" y="4" width="6" height="16" rx="1"/><rect x="14" y="4" width="6" height="16" rx="1"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-4L3 10m0 0V5m0 5h5M4 13a8 8 0 0 0 14.8 4L21 14m0 0v5m0-5h-5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  message: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.3 8.3 0 0 1-3.4-.7L4 20l1.3-3.3A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/>',
  panel: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16"/>',
  'eye-off': '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.7 3.5 10 7-0.4 1.1-1.1 2.3-2.1 3.3M6.2 6.2C4.6 7.2 3.4 8.7 2 12c1.3 3.5 5 7 10 7 1 0 2-.2 2.9-.5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  'log-out': '<path d="M10 17l5-5-5-5M15 12H3M21 3v18"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'more-vertical': '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  'arrow-right': '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5m6 6-6-6 6-6"/>',
  'arrow-up': '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  'arrow-down': '<path d="M12 5v14m6-6-6 6-6-6"/>',
  moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  logo: '<path d="m5 18 14-14M5 5h7v7M19 19h-7v-7M3 13l5-5M21 13l-5 5"/>',
  document: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h5M8 15h8M8 19h5"/>',
  quote: '<path d="m12 3 8 9-8 9-8-9 8-9Z"/><path d="M12 7v10M8 12h8"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 13h3M13 13h3M8 17h3"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c.8-4 3.5-6 7-6s6.2 2 7 6M16 5a4 4 0 0 1 0 7M17 15c2.5.8 4 2.8 5 6"/>',
  warning: '<path d="m12 3 9 18H3L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.1 5.1L4 17a2.1 2.1 0 1 0 3 3l5.6-5.6a4 4 0 0 0 5.1-5.1l-2.4 2.4-2.1-.5-.5-2.1 2.4-2.4Z"/>',
  report: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5M8 18h3"/>',
  analytics: '<path d="m12 2 9 10-9 10-9-10 9-10Z"/><circle cx="12" cy="12" r="2"/>',
  file: '<path d="M5 3h10l4 4v14H5V3Z"/><path d="M15 3v5h5M8 12h8M8 16h6"/>',
  table: '<rect x="4" y="3" width="18" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h8M8 19h8"/>',
  pin: '<circle cx="12" cy="10" r="6"/><circle cx="12" cy="10" r="2"/><path d="M12 16v5"/>',
  grid: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v14M16 5v14"/>',
  menu: '<path d="M5 6h14M5 12h14M5 18h14"/>',
  money: '<path d="M7 4h6a5 5 0 0 1 0 10H7V4Zm0 0v16M4 8h12M4 18h12"/>',
  home: '<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-6h6v6"/>',
  activity: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  number: '<path d="M9 3 7 21M17 3l-2 18M4 9h16M3 15h16"/>',
  printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/>',
  status: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 2 2m-5 1 2 2"/>',
  google: '<path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1Z"/><path d="M12 21c2.6 0 4.8-.9 6.3-2.5l-3.1-2.4c-.9.6-1.9 1-3.2 1-2.5 0-4.6-1.7-5.4-4H3.4v2.5A9.5 9.5 0 0 0 12 21Z"/><path d="M6.6 13.1a5.7 5.7 0 0 1 0-2.2V8.4H3.4a9.5 9.5 0 0 0 0 7.2l3.2-2.5Z"/><path d="M12 6.8c1.4 0 2.7.5 3.7 1.5l2.8-2.8C16.8 3.8 14.6 3 12 3a9.5 9.5 0 0 0-8.6 5.4l3.2 2.5c.8-2.4 2.9-4.1 5.4-4.1Z"/>',
  microsoft: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  lightbulb: '<path d="M9 18h6M10 22h4M8.5 14.5A6 6 0 1 1 16 14c-.8.7-1 1.3-1 2H9c0-.7-.2-1.3-.5-1.5Z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  sort: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
  'sort-ascending': '<path d="m4 10 8-8 8 8"/>',
  'sort-descending': '<path d="m4 14 8 8 8-8"/>',
  edit: '<path d="m4 16.5-.8 3.3 3.3-.8L18.8 6.7a2.3 2.3 0 0 0-3.3-3.3L4 16.5Z"/><path d="m14.3 4.7 3.3 3.3"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M9 7V4h6v3m-9 0 1 14h10l1-14"/>',
  sparkles: '<path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
  cart: '<path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L20 8H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
  repeat: '<path d="M17 2l4 4-4 4V7H7a4 4 0 0 0-3.5 2M7 22l-4-4 4-4v3h10a4 4 0 0 0 3.5-2"/>',
  invoice: '<path d="M5 2h14v20l-3-2-4 2-4-2-3 2V2Z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/>',
  warehouse: '<path d="m3 10 9-6 9 6v10H3V10Z"/><path d="M7 20v-6h3v6m4 0v-6h3v6M3 10h18"/>',
  factory: '<path d="M3 21V9l6 3V8l6 4V6l6 3v12H3Z"/><path d="M7 17h.01M11 17h.01M15 17h.01M19 17h.01"/>',
  purchase: '<path d="M4 5h16v15H4zM8 3v4m8-4v4M4 10h16"/><path d="M8 14h3M8 17h6"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5ZM17 20h-3"/>',
  quality: '<path d="m12 3 7 3v5c0 4.5-2.7 8-7 10-4.3-2-7-5.5-7-10V6l7-3Z"/><path d="m8 12 2.5 2.5L16 9"/>',
  engineering: '<path d="m14.7 6.3 3-3 3 3-3 3a5 5 0 0 1-6.2 6.2L6 20a2 2 0 1 1-2-2l4.5-5.5A5 5 0 0 1 14.7 6.3Z"/>',
  recruitment: '<circle cx="9" cy="8" r="4"/><path d="M2 21c.8-4 3.5-6 7-6s6.2 2 7 6M17 5a4 4 0 0 1 0 7M18 15c2 .8 3 2.5 4 5"/>',
  review: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.5 6.6-4M8.7 13.5l6.6 4"/>',
  car: '<path d="m5 16-1-5 2-5h12l2 5-1 5H5Z"/><path d="M6 11h12M7 16v2m10-2v2"/><circle cx="7" cy="14" r="1"/><circle cx="17" cy="14" r="1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  survey: '<path d="M5 3h14v18H5V3Z"/><path d="M8 7h1m3 0h5M8 12h1m3 0h5M8 17h1m3 0h5"/>',
  automation: '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8"/><circle cx="12" cy="12" r="3"/>',
  project: '<path d="M4 5h16v14H4z"/><path d="M8 5v14M4 10h16M12 10v9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z"/>',
  forum: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/>',
};

const ICON_ALIASES: Record<string, string> = {
  pivot: 'analytics', graph: 'analytics', map: 'pin',
  '⌕': 'search',
  '↓': 'download',
  '↑': 'upload',
  '⚙': 'settings',
  '?': 'help',
  '▦': 'dashboard', '□': 'document', '◇': 'quote', '◫': 'calendar', '○': 'users',
  '◌': 'users', '△': 'warning', '▤': 'report', '◈': 'analytics', '▧': 'file',
  '▥': 'table', '⌖': 'pin', '▣': 'grid', '≡': 'menu', '≋': 'menu', '₫': 'money',
  '⌂': 'home', '◷': 'activity', '#': 'number', '◉': 'status',
  ai: 'sparkles', assistant: 'sparkles',
};

function appendSvgIcon(target: HTMLElement, name: string, label: string | undefined, filled: boolean) {
  const icon = document.createElement('span');
  icon.className = filled ? 'svg-icon svg-icon-filled' : 'svg-icon';
  icon.setAttribute('aria-hidden', label ? 'false' : 'true');
  if (label) icon.setAttribute('aria-label', label);
  const key = ICON_ALIASES[name] || name;
  const content = ICON_PATHS[key] || ICON_PATHS.grid;
  icon.innerHTML = filled
    ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">${content}</svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
  target.append(icon);
}

/** Render a small inline SVG without exposing DOM ownership to callers. */
export function appendIcon(target: HTMLElement, name: string, label?: string) {
  appendSvgIcon(target, name, label, false);
}

/** Render a compact solid icon for app tiles and launcher surfaces. */
export function appendFilledIcon(target: HTMLElement, name: string, label?: string) {
  appendSvgIcon(target, name, label, true);
}

export function hasIcon(name: string) {
  return Boolean(ICON_PATHS[ICON_ALIASES[name] || name]);
}
