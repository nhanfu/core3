import { translationMap } from '@core3/server/discovery';
import { requestLanguage } from '@core3/server/locale';
import { handleFileRoutes } from './file-routes.ts';
import { handleDataRoutes } from './yaml-data.ts';
import { handleActionRoutes } from './yaml-actions.ts';
import { handleEventRoutes } from '@core3/server/routes/event-websocket';
import type { ModuleServer } from '../module.ts';
import type { TopicMediator } from '../topics/mediator.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

type YamlApiContext = {
  repository: any;
  authProvider: any;
  sources: Map<string, any>;
  pages: Map<string, any>;
  catalogs: Map<string, any>;
  menus: Map<string, any>;
  workflows: Map<string, any>;
  workflowFiles: Map<string, string>;
  permissions: any;
  uploadRoot: string;
  eventStore: any;
  topics: TopicMediator;
  storage?: any;
  reloadPages?: () => void;
  resolveService?: <T>(name: string) => T;
};

export function createYamlApi(ctx: YamlApiContext) {
  const {
    repository,
    authProvider,
    sources: SOURCES,
    pages: PAGES,
    catalogs: CATALOGS,
    menus: MENUS,
    workflows: WORKFLOWS,
    workflowFiles: WORKFLOW_FILES,
    permissions: PERMISSIONS,
    uploadRoot: UPLOAD_ROOT,
    eventStore: EVENT_STORE,
    topics: TOPICS,
    reloadPages,
    resolveService,
  } = ctx;

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

  function apiError(status: number, message: string, code?: string, messageKey?: string, messageParams?: Record<string, unknown>): Response {
    return json({
      error: message,
      ...(code ? { code } : {}),
      message_key: messageKey || (code ? `errors.${String(code).toLowerCase()}` : `errors.http_${status}`),
      ...(messageParams ? { message_params: messageParams } : {}),
    }, status);
  }

  async function requireAuth(req: Request) {
    return authProvider.getCurrentUser(req);
  }

  function publicPageConfig(page: any) {
    const config = { ...page };
    delete config.datasources;
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
    applyDefaultDateRanges(page.components || [], params);
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
    const lang = requestLanguage(url, user.preferred_lang || 'en');
    const datasources = await Promise.all((page.datasources || []).map(async (source: any) => {
      if (source.permission && !authProvider.hasPermission(user, source.permission)) {
        throw { status: 403, message: `Requires permission: ${source.permission}` };
      }
      const publicSource = { ...source };
      delete publicSource.query;
      const workflow_states = publicSource.workflow_states;
      delete publicSource.workflow_states;
      const workflow = typeof source.workflow === 'string' ? WORKFLOWS.get(source.workflow) : undefined;
      const stateWorkflow = typeof workflow_states === 'string' ? WORKFLOWS.get(workflow_states) : undefined;
      if (workflow_states && !stateWorkflow) throw { status: 500, message: `Unknown workflow: ${workflow_states}` };
      const result = stateWorkflow
        ? { data: localizedWorkflow(stateWorkflow, lang).states.map((state: any) => ({ value: state.id, label: state.label, color: state.color })), meta: {} }
        : await repository.querySource(
            source,
            serverParams,
            0,
            pageSizes.get(source.id) || 25,
            undefined,
            pageSizes.has(source.id) ? listSort : undefined,
          );
      return { ...publicSource, ...(workflow ? { workflow: localizedWorkflow(workflow, lang) } : {}), data: result.data, meta: result.meta };
    }));
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

  function localizedWorkflow(workflow: any, lang: string): any {
    const labels = translationMap(CATALOGS, lang, 'order-workflow');
    const localized = JSON.parse(JSON.stringify(workflow));
    for (const state of localized.states || []) state.label = labels[state.label] || state.label;
    const editor = localized.state_editor;
    if (editor?.labels) for (const key of Object.keys(editor.labels)) editor.labels[key] = labels[editor.labels[key]] || editor.labels[key];
    for (const modal of Object.values(editor?.modals || {}) as any[]) {
      for (const key of ['title', 'message', 'from_label', 'to_label', 'replacement_label', 'confirm_label', 'cancel_label', 'danger_label']) {
        if (modal[key]) modal[key] = labels[modal[key]] || modal[key];
      }
      if (modal.input) {
        if (modal.input.label) modal.input.label = labels[modal.input.label] || modal.input.label;
        if (modal.input.placeholder) modal.input.placeholder = labels[modal.input.placeholder] || modal.input.placeholder;
      }
    }
    return localized;
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
      if (action.type !== 'server' && action.type !== 'server_form' && action.type !== 'upload') continue;
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
  const websocketActionIds = new Set<string>();
  const collectWebsocketActions = (value: any) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.websocket?.send_action === 'string') websocketActionIds.add(value.websocket.send_action);
    for (const child of Array.isArray(value) ? value : Object.values(value)) collectWebsocketActions(child);
  };
  for (const page of PAGES.values()) collectWebsocketActions(page);
  const WEBSOCKET_SEND_ACTION = Object.values(NAMED_ACTIONS).find((action: any) => websocketActionIds.has(String(action.id)));
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
  const resourceScope = (resourceTable: string) => [...WORKFLOWS.values()]
    .map((workflow: any) => workflow.scope)
    .find((scope: any) => scope?.table === resourceTable);
  const branchForScopedResource = async (resourceTable: string, resourceId: string) => {
    const scope = resourceScope(resourceTable);
    if (!scope) return null;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(scope.table)) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(scope.field))) return null;
    const [row] = await repository.query(`SELECT ${scope.field} FROM ${scope.table} WHERE id = ?`, [resourceId]);
    return row?.[scope.field] ? String(row[scope.field]) : null;
  };
  const recordInCurrentBranch = async (resourceTable: string, resourceId: string) => {
    if (String(authUser.view_scope || 'all') === 'all') return true;
    const branchId = await branchForScopedResource(resourceTable, resourceId);
    return Boolean(branchId && branchId === String(authUser.branch_id || ''));
  };


    const routeContext: Record<string, any> = {
      req, url, pathname, method, repository, authProvider, eventStore: EVENT_STORE, topics: TOPICS, resolveService,
      SOURCES, PAGES, CATALOGS, WORKFLOWS, WORKFLOW_FILES, UPLOAD_ROOT, reloadPages,
      STORAGE: ctx.storage || {},
      authUser, activityActor, NAMED_ACTIONS, TABLES,
      requirePerm, permissionForEndpoint, permissionForAction,
      recordInCurrentBranch, branchForScopedResource,
      json, apiError, publicPageConfig, pageCacheHeaders, prefetchedPageConfig, CORS_HEADERS,
    };
    routeContext.executeAction = async (body: Record<string, unknown>) => {
      if (!WEBSOCKET_SEND_ACTION?.action) throw new Error('WebSocket send action is not configured');
      const actionUrl = new URL(`/api/actions/${encodeURIComponent(WEBSOCKET_SEND_ACTION.action)}`, req.url);
      const actionRequest = new Request(actionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return handleActionRoutes({ ...routeContext, req: actionRequest, url: actionUrl, pathname: actionUrl.pathname, method: 'POST' });
    };
    for (const handler of [handleEventRoutes, handleFileRoutes, handleDataRoutes, handleActionRoutes]) {
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

function applyDefaultDateRanges(components: any[], params: Record<string, unknown>): void {
  for (const component of components) {
    const range = component?.date_range;
    if (component?.source && range?.default_preset) {
      const fromKey = String(range.from_field || 'from_date');
      const toKey = String(range.to_field || 'to_date');
      if (params[fromKey] === undefined && params[toKey] === undefined) {
        const dates = defaultDatePreset(String(range.default_preset));
        if (dates) {
          params[fromKey] = dates.from;
          params[toKey] = dates.to;
        }
      }
    }
    for (const tab of component?.tabs || []) applyDefaultDateRanges(tab.components || [], params);
  }
}

function defaultDatePreset(preset: string): { from: string; to: string } | undefined {
  if (preset === 'all') return undefined;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  if (preset === 'last_12_months') start.setUTCMonth(start.getUTCMonth() - 11, 1);
  else if (preset === 'year') start.setUTCMonth(0, 1);
  else if (preset === 'quarter') start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3, 1);
  else if (preset === 'month') start.setUTCDate(1);
  else if (preset === 'week') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  else if (preset === 'previous_month') {
    start.setUTCMonth(start.getUTCMonth() - 1, 1);
    end.setUTCDate(0);
  }
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { from: format(start), to: format(end) };
}
