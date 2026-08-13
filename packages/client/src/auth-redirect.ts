/** Return only same-origin application paths supplied by the login flow. */
export function safeRedirect(value: string | null | undefined, origin = window.location.origin): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/') || url.pathname.startsWith('//')) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function loginPath(redirect: string | null, langCode?: string): string {
  const params = new URLSearchParams();
  if (redirect) params.set('redirect', redirect);
  if (langCode) params.set('lc', langCode);
  const query = params.toString();
  return `/auth/login${query ? `?${query}` : ''}`;
}
