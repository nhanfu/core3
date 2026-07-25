/**
 * Navigation helpers for YAML-driven pages.
 * Manages URL-based page routing with search-param state.
 */

/**
 * Navigate to a page, serializing params into the query string.
 * @param {string} pageId   — page filename without extension, e.g. 'truck-detail'
 * @param {Record<string,*>} params
 */
export function navigate(pageId, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) qs.set(k, String(v));
  }
  const q = qs.toString();
  window.location.href = `${pageId}.html${q ? '?' + q : ''}`;
}

/**
 * Return the current page's query-string params as a plain object.
 * @returns {Record<string,string>}
 */
export function getPageParams() {
  const sp = new URLSearchParams(window.location.search);
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
