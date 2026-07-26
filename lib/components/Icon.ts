const ICON_PATHS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 5 5"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>',
  upload: '<path d="M12 15V3m0 0 4 4m-4-4L8 7M5 21h14"/>',
  settings: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="3"/>',
  columns: '<rect x="4" y="4" width="6" height="16" rx="1"/><rect x="14" y="4" width="6" height="16" rx="1"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-4L3 10m0 0V5m0 5h5M4 13a8 8 0 0 0 14.8 4L21 14m0 0v5m0-5h-5"/>',
};

const ICON_ALIASES: Record<string, string> = {
  '⌕': 'search',
  '↓': 'download',
  '↑': 'upload',
  '⚙': 'settings',
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
