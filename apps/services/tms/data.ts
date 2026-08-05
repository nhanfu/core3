import type { TmsRouteContext } from './api-route-context.ts';

export async function handleDataRoutes(ctx: TmsRouteContext): Promise<Response | null> {
  const {
    req, url, pathname, method, repository, authProvider, SOURCES, PAGES, CATALOGS,
    UPLOAD_ROOT, reloadPages, authUser, activityActor, FINANCIAL_WORKFLOW_SCOPES,
    NAMED_ACTIONS, TABLES, requirePerm, permissionForEndpoint, permissionForAction,
    recordInCurrentBranch, branchForScopedResource, crmEntityInScope,
    configuredCurrencyRates, json, apiError, publicPageConfig, pageCacheHeaders, prefetchedPageConfig,
  } = ctx;

  // ── GET /api/pages/:id ────────────────────────────────────────────────────
  if (pathname === '/api/pages' && method === 'GET') {
    return json([...PAGES.values()].map((page) => publicPageConfig(page)));
  }

  const pageMatch = pathname.match(/^\/api\/pages\/([A-Za-z0-9_-]+)$/);
  if (pageMatch && method === 'GET') {
    if (url.searchParams.get('cache') !== 'true') reloadPages?.();
    const page = PAGES.get(pageMatch[1]);
    if (!page) return apiError(404, `Unknown page: ${pageMatch[1]}`);
    for (const permission of page.page?.auth?.require || []) requirePerm(permission);
    return json(await prefetchedPageConfig(page, url, authUser), 200, pageCacheHeaders(url));
  }

  // ── POST /api/query ───────────────────────────────────────────────────────
  if (pathname === '/api/query' && method === 'POST') {
    const vm = await req.json() as any;
    const src = SOURCES.get(vm.sourceId);
    if (!src) return apiError(404, `Unknown source: ${vm.sourceId}`);
    if (src.permission) requirePerm(src.permission);
    const result = await repository.querySource(
      src,
      {
        ...(vm.params || {}),
        // These values are server-owned. Client filters cannot impersonate a
        // different branch or view scope.
        current_user_id: String(authUser.sub || ''),
        current_user_name: String(authUser.name || ''),
        current_branch_id: String(authUser.branch_id || ''),
        view_scope: String(authUser.view_scope || 'all'),
      },
      vm.skip || 0,
      vm.top || 25,
      typeof vm.facetField === 'string' ? vm.facetField : undefined,
      vm.sort,
    );
    return json(result);
  }

  const workflowMatch = pathname.match(/^\/api\/datasources\/([A-Za-z0-9_-]+)\/workflow$/);
  if (workflowMatch && method === 'POST') {
    const source = SOURCES.get(workflowMatch[1]);
    const workflow = source?.workflow;
    if (!workflow || workflow.handler !== 'order_status') return apiError(404, 'Unknown datasource workflow');
    requirePerm(String(workflow.permission));
    const body = await req.json() as any;
    if (body.operation === 'add_status') {
      if (!workflow.allow_add) return apiError(403, 'Adding statuses is not allowed');
      return json(await repository.addOrderWorkflowStatus(String(body.label || ''), activityActor));
    }
    if (body.operation !== 'move' || typeof body.id !== 'string' || typeof body.status !== 'string') return apiError(400, 'id and status are required');
    if (!(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Order is outside the current view scope');
    const [status] = await repository.query("SELECT code FROM system_configs WHERE kind = 'trip_status' AND config_value LIKE 'order_status:%' AND status = 'Active' AND code = ?", [body.status]);
    if (!status) return apiError(400, 'Unknown order status');
    const [current] = await repository.query('SELECT status FROM order_workflow_states WHERE order_id = ?', [body.id]);
    const transition = (workflow.transitions || []).find((rule: any) => (rule.from === '*' || rule.from === current?.status) && (rule.to === '*' || rule.to === body.status));
    if (!transition) return apiError(409, 'This status transition is not allowed');
    requirePerm(String(transition.permission || workflow.permission));
    return json(await repository.setOrderWorkflowStatus(body.id, body.status, activityActor));
  }


  return null;
}
