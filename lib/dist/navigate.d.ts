/**
 * Navigation helpers for YAML-driven pages.
 * Manages URL-based page routing with search-param state.
 */
/** Register a custom navigator (e.g. SPA history.pushState). */
export declare function registerNavigator(fn: any): void;
/**
 * Navigate to a page, serializing params into the query string.
 * @param {string} pageId   — path or page filename without extension
 * @param {Record<string,*>} params
 */
export declare function navigate(pageId: string, params?: Record<string, any>): void;
/**
 * Return the current page's query-string params as a plain object.
 * @returns {Record<string,string>}
 */
export declare function getPageParams(): Record<string, string>;
/**
 * Replace the current URL's query string without reloading the page.
 * Useful for persisting filter/pagination state in the address bar.
 * @param {Record<string,*>} params
 */
export declare function replaceParams(params?: Record<string, any>): void;
