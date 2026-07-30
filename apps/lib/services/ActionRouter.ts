export type RouteState = Record<string, string | undefined>;

/** Client-agnostic URL state for window actions and browser navigation. */
export class ActionRouter {
  constructor(private readonly base = '/') {}

  private clearRouteState(url: URL) {
    for (const key of ['action', 'model', 'domain', 'context', 'view', 'id', 'search', 'filter', 'groupBy', 'sort', 'teamId', 'dimension', 'value', 'secondaryDimension', 'secondaryValue', 'selected', 'activityView', 'analysisView']) url.searchParams.delete(key);
  }

  read(url: URL = new URL(window.location.href)): RouteState {
    return Object.fromEntries(url.searchParams.entries());
  }

  replace(state: RouteState) {
    const url = new URL(window.location.href);
    url.pathname = this.base;
    this.clearRouteState(url);
    for (const [key, value] of Object.entries(state)) if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    window.history.replaceState(state, '', url);
  }

  push(state: RouteState) {
    const url = new URL(window.location.href);
    url.pathname = this.base;
    this.clearRouteState(url);
    for (const [key, value] of Object.entries(state)) if (value) url.searchParams.set(key, value);
    window.history.pushState(state, '', url);
  }

  listen(callback: (state: RouteState) => void) {
    const handler = () => callback(this.read());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }
}
