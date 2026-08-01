/**
 * Navigation helpers for YAML-driven pages.
 * Manages URL-based page routing with search-param state.
 */

let _navigateFn = (pageId, params = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) qs.set(k, String(v));
  }
  const q = qs.toString();
  window.location.href = `${pageId}.html${q ? '?' + q : ''}`;
};

/** Register a custom navigator (e.g. SPA history.pushState). */
export function registerNavigator(fn) {
  _navigateFn = fn;
}

/**
 * Navigate to a page, serializing params into the query string.
 * @param {string} pageId   — path or page filename without extension
 * @param {Record<string,*>} params
 */
export function navigate(pageId, params = {}) {
  _navigateFn(pageId, params);
}

/**
 * Return the current page's query-string params as a plain object.
 * @returns {Record<string,string>}
 */
export function getPageParams() {
  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : '';
  const sp = new URLSearchParams(hashQuery || window.location.search);
  const out = {};
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

/**
 * Replace the current URL's query string without reloading the page.
 * Useful for persisting filter/pagination state in the address bar.
 * @param {Record<string,*>} params
 */
export function replaceParams(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) qs.set(k, String(v));
  }
  const url = `${window.location.pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
  window.history.replaceState({}, '', url);
}
