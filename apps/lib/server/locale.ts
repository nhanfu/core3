export function requestLanguage(url: URL, fallback = 'en') {
  return String(url.searchParams.get('lc') || url.searchParams.get('lang') || fallback);
}
