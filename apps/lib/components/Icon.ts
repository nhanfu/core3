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
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
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
  'sort-ascending': '<path d="m8 9 4-4 4 4"/>',
  'sort-descending': '<path d="m8 15 4 4 4-4"/>',
};

const ICON_ALIASES: Record<string, string> = {
  '⌕': 'search',
  '↓': 'download',
  '↑': 'upload',
  '⚙': 'settings',
  '?': 'help',
  '▦': 'dashboard', '□': 'document', '◇': 'quote', '◫': 'calendar', '○': 'users',
  '◌': 'users', '△': 'warning', '▤': 'report', '◈': 'analytics', '▧': 'file',
  '▥': 'table', '⌖': 'pin', '▣': 'grid', '≡': 'menu', '≋': 'menu', '₫': 'money',
  '⌂': 'home', '◷': 'activity', '#': 'number', '◉': 'status',
};

/** Render a small inline SVG without exposing DOM ownership to callers. */
export function appendIcon(target: HTMLElement, name: string, label?: string) {
  const icon = document.createElement('span');
  icon.className = 'svg-icon';
  icon.setAttribute('aria-hidden', label ? 'false' : 'true');
  if (label) icon.setAttribute('aria-label', label);
  const key = ICON_ALIASES[name] || name;
  icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[key] || ''}</svg>`;
  target.append(icon);
}

export function hasIcon(name: string) {
  return Boolean(ICON_PATHS[ICON_ALIASES[name] || name]);
}
