import { translationMap } from '../../lib/server/discovery.ts';
import { requestLanguage } from '../../lib/server/locale.ts';
import type { TmsRouteContext } from './api-route-context.ts';
import { handleFileRoutes } from './files.ts';
import { handleDataRoutes } from './data.ts';
import { handleActionRoutes } from './actions.ts';
import { handlePatchRoutes } from './patch.ts';
import { handleProfileRoutes } from './profile.ts';
import { handleEventRoutes } from './events.ts';
import { join } from 'node:path';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import type { ModuleServer } from '../../lib/server/module.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

type TmsApiContext = {
  repository: any;
  authProvider: any;
  sources: Map<string, any>;
  pages: Map<string, any>;
  catalogs: Map<string, any>;
  menus: Map<string, any>;
  workflows: Map<string, any>;
  permissions: any;
  uploadRoot: string;
  eventStore: any;
  reloadPages?: () => void;
};

export function createTmsApi(ctx: TmsApiContext) {
  const {
    repository,
    authProvider,
    sources: SOURCES,
    pages: PAGES,
    catalogs: CATALOGS,
    menus: MENUS,
    workflows: WORKFLOWS,
    permissions: PERMISSIONS,
    uploadRoot: UPLOAD_ROOT,
    eventStore: EVENT_STORE,
    reloadPages,
  } = ctx;

  const FINANCIAL_WORKFLOW_SCOPES = new Set([
    'debit_note',
    'payment_request',
    'advance',
    'settlement',
  ]);
  const DEFAULT_CURRENCY_RATES: Record<string, number> = { VND: 1, USD: 25400, EUR: 27600 };

  function configuredCurrencyRates(): { rates: Record<string, number>; source: string } {
    const raw = process.env.TMS_CURRENCY_RATES_JSON;
    if (!raw) return { rates: DEFAULT_CURRENCY_RATES, source: 'demo-config' };
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object required');
      return { rates: parsed as Record<string, number>, source: 'environment' };
    } catch {
      throw Object.assign(new Error('TMS_CURRENCY_RATES_JSON must be a JSON object'), { status: 400 });
    }
  }

  function json(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', ...extraHeaders, ...CORS_HEADERS },
    });
  }

  function pageCacheHeaders(url: URL): Record<string, string> {
    if (url.searchParams.get('cache') !== 'true') {
      return { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };
    }
    const requestedTtl = Number.parseInt(url.searchParams.get('ttl') || '300', 10);
    const ttl = Number.isFinite(requestedTtl) ? Math.min(Math.max(requestedTtl, 0), 86400) : 300;
    return { 'Cache-Control': `private, max-age=${ttl}` };
  }

  function apiError(status: number, message: string): Response {
    return json({ error: message }, status);
  }

  async function requireAuth(req: Request) {
    return authProvider.getCurrentUser(req);
  }

  function publicPageConfig(page: any) {
    const { datasources, ...config } = page;
    return config;
  }

  function sourcePageSizes(page: any): Map<string, number> {
    const sizes = new Map<string, number>();
    const visit = (components: any[] = []) => {
      for (const component of components) {
        if (component.source && (component.type === 'ListView' || component.page_size)) {
          sizes.set(component.source, Number(component.page_size || 25));
        }
        if (component.message_source && component.message_page_size) sizes.set(component.message_source, Number(component.message_page_size));
        if (component.attachment_source && component.attachment_page_size) sizes.set(component.attachment_source, Number(component.attachment_page_size));
        if (component.follower_candidates_source) sizes.set(component.follower_candidates_source, Number(component.follower_candidates_page_size || 100));
        for (const tab of component.tabs || []) visit(tab.components);
      }
    };
    visit(page.components);
    return sizes;
  }

  async function prefetchedPageConfig(page: any, url: URL, user: any) {
    const params: Record<string, unknown> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key === 'cache' || key === 'ttl') continue;
      const previous = params[key];
      params[key] = previous === undefined ? value : Array.isArray(previous) ? [...previous, value] : [previous, value];
    }
    const pageSizes = sourcePageSizes(page);
    const listSort = typeof params.sort === 'string'
      ? {
          field: params.sort,
          direction: params.sort_dir === 'desc' ? 'desc' : 'asc',
        }
      : undefined;
    const serverParams = {
      ...params,
      current_user_id: String(user.sub || ''),
      current_user_name: String(user.name || ''),
      current_branch_id: String(user.branch_id || ''),
      view_scope: String(user.view_scope || 'all'),
    };
    const datasources = await Promise.all((page.datasources || []).map(async (source: any) => {
      if (source.permission && !authProvider.hasPermission(user, source.permission)) {
        throw { status: 403, message: `Requires permission: ${source.permission}` };
      }
      const { query, workflow_states, ...publicSource } = source;
      const workflow = typeof source.workflow === 'string' ? WORKFLOWS.get(source.workflow) : undefined;
      const stateWorkflow = typeof workflow_states === 'string' ? WORKFLOWS.get(workflow_states) : undefined;
      if (workflow_states && !stateWorkflow) throw { status: 500, message: `Unknown workflow: ${workflow_states}` };
      const result = stateWorkflow
        ? { data: stateWorkflow.states.map((state: any) => ({ value: state.id, label: state.label, color: state.color })), meta: {} }
        : await repository.querySource(
            source,
            serverParams,
            0,
            pageSizes.get(source.id) || 25,
            undefined,
            pageSizes.has(source.id) ? listSort : undefined,
          );
      return { ...publicSource, ...(workflow ? { workflow } : {}), data: result.data, meta: result.meta };
    }));
    const lang = requestLanguage(url, user.preferred_lang || 'en');
    return {
      ...publicPageConfig(page),
      datasources,
      i18n: {
        lang,
        page: translationMap(CATALOGS, lang, String(page.page?.id || '')),
        global: translationMap(CATALOGS, lang, '*'),
      },
    };
  }

  const TABLES = PERMISSIONS.tables || {};
  const ENDPOINT_PERMISSIONS: Record<string, string> = PERMISSIONS.endpoints || {};
  const DECLARED_PERMISSIONS = new Set<string>(PERMISSIONS.permissions || []);
  for (const [name, table] of Object.entries(TABLES) as [string, any][]) {
    if (!DECLARED_PERMISSIONS.has(table.permission)) throw new Error(`Table ${name} uses undeclared permission: ${table.permission}`);
  }
  for (const [name, permission] of Object.entries(ENDPOINT_PERMISSIONS)) {
    if (!DECLARED_PERMISSIONS.has(permission)) throw new Error(`Endpoint ${name} uses undeclared permission: ${permission}`);
  }
  for (const [workflowId, workflow] of WORKFLOWS) {
    if (!DECLARED_PERMISSIONS.has(workflow.permission)) throw new Error(`Workflow ${workflowId} uses undeclared permission: ${workflow.permission}`);
    for (const transition of workflow.transitions || []) {
      if (!DECLARED_PERMISSIONS.has(transition.permission)) throw new Error(`Workflow ${workflowId} transition ${transition.id} uses undeclared permission: ${transition.permission}`);
    }
    if (workflow.status_source && !SOURCES.has(workflow.status_source)) throw new Error(`Workflow ${workflowId} references unknown status datasource: ${workflow.status_source}`);
  }
  for (const [sourceId, source] of SOURCES) {
    for (const workflowId of [source.workflow, source.workflow_states]) {
      if (typeof workflowId === 'string' && !WORKFLOWS.has(workflowId)) throw new Error(`Datasource ${sourceId} references unknown workflow: ${workflowId}`);
    }
  }
  const permissionForEndpoint = (endpoint: string) => {
    const permission = ENDPOINT_PERMISSIONS[endpoint];
    if (!permission) throw new Error(`Missing YAML permission for endpoint: ${endpoint}`);
    return permission;
  };
  const NAMED_ACTIONS: Record<string, any> = {};
  for (const [pageId, page] of PAGES) {
    for (const action of page.actions || []) {
      if (action.type !== 'server' && action.type !== 'server_form') continue;
      if (!action.action) continue;
      if (!action.handler) throw new Error(`Page ${pageId} named action ${action.action} is missing handler metadata`);
      if (!action.permission || !DECLARED_PERMISSIONS.has(action.permission)) throw new Error(`Page ${pageId} action ${action.action} uses undeclared permission: ${action.permission}`);
      const existing = NAMED_ACTIONS[action.action];
      if (existing && JSON.stringify({ handler: existing.handler, workflow: existing.workflow, operation: existing.operation, domain: existing.domain, kind: existing.kind }) !== JSON.stringify({ handler: action.handler, workflow: action.workflow, operation: action.operation, domain: action.domain, kind: action.kind })) {
        throw new Error(`Conflicting declarations for named action: ${action.action}`);
      }
      NAMED_ACTIONS[action.action] = action;
    }
  }
  const REGISTERED_NAMED_ACTIONS = new Set(Object.keys(NAMED_ACTIONS));
  for (const action of Object.values(NAMED_ACTIONS) as any[]) {
    if (action.handler !== 'order_transition') continue;
    const workflow = WORKFLOWS.get(String(action.workflow || ''));
    const transition = workflow?.transitions?.find((candidate: any) => candidate.id === action.operation);
    if (!transition) throw new Error(`Named action ${action.action} references an unknown workflow transition`);
    if (transition.permission !== action.permission) throw new Error(`Named action ${action.action} permission does not match its workflow transition`);
  }
  const CHAT_SEND_ACTION = Object.values(NAMED_ACTIONS).find((action: any) => action.handler === 'chat' && action.operation === 'send_message');
  const permissionForAction = (action: string) => {
    const permission = NAMED_ACTIONS[action]?.permission;
    if (!permission) throw new Error(`Missing YAML permission for named action: ${action}`);
    return permission;
  };

  for (const [pageId, page] of PAGES) {
    for (const action of page.actions || []) {
      if ((action.type === 'server' || action.type === 'server_form') && !REGISTERED_NAMED_ACTIONS.has(action.action)) {
        throw new Error(`Page ${pageId} references unregistered named action: ${action.action}`);
      }
    }
  }

  async function handleAPI(req: Request, url: URL, websocketServer?: ModuleServer): Promise<Response | undefined> {
  const pathname = url.pathname;
  const method   = req.method;

  // The shell needs module menus and global labels before authentication.
  if (pathname === '/api/menu' && method === 'GET') {
    const lang = requestLanguage(url);
    return json([...MENUS.values()].map((entry: any) => ({
      module: entry.module,
      ...entry.config,
      i18n: translationMap(CATALOGS, lang, '*'),
    })));
  }


  // ── All routes below require auth ──────────────────────────────────────────
  const authRequest = url.searchParams.has('token') && !req.headers.get('Authorization')
    ? new Request(req, { headers: { ...Object.fromEntries(req.headers), Authorization: `Bearer ${url.searchParams.get('token')}` } })
    : req;
  const authUser = await requireAuth(authRequest);

  const hasPerm = (perm: string) => authProvider.hasPermission(authUser, perm);
  const requirePerm = (perm: string) => {
    if (!hasPerm(perm)) throw { status: 403, message: `Requires permission: ${perm}` };
  };
  const activityActor = {
    id: authUser.sub ? String(authUser.sub) : null,
    name: String(authUser.name || authUser.email || authUser.sub || 'Unknown user'),
  };
  const crmEntityInScope = async (kind: 'customer' | 'partner', id: string) => {
    const table = kind === 'customer' ? 'customers' : 'partners';
    const [row] = await repository.query(
      `SELECT owner_name, visibility FROM ${table} WHERE id = ?`,
      [id],
    );
    if (!row || String(authUser.view_scope || 'all') === 'all') return Boolean(row);
    const ownerName = String(row.owner_name || '');
    if (String(authUser.view_scope) === 'own') return ownerName === activityActor.name;
    return String(row.visibility || 'Public') === 'Public' || ownerName === activityActor.name;
  };
  const branchForScopedResource = async (resourceTable: string, resourceId: string) => {
    if (resourceTable === 'users') {
      const [row] = await repository.query('SELECT branch_id FROM users WHERE id = ?', [resourceId]);
      return row?.branch_id ? String(row.branch_id) : null;
    }
    if (resourceTable === 'employees') {
      const [row] = await repository.query(
        "SELECT d.branch_id FROM employees e LEFT JOIN departments d ON d.name ILIKE '%' || e.department || '%' WHERE e.id = ?",
        [resourceId],
      );
      return row?.branch_id ? String(row.branch_id) : null;
    }
    if (resourceTable === 'employment_contracts' || resourceTable === 'timesheets' || resourceTable === 'payrolls') {
      const [row] = await repository.query(
        `SELECT d.branch_id
         FROM ${resourceTable} r
         JOIN employees e ON e.id = r.employee_id
         LEFT JOIN departments d ON d.name ILIKE '%' || e.department || '%'
         WHERE r.id = ?`,
        [resourceId],
      );
      return row?.branch_id ? String(row.branch_id) : null;
    }
    if (resourceTable === 'accounting_entries') {
      const [row] = await repository.query('SELECT branch_id FROM accounting_entries WHERE id = ?', [resourceId]);
      return row?.branch_id ? String(row.branch_id) : null;
    }
    if (resourceTable === 'orders' || resourceTable === 'quotes') {
      const [row] = await repository.query(`SELECT branch_id FROM ${resourceTable} WHERE id = ?`, [resourceId]);
      return row?.branch_id ? String(row.branch_id) : null;
    }
    if (resourceTable === 'locations' || resourceTable === 'containers') {
      const [row] = await repository.query(`SELECT branch_id FROM ${resourceTable} WHERE id = ?`, [resourceId]);
      return row?.branch_id ? String(row.branch_id) : null;
    }
    return null;
  };
  const recordInCurrentBranch = async (resourceTable: string, resourceId: string) => {
    if (String(authUser.view_scope || 'all') === 'all') return true;
    const branchId = await branchForScopedResource(resourceTable, resourceId);
    return Boolean(branchId && branchId === String(authUser.branch_id || ''));
  };


    const routeContext: TmsRouteContext = {
      req, url, pathname, method, repository, authProvider, eventStore: EVENT_STORE,
      SOURCES, PAGES, CATALOGS, WORKFLOWS, UPLOAD_ROOT, reloadPages,
      authUser, activityActor, FINANCIAL_WORKFLOW_SCOPES, NAMED_ACTIONS, TABLES,
      requirePerm, permissionForEndpoint, permissionForAction,
      recordInCurrentBranch, branchForScopedResource, crmEntityInScope,
      configuredCurrencyRates, json, apiError, publicPageConfig, pageCacheHeaders, prefetchedPageConfig, CORS_HEADERS,
    };
    routeContext.executeAction = async (body: Record<string, unknown>) => {
      if (!CHAT_SEND_ACTION?.action) throw new Error('Chat send action is not configured');
      const actionUrl = new URL(`/api/actions/${encodeURIComponent(CHAT_SEND_ACTION.action)}`, req.url);
      const actionRequest = new Request(actionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return handleActionRoutes({ ...routeContext, req: actionRequest, url: actionUrl, pathname: actionUrl.pathname, method: 'POST' });
    };
    for (const handler of [handleEventRoutes, handleFileRoutes, handleDataRoutes, handleActionRoutes, handlePatchRoutes, handleProfileRoutes]) {
      const response = handler === handleEventRoutes
        ? await handler(routeContext, websocketServer)
        : await handler(routeContext);
      if (handler === handleEventRoutes && response === undefined) return undefined;
      if (response) return response;
    }
    return apiError(404, 'API route not found');
  }
  return handleAPI;
}
