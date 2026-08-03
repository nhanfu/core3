import { translationMap } from '../../lib/server/discovery.ts';
import { requestLanguage } from '../../lib/server/locale.ts';
import { join } from 'node:path';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { xlsxToCsv } from './services/xlsx-import.ts';

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
  permissions: any;
  uploadRoot: string;
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
    permissions: PERMISSIONS,
    uploadRoot: UPLOAD_ROOT,
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
        if (component.source && component.page_size) sizes.set(component.source, Number(component.page_size));
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
      const result = await repository.querySource(
        source,
        serverParams,
        0,
        pageSizes.get(source.id) || 25,
      );
      const { query, ...publicSource } = source;
      return { ...publicSource, data: result.data, meta: result.meta };
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
      if (existing && JSON.stringify({ handler: existing.handler, operation: existing.operation, domain: existing.domain, kind: existing.kind }) !== JSON.stringify({ handler: action.handler, operation: action.operation, domain: action.domain, kind: action.kind })) {
        throw new Error(`Conflicting declarations for named action: ${action.action}`);
      }
      NAMED_ACTIONS[action.action] = action;
    }
  }
  const REGISTERED_NAMED_ACTIONS = new Set(Object.keys(NAMED_ACTIONS));
  const permissionForAction = (action: string) => {
    const permission = NAMED_ACTIONS[action]?.permission;
    if (!permission) throw new Error(`Missing YAML permission for named action: ${action}`);
    return permission;
  };

  const YAML_CRUD_SOURCES = new Map<string, any>();
  for (const page of PAGES.values()) {
    for (const action of page.actions || []) {
      if (!['form', 'delete', 'patch'].includes(action.type) || typeof action.table !== 'string') continue;
      const key = `${action.table}:${String(action.scope || '')}`;
      const source = YAML_CRUD_SOURCES.get(key) || {
        id: `crud:${key}`,
        table: action.table,
        permission: action.permission,
        mutations: {},
      };
      const operation = action.type === 'form'
        ? action.operation === 'insert' ? 'create' : action.operation
        : action.type === 'delete' ? 'delete' : 'update';
      const yamlFields = Array.isArray(action.fields)
        ? action.fields.map((field: any) => field.field).filter(Boolean)
        : [];
      const tableFields = Array.isArray(TABLES[action.table]?.fields) ? TABLES[action.table].fields : [];
      source.mutations[operation] = {
        permission: action.permission || TABLES[action.table]?.permission,
        scope: action.scope,
        fields: [...new Set([...yamlFields, ...tableFields])],
        timestamps: TABLES[action.table]?.timestamps !== false,
      };
      YAML_CRUD_SOURCES.set(key, source);
    }
  }

  for (const [pageId, page] of PAGES) {
    for (const action of page.actions || []) {
      if ((action.type === 'server' || action.type === 'server_form') && !REGISTERED_NAMED_ACTIONS.has(action.action)) {
        throw new Error(`Page ${pageId} references unregistered named action: ${action.action}`);
      }
    }
  }

  async function handleAPI(req: Request, url: URL): Promise<Response> {
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
  const authUser = await requireAuth(req);

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

  if (pathname === '/api/upload' && method === 'POST') {
    const form = await req.formData();
    const file = form.get('file');
    let meta: any = {};
    try {
      meta = JSON.parse(String(form.get('meta') || '{}'));
    } catch {
      return apiError(400, 'Invalid upload metadata');
    }
    if (!(file instanceof File)) return apiError(400, 'file required');
    if (meta.kind !== 'chat_attachment' && meta.kind !== 'order_attachment' && meta.kind !== 'employee_document' && meta.kind !== 'contract_document' && meta.kind !== 'company_document' && meta.kind !== 'master_data_import') return apiError(400, 'Unsupported upload kind');
    const configuredUpload = [...SOURCES.values()].find((source: any) => source.meta?.upload?.kind === meta.kind)?.meta?.upload;
    if (configuredUpload) {
      requirePerm(String(configuredUpload.permission));
      const parentKey = String(configuredUpload.parentKey);
      const parentId = meta[parentKey];
      if (typeof parentId !== 'string' || !parentId) return apiError(400, `${parentKey} required`);
      if (!(await recordInCurrentBranch(String(configuredUpload.resource), parentId))) return apiError(403, 'Record is outside the current view scope');
    } else if (meta.kind === 'chat_attachment') {
      requirePerm(permissionForEndpoint('upload.chat_attachment'));
      if (typeof meta.thread_id !== 'string' || !meta.thread_id) return apiError(400, 'thread_id required');
    } else {
      requirePerm(permissionForEndpoint('upload.master_data_import'));
      if (typeof meta.scope !== 'string' || !meta.scope) return apiError(400, 'scope required');
      if (file.size > 2 * 1024 * 1024) return apiError(400, 'Import CSV or XLSX must be 2 MB or smaller');
      let importText: string;
      if (file.name.toLowerCase().endsWith('.xlsx') || file.type.includes('spreadsheetml')) {
        try {
          importText = xlsxToCsv(new Uint8Array(await file.arrayBuffer()));
        } catch (error) {
          return apiError(400, error instanceof Error ? error.message : 'Invalid XLSX workbook');
        }
      } else {
        importText = await file.text();
      }
      const importSource = [...SOURCES.values()].find((source: any) => source.import?.scope === meta.scope);
      if (!importSource?.import) return apiError(400, 'Invalid master-data scope');
      requirePerm(String(importSource.import.permission || permissionForEndpoint('upload.master_data_import')));
      const result = await repository.importMasterData(
        { table: String(importSource.import.table), scope: String(importSource.import.scope) },
        importText,
        activityActor,
      );
      return json(result);
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return apiError(400, 'Attachment must be between 1 byte and 5 MB');
    }

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120) || 'attachment';
    const storageKey = `${crypto.randomUUID()}-${safeName}`;
    mkdirSync(UPLOAD_ROOT, { recursive: true });
    const targetPath = join(UPLOAD_ROOT, storageKey);
    writeFileSync(targetPath, Buffer.from(await file.arrayBuffer()));
    try {
      const fileMeta = { fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, storageKey };
      const uploadSource = [...SOURCES.values()].find((source: any) => source.meta?.upload?.kind === meta.kind);
      const uploadConfig = uploadSource?.meta?.upload;
      if (uploadConfig) {
        const parentKey = String(uploadConfig.parentKey);
        const parentId = meta[parentKey];
        if (typeof parentId !== 'string' || !parentId) return apiError(400, `${parentKey} required`);
        return json(await repository.createUploadedFile(uploadConfig, parentId, fileMeta, activityActor));
      }
      return json(await repository.sendChatAttachment(meta.thread_id, meta.content, fileMeta, activityActor));
    } catch (error) {
      try {
        unlinkSync(targetPath);
      } catch {}
      throw error;
    }
  }

  const contractDocumentMatch = pathname.match(/^\/api\/hr\/contract-documents\/([A-Za-z0-9-]+)$/);
  if (contractDocumentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('hr.contract_document.download'));
    const document = await repository.getContractDocument(contractDocumentMatch[1]);
    if (!document) return apiError(404, 'Contract document not found');
    if (!(await recordInCurrentBranch('employment_contracts', String(document.contract_id)))) return apiError(403, 'Record is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Contract document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const companyDocumentMatch = pathname.match(/^\/api\/org\/company-documents\/([A-Za-z0-9-]+)$/);
  if (companyDocumentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('org.company_document.download'));
    const document = await repository.getCompanyDocument(companyDocumentMatch[1]);
    if (!document) return apiError(404, 'Company document not found');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Company document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const employeeDocumentMatch = pathname.match(/^\/api\/hr\/employee-documents\/([A-Za-z0-9-]+)$/);
  if (employeeDocumentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('hr.employee_document.download'));
    const document = await repository.getEmployeeDocument(employeeDocumentMatch[1]);
    if (!document) return apiError(404, 'Employee document not found');
    if (!(await recordInCurrentBranch('employees', String(document.employee_id)))) return apiError(403, 'Record is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Employee document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const attachmentMatch = pathname.match(/^\/api\/chat\/attachments\/([A-Za-z0-9-]+)$/);
  if (attachmentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('chat.attachment.download'));
    const attachment = await repository.getChatAttachment(
      attachmentMatch[1],
      String(authUser.sub),
    );
    if (!attachment) return apiError(404, 'Attachment not found');
    const file = Bun.file(join(UPLOAD_ROOT, attachment.storage_key));
    if (!(await file.exists())) return apiError(404, 'Attachment file not found');
    return new Response(file, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`,
        ...CORS_HEADERS,
      },
    });
  }

  const orderAttachmentMatch = pathname.match(/^\/api\/orders\/attachments\/([A-Za-z0-9-]+)$/);
  if (orderAttachmentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('orders.attachment.download'));
    const attachment = await repository.getOrderAttachment(orderAttachmentMatch[1]);
    if (!attachment) return apiError(404, 'Order attachment not found');
    if (!(await recordInCurrentBranch('orders', String(attachment.order_id)))) return apiError(403, 'Order is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, attachment.storage_key));
    if (!(await file.exists())) return apiError(404, 'Order attachment file not found');
    return new Response(file, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`,
        ...CORS_HEADERS,
      },
    });
  }

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

  // ── POST /api/actions/:name ───────────────────────────────────────────────
  const namedActionMatch = pathname.match(/^\/api\/actions\/([A-Za-z0-9_.-]+)$/);
  if (namedActionMatch && method === 'POST') {
    const actionName = namedActionMatch[1];
    const actionDefinition = NAMED_ACTIONS[actionName];
    if (!actionDefinition) return apiError(404, `Unknown action: ${actionName}`);
    const handler = actionDefinition.handler;
    requirePerm(permissionForAction(actionName));

    const body = await req.json() as any;
    if (handler === 'currency_sync') {
      const configured = configuredCurrencyRates();
      return json(await repository.syncCurrencyRates(configured.rates, configured.source, activityActor));
    }
    if (handler === 'crm_entity') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (body.kind !== 'customer' && body.kind !== 'partner') return apiError(400, 'Invalid CRM entity kind');
      if (!(await crmEntityInScope(body.kind, body.id))) return apiError(403, 'Record is outside the current view scope');
      const values = body.values && typeof body.values === 'object' ? body.values : {};
      const table = body.kind === 'customer' ? 'customers' : 'partners';
      const fields = body.kind === 'customer'
        ? ['code', 'name', 'tax_code', 'phone', 'email', 'stage', 'owner_name', 'visibility', 'status']
        : ['code', 'name', 'tax_code', 'phone', 'email', 'partner_type', 'owner_name', 'visibility', 'status'];
      const changes = fields
        .filter((field) => Object.prototype.hasOwnProperty.call(values, field))
        .map((field) => ({ field, value: values[field] }));
      if (!changes.some((change) => change.field === 'code' && String(change.value || '').trim())) return apiError(400, 'code required');
      if (!changes.some((change) => change.field === 'name' && String(change.value || '').trim())) return apiError(400, 'name required');
      if (body.kind === 'customer' && !['Lead', 'Contacting', 'Customer'].includes(String(values.stage || ''))) return apiError(400, 'Invalid customer stage');
      if (body.kind === 'partner' && !['Carrier', 'Supplier', 'ShippingLine', 'Warehouse', 'Depot', 'Other'].includes(String(values.partner_type || ''))) return apiError(400, 'Invalid partner type');
      if (!['Public', 'Private'].includes(String(values.visibility || ''))) return apiError(400, 'Invalid visibility');
      if (!['Active', 'Inactive'].includes(String(values.status || ''))) return apiError(400, 'Invalid status');
      const updated = await repository.executeDatasourceMutation(
        {
          table,
          mutations: { update: { fields, timestamps: true } },
        },
        'update',
        body.id,
        Object.fromEntries(changes.map((change) => [change.field, change.value])),
        activityActor,
      );
      if (!updated) return apiError(404, 'CRM entity not found');
      return json(updated);
    }
    if (handler === 'accounting_document') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (!FINANCIAL_WORKFLOW_SCOPES.has(String(body.kind))) return apiError(400, 'Invalid financial document kind');
      if (!(await recordInCurrentBranch('accounting_entries', body.id))) return apiError(403, 'Record is outside the current view scope');
      const [existing] = await repository.query('SELECT kind, status FROM accounting_entries WHERE id = ?', [body.id]);
      if (!existing || existing.kind !== body.kind) return apiError(404, 'Financial document not found');
      if (existing.status !== 'Draft') return apiError(409, `Financial document cannot be edited while ${existing.status}`);
      const values = body.values && typeof body.values === 'object' ? body.values : {};
      const fields = ['code', 'name', 'counterparty', 'currency', 'document_date', 'due_date', 'description'];
      const changes = fields
        .filter((field) => Object.prototype.hasOwnProperty.call(values, field))
        .map((field) => ({ field, value: values[field] }));
      if (!changes.some((change) => change.field === 'code' && String(change.value || '').trim())) return apiError(400, 'code required');
      if (!changes.some((change) => change.field === 'name' && String(change.value || '').trim())) return apiError(400, 'name required');
      if (!changes.some((change) => change.field === 'currency' && String(change.value || '').trim())) return apiError(400, 'currency required');
      const updated = await repository.executeDatasourceMutation(
        {
          table: 'accounting_entries',
          mutations: { update: { fields, timestamps: true } },
        },
        'update',
        body.id,
        Object.fromEntries(changes.map((change) => [change.field, change.value])),
        activityActor,
      );
      if (!updated) return apiError(404, 'Financial document not found');
      return json(updated);
    }
    if (handler === 'chat') {
      if (actionDefinition.operation === 'create_thread') {
        return json(await repository.createChatThread(
          body.values && typeof body.values === 'object' ? body.values : {},
          activityActor,
        ));
      }
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (actionDefinition.operation === 'send_message') {
        return json(await repository.sendChatMessage(body.id, body.content, activityActor));
      }
      return json(await repository.markChatThreadRead(body.id, String(authUser.sub)));
    }
    if (handler === 'contact') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      const domain = actionDefinition.domain === 'crm'
        ? body.kind
        : actionDefinition.domain;
      if (domain !== 'customer' && domain !== 'partner') {
        return apiError(400, 'Invalid CRM contact kind');
      }
      if (!(await crmEntityInScope(domain, body.id))) return apiError(403, 'Record is outside the current view scope');
      const declaredRelation = actionDefinition.datasource
        ? SOURCES.get(actionDefinition.datasource)?.mutations?.[actionDefinition.operation]?.relations?.[domain]
        : null;
      if (!declaredRelation) return apiError(409, 'CRM contact relation is not configured');
      return json(await repository.mutateCrmContact(
        declaredRelation,
        actionDefinition.operation,
        body.id,
        typeof body.contact_id === 'string' ? body.contact_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (handler === 'approval_step') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      const relation = actionDefinition.datasource
        ? SOURCES.get(actionDefinition.datasource)?.meta?.relation
        : null;
      if (!relation) return apiError(409, 'Approval-step relation is not configured');
      return json(await repository.mutateApprovalFlowStep(
        relation,
        actionDefinition.operation,
        body.id,
        typeof body.step_id === 'string' ? body.step_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (handler === 'trip_transition') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (!actionDefinition.transition) return apiError(409, 'This trip transition is not configured');
      return json(await repository.transitionTrip(body.id, actionDefinition.operation, actionDefinition.transition, actionName, activityActor));
    }
    if (handler === 'print_template') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      const relation = actionDefinition.datasource ? SOURCES.get(actionDefinition.datasource)?.meta?.relation : null;
      if (!relation) return apiError(409, 'Print-template block relation is not configured');
      return json(await repository.mutatePrintTemplateBlock(
        relation,
        actionDefinition.operation,
        body.id,
        typeof body.block_id === 'string' ? body.block_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (handler === 'code_rule_preview') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      const source = actionDefinition.datasource ? SOURCES.get(actionDefinition.datasource) : null;
      if (!source) return apiError(409, 'Code-rule preview datasource is not configured');
      const result = await repository.querySource(source, {
        id: body.id,
        current_user_id: String(authUser.sub || ''),
        current_user_name: String(authUser.name || ''),
        current_branch_id: String(authUser.branch_id || ''),
        view_scope: String(authUser.view_scope || 'all'),
      }, 0, 1);
      const rule = result.data?.[0];
      if (!rule) return apiError(404, 'Code rule not found');
      const prefix = String(rule.prefix || rule.config_value || rule.code || 'CODE');
      const width = Math.max(1, Math.min(12, Number(rule.sequence_width) || 4));
      const sequence = String(Number(rule.next_sequence) || 1).padStart(width, '0');
      const year = new Date().getUTCFullYear();
      return json({ preview: prefix.replace('{YYYY}', String(year)).replace(/\{SEQ(?::\d+)?\}/g, sequence), reset_cadence: rule.reset_cadence || 'never' });
    }
    if (handler === 'role_permission') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (typeof body.permission_key !== 'string' || !body.permission_key) return apiError(400, 'permission_key required');
      const relation = actionDefinition.datasource ? SOURCES.get(actionDefinition.datasource)?.meta?.relation : null;
      if (!relation) return apiError(409, 'Role-permission relation is not configured');
      return json(await repository.mutateRolePermission(relation, actionDefinition.operation, body.id, body.permission_key, actionName, activityActor));
    }
    if (handler === 'user_role') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (typeof body.role_id !== 'string' || !body.role_id) return apiError(400, 'role_id required');
      if (!(await recordInCurrentBranch('users', body.id))) return apiError(403, 'User is outside the current view scope');
      const relation = actionDefinition.datasource ? SOURCES.get(actionDefinition.datasource)?.meta?.relation : null;
      if (!relation) return apiError(409, 'User-role relation is not configured');
      return json(await repository.mutateUserRole(relation, actionDefinition.operation, body.id, body.role_id, actionName, activityActor));
    }
    if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');

    if (handler === 'line_item') {
      const declaredLineSource = actionDefinition.datasource ? SOURCES.get(actionDefinition.datasource) : null;
      const declaredLineMutation = declaredLineSource?.mutations?.[actionDefinition.operation];
      if (declaredLineMutation?.parent) {
        if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
        if (!(await recordInCurrentBranch(String(declaredLineMutation.parent.parentTable), body.id))) {
          return apiError(403, 'Record is outside the current view scope');
        }
        return json(await repository.mutateDocumentLine(
          declaredLineMutation.parent,
          actionDefinition.operation,
          body.id,
          typeof body.line_id === 'string' ? body.line_id : null,
          body.values && typeof body.values === 'object' ? body.values : {},
          actionName,
          activityActor,
        ));
      }
      const isOrder = actionDefinition.domain === 'order';
      const isQuote = actionDefinition.domain === 'quote';
      if (!isOrder && !isQuote && !(await recordInCurrentBranch('accounting_entries', body.id))) {
        return apiError(403, 'Record is outside the current view scope');
      }
      if (isOrder && !(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Record is outside the current view scope');
      if (isQuote && !(await recordInCurrentBranch('quotes', body.id))) return apiError(403, 'Record is outside the current view scope');
      return json(await repository.mutateDocumentLine(
        isOrder
          ? {
              parentTable: 'orders',
              lineTable: 'order_lines',
              parentKey: 'order_id',
              label: 'Order',
              hasCost: false,
              totalField: 'total_amount',
            }
          : isQuote ? {
              parentTable: 'quotes',
              lineTable: 'quote_lines',
              parentKey: 'quote_id',
              label: 'Quote',
              hasCost: true,
              totalField: 'amount',
            } : {
              parentTable: 'accounting_entries',
              lineTable: 'accounting_entry_lines',
              parentKey: 'entry_id',
              label: 'Financial document',
              hasCost: false,
              totalField: 'amount',
            },
        actionDefinition.operation,
        body.id,
        typeof body.line_id === 'string' ? body.line_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }

    if (handler === 'order_transition') {
      if (!(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transitionSource = actionDefinition.datasource ? SOURCES.get(actionDefinition.datasource) : SOURCES.get('orders');
      const transition = transitionSource?.workflow?.actions?.[actionDefinition.operation];
      if (!transition) return apiError(409, 'This order transition is not configured');
      const order = await repository.transitionOrder(
        body.id,
        transition.from,
        transition.to,
        actionName,
        activityActor,
      );
      return json(order);
    }

    if (handler === 'order_chatter') {
      if (!(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Order is outside the current view scope');
      if (actionDefinition.operation === 'follower_add' || actionDefinition.operation === 'follower_remove') {
        if (typeof body.user_id !== 'string' || !body.user_id) return apiError(400, 'user_id required');
        if (actionDefinition.operation === 'follower_add' && String(authUser.view_scope || 'all') !== 'all') {
          const [candidate] = await repository.query('SELECT id FROM users WHERE id = ? AND enabled = true AND branch_id = ?', [body.user_id, String(authUser.branch_id || '')]);
          if (!candidate) return apiError(403, 'Follower is outside the current view scope');
        }
        const relation = actionDefinition.datasource ? SOURCES.get(actionDefinition.datasource)?.meta?.relation : null;
        if (!relation) return apiError(409, 'Order-follower relation is not configured');
        return json(await repository.mutateOrderFollower(relation, body.id, actionDefinition.operation, body.user_id, activityActor));
      }
      if (actionDefinition.operation !== 'message' && actionDefinition.operation !== 'note') return apiError(400, 'Invalid order chatter operation');
      return json(await repository.addOrderChatterEntry(
        body.id,
        actionDefinition.operation,
        body.values && typeof body.values === 'object' ? body.values : {},
        activityActor,
      ));
    }

    if (handler === 'financial_transition') {
      if (!(await recordInCurrentBranch('accounting_entries', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transition = actionDefinition.transition;
      if (!transition) return apiError(409, 'This financial transition is not configured');
      const document = await repository.transitionAccountingEntry(
        body.id,
        actionDefinition.kind,
        transition.from,
        transition.to,
        actionName,
        activityActor,
      );
      return json(document);
    }

    if (handler === 'business_transition' && actionDefinition.domain === 'quote') {
      if (!(await recordInCurrentBranch('quotes', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transition = actionDefinition.transition;
      if (!transition) return apiError(409, 'This quote transition is not configured');
      return json(await repository.transitionBusinessRecord(
        { table: 'quotes', label: 'Quote' },
        body.id,
        transition.from,
        transition.to,
        actionName,
        activityActor,
      ));
    }

    if (!(await recordInCurrentBranch('payrolls', body.id))) return apiError(403, 'Record is outside the current view scope');
    const transition = actionDefinition.transition;
    if (!transition) return apiError(409, 'This payroll transition is not configured');
    return json(await repository.transitionBusinessRecord(
      { table: 'payrolls', label: 'Payroll' },
      body.id,
      transition.from,
      transition.to,
      actionName,
      activityActor,
    ));
  }

  // ── POST /api/patch ───────────────────────────────────────────────────────
  if (pathname === '/api/patch' && method === 'POST') {
    const body = await req.json() as any;
    let { table, action, id, changes = [], scope } = body;

    const source = typeof body.datasource === 'string' ? SOURCES.get(body.datasource) : null;
    const mutationOperation = body.action === 'insert' ? 'create' : body.action;
    if (source?.mutations?.[mutationOperation] && source.table) {
      const mutation = source?.mutations?.[mutationOperation];
      requirePerm(String(mutation.permission || source.permission));
      const values = Object.fromEntries(
        (Array.isArray(changes) ? changes : []).map((change: any) => [String(change.field), change.value]),
      );
      try {
        const result = await repository.executeDatasourceMutation(
          source,
          mutationOperation,
          body.id ? String(body.id) : null,
          values,
          activityActor,
        );
        return json(result, mutationOperation === 'create' ? 201 : 200);
      } catch (error: any) {
        if (error?.status) return apiError(error.status, error.message || 'Datasource mutation failed');
        throw error;
      }
    }

    const tbl = TABLES[table as keyof typeof TABLES];
    if (!tbl) return apiError(404, `Unknown table: ${table}`);
    requirePerm(tbl.permission);

    const scopedBranch = String(authUser.view_scope || 'all') !== 'all';
    const currentBranchId = String(authUser.branch_id || '');
    const rejectOutOfScope = () => apiError(403, 'Record is outside the current view scope');
    const branchForRow = async (resourceTable: string, resourceId: string) => {
      if (resourceTable === 'trucks' || resourceTable === 'departments') {
        const [row] = await repository.query(`SELECT branch_id FROM ${resourceTable} WHERE id = ?`, [resourceId]);
        return row?.branch_id ? String(row.branch_id) : null;
      }
      if (resourceTable === 'users' || resourceTable === 'employees' || resourceTable === 'employment_contracts' || resourceTable === 'timesheets' || resourceTable === 'payrolls') {
        return branchForScopedResource(resourceTable, resourceId);
      }
      if (resourceTable === 'accounting_entries' || resourceTable === 'orders' || resourceTable === 'quotes' || resourceTable === 'locations' || resourceTable === 'containers') return branchForScopedResource(resourceTable, resourceId);
      if (resourceTable === 'drivers') {
        const [row] = await repository.query(
          'SELECT t.branch_id FROM drivers d LEFT JOIN trucks t ON t.id = d.assigned_truck_id WHERE d.id = ?',
          [resourceId],
        );
        return row?.branch_id ? String(row.branch_id) : null;
      }
      if (resourceTable === 'trips' || resourceTable === 'maintenance') {
        const [row] = await repository.query(
          `SELECT COALESCE(r.branch_id, t.branch_id) AS branch_id FROM ${resourceTable} r LEFT JOIN trucks t ON t.id = r.truck_id WHERE r.id = ?`,
          [resourceId],
        );
        return row?.branch_id ? String(row.branch_id) : null;
      }
      if (resourceTable === 'branches') return resourceId;
      if (resourceTable === 'teams') {
        const [row] = await repository.query(
          'SELECT d.branch_id FROM teams t LEFT JOIN departments d ON d.id = t.department_id WHERE t.id = ?',
          [resourceId],
        );
        return row?.branch_id ? String(row.branch_id) : null;
      }
      return null;
    };
    const departmentBranch = async (departmentId: unknown) => {
      if (!departmentId) return null;
      const [row] = await repository.query('SELECT branch_id FROM departments WHERE id = ?', [String(departmentId)]);
      return row?.branch_id ? String(row.branch_id) : null;
    };
    if (table === 'trips' && action === 'insert' && !changes.some((change: any) => change.field === 'branch_id')) {
      const truckId = changes.find((change: any) => change.field === 'truck_id')?.value;
      const truckBranch = truckId ? await branchForRow('trucks', String(truckId)) : null;
      if (truckBranch) changes = [...changes, { field: 'branch_id', value: truckBranch }];
    }
    if (table === 'customers' || table === 'partners') {
      const kind = table === 'customers' ? 'customer' : 'partner';
      if (action === 'insert') {
        const ownerChange = changes.find((change: any) => change.field === 'owner_name');
        if (scopedBranch && ownerChange && String(ownerChange.value || '') !== activityActor.name) return rejectOutOfScope();
        if (scopedBranch && !ownerChange) changes = [...changes, { field: 'owner_name', value: activityActor.name }];
      } else if (id && !(await crmEntityInScope(kind, String(id)))) {
        return rejectOutOfScope();
      }
    }

    if (scopedBranch) {
      if (!currentBranchId) return rejectOutOfScope();
      if (action === 'insert') {
        if (table === 'branches') return rejectOutOfScope();
        if (table === 'trucks' || table === 'departments') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          if (table === 'departments') {
            const parentId = changes.find((change: any) => change.field === 'parent_id')?.value;
            const parentBranch = parentId ? await departmentBranch(parentId) : currentBranchId;
            if (!parentBranch || parentBranch !== currentBranchId) return rejectOutOfScope();
          }
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'teams') {
          const branchId = await departmentBranch(changes.find((change: any) => change.field === 'department_id')?.value);
          if (branchId && branchId !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'drivers' || table === 'trips' || table === 'maintenance') {
          const truckId = changes.find((change: any) => change.field === (table === 'drivers' ? 'assigned_truck_id' : 'truck_id'))?.value;
          const requestedBranch = table === 'trips' ? changes.find((change: any) => change.field === 'branch_id')?.value : null;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          const branchId = truckId ? await branchForRow('trucks', String(truckId)) : (requestedBranch ? String(requestedBranch) : currentBranchId);
          if (!branchId || branchId !== currentBranchId) return rejectOutOfScope();
          if (table === 'trips' && !requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'users') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          const departmentId = changes.find((change: any) => change.field === 'department_id')?.value;
          const departmentScope = departmentId ? await departmentBranch(departmentId) : currentBranchId;
          if (!departmentScope || departmentScope !== currentBranchId) return rejectOutOfScope();
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'employees') {
          const department = changes.find((change: any) => change.field === 'department')?.value;
          const [row] = department ? await repository.query('SELECT branch_id FROM departments WHERE name ILIKE ? LIMIT 1', [`%${String(department)}%`]) : [];
          if (!row?.branch_id || String(row.branch_id) !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'employment_contracts' || table === 'timesheets' || table === 'payrolls') {
          const employeeId = changes.find((change: any) => change.field === 'employee_id')?.value;
          const employeeBranch = employeeId ? await branchForScopedResource('employees', String(employeeId)) : null;
          if (!employeeBranch || employeeBranch !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'accounting_entries') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'orders' || table === 'quotes') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'locations' || table === 'containers') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          if (table === 'containers') {
            const locationId = changes.find((change: any) => change.field === 'location_id')?.value;
            const locationBranch = locationId ? await branchForRow('locations', String(locationId)) : currentBranchId;
            if (!locationBranch || locationBranch !== currentBranchId) return rejectOutOfScope();
          }
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
      } else if (id) {
        const rowBranch = await branchForRow(table, String(id));
        if ((table === 'drivers' || table === 'trips' || table === 'maintenance' || table === 'users' || table === 'employees' || table === 'employment_contracts' || table === 'timesheets' || table === 'payrolls' || table === 'accounting_entries' || table === 'orders' || table === 'quotes' || table === 'locations' || table === 'containers') && !rowBranch) return rejectOutOfScope();
        if (rowBranch && rowBranch !== currentBranchId) return rejectOutOfScope();
        if (table === 'trucks' || table === 'departments') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'departments' && action === 'update') {
          const parentChange = changes.find((change: any) => change.field === 'parent_id');
          if (parentChange) {
            const parentBranch = parentChange.value ? await departmentBranch(parentChange.value) : currentBranchId;
            if (!parentBranch || parentBranch !== currentBranchId) return rejectOutOfScope();
          }
        }
        if (table === 'teams' && action === 'update') {
          const departmentId = changes.find((change: any) => change.field === 'department_id')?.value;
          const nextBranch = await departmentBranch(departmentId);
          if (nextBranch && nextBranch !== currentBranchId) return rejectOutOfScope();
        }
        if ((table === 'drivers' || table === 'trips' || table === 'maintenance') && action === 'update') {
          const truckField = table === 'drivers' ? 'assigned_truck_id' : 'truck_id';
          const truckChange = changes.find((change: any) => change.field === truckField);
          if (truckChange && truckChange.value) {
            const nextBranch = await branchForRow('trucks', String(truckChange.value || ''));
            if (!nextBranch || nextBranch !== currentBranchId) return rejectOutOfScope();
          }
          if (table === 'trips') {
            const branchChange = changes.find((change: any) => change.field === 'branch_id');
            if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
          }
        }
        if (table === 'users' && action === 'update') {
          const branchChange = changes.find((change: any) => change.field === 'branch_id');
          if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
          const departmentChange = changes.find((change: any) => change.field === 'department_id');
          if (departmentChange) {
            const departmentScope = await departmentBranch(departmentChange.value);
            if (!departmentScope || departmentScope !== currentBranchId) return rejectOutOfScope();
          }
        }
        if (table === 'employees' && action === 'update') {
          const departmentChange = changes.find((change: any) => change.field === 'department');
          if (departmentChange) {
            const [nextDepartment] = await repository.query('SELECT branch_id FROM departments WHERE name ILIKE ? LIMIT 1', [`%${String(departmentChange.value || '')}%`]);
            if (!nextDepartment?.branch_id || String(nextDepartment.branch_id) !== currentBranchId) return rejectOutOfScope();
          }
        }
        if ((table === 'employment_contracts' || table === 'timesheets' || table === 'payrolls') && action === 'update') {
          const employeeChange = changes.find((change: any) => change.field === 'employee_id');
          if (employeeChange) {
            const nextBranch = await branchForScopedResource('employees', String(employeeChange.value || ''));
            if (!nextBranch || nextBranch !== currentBranchId) return rejectOutOfScope();
          }
        }
        if (table === 'accounting_entries' && action === 'update') {
          const branchChange = changes.find((change: any) => change.field === 'branch_id');
          if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
        }
        if ((table === 'orders' || table === 'quotes') && action === 'update') {
          const branchChange = changes.find((change: any) => change.field === 'branch_id');
          if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
        }
        if ((table === 'locations' || table === 'containers') && action === 'update') {
          const branchChange = changes.find((change: any) => change.field === 'branch_id');
          if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
          if (table === 'containers') {
            const locationChange = changes.find((change: any) => change.field === 'location_id');
            if (locationChange) {
              const nextBranch = await branchForRow('locations', String(locationChange.value || ''));
              if (!nextBranch || nextBranch !== currentBranchId) return rejectOutOfScope();
            }
          }
        }
      }
    }

    if ('fields' in tbl && changes.some((change: any) => !tbl.fields.includes(change.field))) {
      return apiError(400, 'Invalid field for this resource');
    }
    const changedValue = (field: string) => changes.find((change: any) => change.field === field)?.value;
    const hasChanged = (field: string) => changes.some((change: any) => change.field === field);
    const validateCatalogValue = (field: string, validate: (value: unknown) => boolean, message: string) => {
      if (hasChanged(field) && !validate(changedValue(field))) return message;
      return null;
    };
    if (table === 'master_data' || table === 'system_configs') {
      if (action === 'insert' && (!String(changedValue('code') || '').trim() || !String(changedValue('name') || '').trim())) {
        return apiError(400, 'code and name are required');
      }
      for (const [field, validate, message] of [
        ['code', (value: unknown) => Boolean(String(value || '').trim()), 'code is required'],
        ['name', (value: unknown) => Boolean(String(value || '').trim()), 'name is required'],
        ['status', (value: unknown) => ['Active', 'Inactive'].includes(String(value)), 'status must be Active or Inactive'],
        ['sort_order', (value: unknown) => Number.isInteger(Number(value)) && Number(value) >= 0, 'sort_order must be a non-negative integer'],
      ] as const) {
        const error = validateCatalogValue(field, validate, message);
        if (error) return apiError(400, error);
      }
    }
    if (table === 'master_data') {
      const error = validateCatalogValue('decimals', (value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 6, 'decimals must be an integer from 0 to 6');
      if (error) return apiError(400, error);
    }
    if (table === 'system_configs' && scope === 'code_rule') {
      for (const [field, validate, message] of [
        ['prefix', (value: unknown) => Boolean(String(value || '').trim()), 'prefix is required'],
        ['sequence_width', (value: unknown) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 12, 'sequence_width must be an integer from 1 to 12'],
        ['next_sequence', (value: unknown) => Number.isInteger(Number(value)) && Number(value) >= 1, 'next_sequence must be a positive integer'],
        ['reset_cadence', (value: unknown) => ['never', 'monthly', 'yearly'].includes(String(value)), 'reset_cadence is invalid'],
      ] as const) {
        const error = validateCatalogValue(field, validate, message);
        if (error) return apiError(400, error);
      }
    }
    if (table === 'roles' && changes.some((change: any) => change.field === 'view_scope' && !['all', 'branch', 'own'].includes(String(change.value)))) {
      return apiError(400, 'Invalid role view scope');
    }
    if (table === 'areas' && changes.some((change: any) => change.field === 'parent_id')) {
      const parentId = changes.find((change: any) => change.field === 'parent_id')?.value;
      if (parentId && String(parentId) === String(id)) return apiError(400, 'Area cannot be its own parent');
      if (parentId) {
        const [parent] = await repository.query('SELECT id FROM areas WHERE id = ?', [parentId]);
        if (!parent) return apiError(400, 'Parent area not found');
        let cursor = String(parentId);
        for (let depth = 0; depth < 100 && cursor; depth++) {
          if (cursor === String(id)) return apiError(400, 'Area hierarchy cycle detected');
          const [ancestor] = await repository.query('SELECT parent_id FROM areas WHERE id = ?', [cursor]);
          cursor = ancestor?.parent_id ? String(ancestor.parent_id) : '';
        }
      }
    }
    if (table === 'departments' && changes.some((change: any) => change.field === 'parent_id')) {
      const parentId = changes.find((change: any) => change.field === 'parent_id')?.value;
      if (parentId && String(parentId) === String(id)) return apiError(400, 'Department cannot be its own parent');
      if (parentId) {
        const [parent] = await repository.query('SELECT id FROM departments WHERE id = ?', [parentId]);
        if (!parent) return apiError(400, 'Parent department not found');
        let cursor = String(parentId);
        for (let depth = 0; depth < 100 && cursor; depth++) {
          if (cursor === String(id)) return apiError(400, 'Department hierarchy cycle detected');
          const [ancestor] = await repository.query('SELECT parent_id FROM departments WHERE id = ?', [cursor]);
          cursor = ancestor?.parent_id ? String(ancestor.parent_id) : '';
        }
      }
    }
    if (table === 'accounting_entries' && changes.some((change: any) => change.field === 'linked_advance_id')) {
      const linkedId = changes.find((change: any) => change.field === 'linked_advance_id')?.value;
      if (linkedId) {
        const [advance] = await repository.query("SELECT id FROM accounting_entries WHERE id = ? AND kind = 'advance'", [linkedId]);
        if (!advance) return apiError(400, 'Linked advance not found');
      }
    }
    if (table === 'accounting_entries' && scope === 'ledger_account' && changes.some((change: any) => change.field === 'parent_id')) {
      const parentId = changes.find((change: any) => change.field === 'parent_id')?.value;
      if (parentId && String(parentId) === String(id)) return apiError(400, 'Ledger account cannot be its own parent');
      if (parentId) {
        const [parent] = await repository.query("SELECT id FROM accounting_entries WHERE id = ? AND kind = 'ledger_account'", [parentId]);
        if (!parent) return apiError(400, 'Parent ledger account not found');
        let cursor = String(parentId);
        for (let depth = 0; depth < 100 && cursor; depth++) {
          if (cursor === String(id)) return apiError(400, 'Ledger account hierarchy cycle detected');
          const [ancestor] = await repository.query("SELECT parent_id FROM accounting_entries WHERE id = ? AND kind = 'ledger_account'", [cursor]);
          cursor = ancestor?.parent_id ? String(ancestor.parent_id) : '';
        }
      }
    }
    if ('scopes' in tbl && !tbl.scopes.includes(scope)) {
      return apiError(400, 'Invalid resource scope');
    }
    if (
      table === 'accounting_entries'
      && FINANCIAL_WORKFLOW_SCOPES.has(scope)
      && changes.some((change: any) => change.field === 'status' || change.field === 'amount')
    ) {
      return apiError(400, 'Financial document status and amount require named actions');
    }
    if (
      (table === 'quotes' || table === 'payrolls')
      && changes.some((change: any) => change.field === 'status')
    ) {
      return apiError(400, `${table === 'quotes' ? 'Quote' : 'Payroll'} status requires a named action`);
    }

    if ('scopes' in tbl && action !== 'insert') {
      const existing = await repository.query(`SELECT kind FROM ${table} WHERE id = ?`, [id]);
      if (!existing[0] || existing[0].kind !== scope) return apiError(404, 'Resource not found');
    }
    if (table === 'orders' && (action === 'update' || action === 'delete')) {
      const [order] = await repository.query(
        `SELECT COALESCE(s.status, o.status) AS status
         FROM orders o LEFT JOIN order_workflow_states s ON s.order_id = o.id
         WHERE o.id = ?`,
        [id],
      );
      if (!order) return apiError(404, 'Order not found');
      if (order.status !== 'Draft') {
        return apiError(409, `Order cannot be ${action === 'update' ? 'edited' : 'deleted'} while ${order.status}`);
      }
    }
    if (
      table === 'accounting_entries'
      && FINANCIAL_WORKFLOW_SCOPES.has(scope)
      && (action === 'update' || action === 'delete')
    ) {
      const [document] = await repository.query(
        'SELECT status FROM accounting_entries WHERE id = ? AND kind = ?',
        [id, scope],
      );
      if (!document) return apiError(404, 'Financial document not found');
      if (document.status !== 'Draft') {
        return apiError(
          409,
          `Financial document cannot be ${action === 'update' ? 'edited' : 'deleted'} while ${document.status}`,
        );
      }
    }
    if (
      (table === 'quotes' || table === 'payrolls')
      && (action === 'update' || action === 'delete')
    ) {
      const [record] = await repository.query(
        `SELECT status FROM ${table} WHERE id = ?`,
        [id],
      );
      if (!record) return apiError(404, `${table === 'quotes' ? 'Quote' : 'Payroll'} not found`);
      if (record.status !== 'Draft') {
        return apiError(
          409,
          `${table === 'quotes' ? 'Quote' : 'Payroll'} cannot be ${action === 'update' ? 'edited' : 'deleted'} while ${record.status}`,
        );
      }
    }

    // All compatibility guards have passed. Use the YAML-derived mutation
    // contract for ordinary database writes; users retain their password
    // hashing path until that capability is declared separately.
    if (table !== 'users') {
      const yamlSource = YAML_CRUD_SOURCES.get(`${table}:${String(scope || '')}`);
      const mutationOperation = action === 'insert' ? 'create' : action;
      if (yamlSource?.mutations?.[mutationOperation]) {
        try {
          const values = Object.fromEntries(
            (Array.isArray(changes) ? changes : []).map((change: any) => [String(change.field), change.value]),
          );
          const result = await repository.executeDatasourceMutation(
            yamlSource,
            mutationOperation,
            id ? String(id) : null,
            values,
            activityActor,
          );
          return json(result, mutationOperation === 'create' ? 201 : 200);
        } catch (error: any) {
          if (error?.status) return apiError(error.status, error.message || 'Datasource mutation failed');
          throw error;
        }
      }
    }

    // ── insert ──────────────────────────────────────────────────────────────
    if (action === 'insert') {
      if (table === 'users') {
        const created = await repository.createUser(changes);
        await repository.recordActivity({
          actorId: activityActor.id,
          actorName: activityActor.name,
          action: 'create',
          resource: table,
          resourceId: created?.id,
          detail: `Created ${table} record`,
        });
        return json(created, 201);
      }

      // Generic insert
      if (changes.length === 0) return apiError(400, 'No fields to insert');
      const scopedChanges = 'scopes' in tbl
        ? [{ field: 'kind', value: scope }, ...changes]
        : changes;
      const created = await repository.createRecord(table, scopedChanges);
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'create',
        resource: table,
        resourceId: created?.id,
        detail: `Created ${scope || table} record`,
      });
      return json(created, 201);
    }

    // ── update ──────────────────────────────────────────────────────────────
    if (action === 'update') {
      if (!id) return apiError(400, 'id required for update');

      if (table === 'users') {
        const updated = await repository.updateUser(id, changes);
        await repository.recordActivity({
          actorId: activityActor.id,
          actorName: activityActor.name,
          action: 'update',
          resource: table,
          resourceId: String(id),
          detail: `Updated fields: ${changes.map((change: any) => change.field).join(', ')}`,
        });
        return json(updated);
      }

      // Generic update
      if (changes.length === 0) return apiError(400, 'No fields to update');
      const updated = await repository.updateRecord(table, id, changes, tbl.timestamps);
      if (!updated) return apiError(404, 'Resource not found');
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'update',
        resource: table,
        resourceId: String(id),
        detail: `Updated fields: ${changes.map((change: any) => change.field).join(', ')}`,
      });
      return json(updated);
    }

    // ── delete ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) return apiError(400, 'id required for delete');
      if (!('scopes' in tbl) && table !== 'orders') {
        const existing = await repository.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
        if (!existing[0]) return apiError(404, 'Resource not found');
      }
      if (table === 'users') {
        await repository.deleteUserRoles(id);
      }
      await repository.deleteRecord(table, id);
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'delete',
        resource: table,
        resourceId: String(id),
        detail: `Deleted ${scope || table} record`,
      });
      return json({ ok: true });
    }

    return apiError(400, `Unknown action: ${action}`);
  }

  // ── PROFILE (self-update) ─────────────────────────────────────────────────
  if (pathname === '/api/v1/profile' && method === 'GET') {
    const profile = await repository.getProfile(authUser.sub);
    if (!profile) return apiError(404, 'User not found');
    return json(profile);
  }

  if (pathname === '/api/v1/company' && method === 'GET') {
    const company = await repository.getCompanyProfile();
    if (!company) return apiError(404, 'Company profile not found');
    return json(company);
  }

  if (pathname === '/api/v1/profile' && method === 'PATCH') {
    const body = await req.json();
    const allowed = ['name', 'preferred_lang', 'avatar_url'];
    const fields  = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (body.new_password) {
      if (!body.current_password) return apiError(400, 'current_password required');
      try {
        await authProvider.changePassword(String(authUser.sub), body.current_password, body.new_password);
    } catch (err) {
      const error = err as any;
      return apiError(error.status || 400, error.message || 'Password change failed');
      }
    }

    if (Object.keys(fields).length) {
      await repository.updateProfile(authUser.sub, fields);
    }
    return json({ ok: true });
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  if (pathname === '/api/v1/notifications' && method === 'GET') {
    return json(await repository.listNotifications(authUser.sub));
  }

  if (pathname === '/api/v1/notifications' && method === 'POST') {
    const body = await req.json() as any;
    const created = await repository.createNotification({
      user_id: body.user_id || authUser.sub,
      type: body.type,
      title: body.title,
      body: body.body || null,
      target_path: body.target_path || null,
    });
    return json(created, 201);
  }

  if (pathname === '/api/v1/notifications/read-all' && method === 'PATCH') {
    await repository.markAllNotificationsRead(authUser.sub);
    return json({ ok: true });
  }

  const notifReadMatch = pathname.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'PATCH') {
    await repository.markNotificationRead(notifReadMatch[1], authUser.sub);
    return json({ ok: true });
  }

  return apiError(404, 'API route not found');
}



  return handleAPI;
}
