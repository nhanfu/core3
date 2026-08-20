export type AppRouteManifest = {
  id: string;
  pages?: Array<{ id: string; route?: string }>;
  routes?: Array<{ path: string }>;
};

export function resolveRouteWithModule(
  path: string,
  manifests: AppRouteManifest[],
  apps: Array<{ id?: string; module?: string; route?: string }> = [],
  activeModuleId = '',
): string {
  const routePath = path.startsWith('/') ? path : `/${path}`;
  if (routePath === '/apps') return routePath;
  const normalizedPath = routePath.toLowerCase();
  const module = manifests.find((entry) => normalizedPath === `/${entry.id}` || normalizedPath.startsWith(`/${entry.id}/`));
  if (module) {
    if (routePath === `/${module.id}`) {
      const appRoute = apps.find((app) => String(app.module || app.id) === module.id)?.route;
      return appRoute && appRoute !== routePath ? String(appRoute) : module.routes?.[0]?.path || routePath;
    }
    return routePath;
  }
  if (routePath === '/login' || routePath.startsWith('/login/')) return `/auth${routePath}`;
  const routeAliases = [...new Map(manifests
    .flatMap((entry) => [
      ...(entry.routes || []),
      ...(entry.pages || []).flatMap((page) => page.route ? [{ path: page.route }] : []),
      // Detail pages are commonly opened by row actions using their page id
      // (for example /contact-detail). Resolve that alias to its owning module
      // before falling back to the active app.
      ...(entry.pages || []).map((page) => ({ path: `/${page.id}` })),
    ])
    .filter((entry) => {
      const candidate = String(entry.path || '').toLowerCase();
      return candidate !== normalizedPath && candidate.endsWith(normalizedPath);
    })
    .map((entry) => [entry.path, entry] as const)).values()];
  if (routeAliases.length === 1) return routeAliases[0].path;
  const moduleId = activeModuleId || String(apps.find((app) => app.route)?.module || apps.find((app) => app.route)?.id || 'order');
  return `/${moduleId}${routePath}`;
}
