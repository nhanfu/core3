import type { TmsRouteContext } from './api-route-context.ts';
import { declaredFromStates, findDeclaredMove } from '../../lib/workflow.ts';

export async function handleDataRoutes(ctx: TmsRouteContext): Promise<Response | null> {
  const {
    req, url, pathname, method, repository, authProvider, SOURCES, PAGES, CATALOGS, WORKFLOWS,
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
    if (typeof src.workflow_states === 'string') {
      const workflow = WORKFLOWS.get(src.workflow_states);
      if (!workflow) return apiError(500, `Unknown workflow: ${src.workflow_states}`);
      return json({ data: workflow.states.map((state: any) => ({ value: state.id, label: state.label, color: state.color })), meta: {} });
    }
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
      vm.pivot,
    );
    return json(result);
  }

  const workflowMatch = pathname.match(/^\/api\/datasources\/([A-Za-z0-9_-]+)\/workflow$/);
  if (workflowMatch && method === 'POST') {
    const source = SOURCES.get(workflowMatch[1]);
    const workflow = typeof source?.workflow === 'string' ? WORKFLOWS.get(source.workflow) : undefined;
    if (!workflow || workflow.handler !== 'order_status') return apiError(404, 'Unknown datasource workflow');
    const body = await req.json() as any;
    if (body.operation === 'add_status') {
      if (!workflow.allow_add) return apiError(403, 'Adding statuses is not allowed');
      return apiError(501, 'Workflow state editing requires the workflow editor');
    }
    if (body.operation !== 'move' || typeof body.id !== 'string' || typeof body.status !== 'string') return apiError(400, 'id and status are required');
    if (!(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Order is outside the current view scope');
    if (!workflow.states.some((state: any) => state.id === body.status)) return apiError(400, 'Unknown order status');
    const [current] = await repository.query(
      `SELECT COALESCE(s.status, o.status) AS status
       FROM orders o LEFT JOIN order_workflow_states s ON s.order_id = o.id
       WHERE o.id = ?`,
      [body.id],
    );
    if (!current) return apiError(404, 'Order not found');
    const transition = findDeclaredMove(workflow.transitions || [], String(current.status), body.status);
    if (!transition) return apiError(409, 'This status transition is not allowed');
    requirePerm(String(transition.permission || workflow.permission));
    return json(await repository.transitionOrder(
      body.id,
      declaredFromStates(transition),
      transition.to,
      `orders.${transition.id}`,
      activityActor,
      transition.conditions,
      transition.condition_message,
    ));
  }


  return null;
}
