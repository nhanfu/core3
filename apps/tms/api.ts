import { translationMap } from '../lib/server/discovery.ts';
import { requestLanguage } from '../lib/server/locale.ts';
import { join } from 'node:path';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { xlsxToCsv } from './module.ts';
import {
  ORDER_ACTION_REGISTRY,
  orderWorkflow,
  FINANCIAL_ACTION_REGISTRY,
  financialWorkflow,
  BUSINESS_ACTION_REGISTRY,
  payrollWorkflow,
  quoteWorkflow,
  LINE_ITEM_ACTION_REGISTRY,
  CHAT_ACTION_REGISTRY,
  CONTACT_ACTION_REGISTRY,
  APPROVAL_ACTION_REGISTRY,
  TRIP_ACTION_REGISTRY,
  TEMPLATE_ACTION_REGISTRY,
  CODE_RULE_ACTION_REGISTRY,
  ROLE_ACTION_REGISTRY,
  USER_ROLE_ACTION_REGISTRY,
  CURRENCY_ACTION_REGISTRY,
} from './module.ts';

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
  uploadRoot: string;
};

export function createTmsApi(ctx: TmsApiContext) {
  const {
    repository,
    authProvider,
    sources: SOURCES,
    pages: PAGES,
    catalogs: CATALOGS,
    menus: MENUS,
    uploadRoot: UPLOAD_ROOT,
  } = ctx;

  const CRM_ENTITY_ACTION_REGISTRY: Record<string, { permission: string }> = {
    'crm.entities.update': { permission: 'crm.write' },
  } as const;
  const ACCOUNTING_DOCUMENT_ACTION_REGISTRY: Record<string, { permission: string }> = {
    'accounting.documents.update': { permission: 'accounting.write' },
  } as const;
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

  function json(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
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
        for (const tab of component.tabs || []) visit(tab.components);
      }
    };
    visit(page.components);
    return sizes;
  }

  async function prefetchedPageConfig(page: any, url: URL, user: any) {
    const params: Record<string, unknown> = {};
    for (const [key, value] of url.searchParams.entries()) {
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

  const TABLE_REGISTRY = {
  orders: {
    permission: 'orders.write',
    timestamps: true,
    fields: [
      'order_number',
      'customer_name',
      'customer_legal_name',
      'order_date',
      'shipment_type',
      'route',
      'transport_method',
      'trip_count',
      'notes',
      'branch_id',
    ],
  },
  trucks: {
    permission: 'fleet.write',
    timestamps: true,
    fields: ['plate', 'model', 'type', 'status', 'capacity_kg', 'mileage', 'driver_id', 'last_service', 'next_service', 'branch_id', 'notes'],
  },
  drivers: {
    permission: 'drivers.write',
    timestamps: true,
    fields: ['name', 'phone', 'email', 'license_number', 'license_expiry', 'status', 'assigned_truck_id'],
  },
  trips: {
    permission: 'trips.write',
    timestamps: true,
    fields: ['trip_number', 'truck_id', 'driver_id', 'branch_id', 'origin', 'destination', 'status', 'departure_time', 'arrival_time', 'distance_km', 'cargo_type', 'cargo_weight', 'notes'],
  },
  maintenance: {
    permission: 'maintenance.write',
    timestamps: true,
    fields: ['truck_id', 'service_type', 'status', 'scheduled_date', 'completed_date', 'technician_id', 'cost', 'notes'],
  },
  customers:    {
    permission: 'crm.write',
    timestamps: true,
    fields: ['code', 'name', 'tax_code', 'phone', 'email', 'stage', 'owner_name', 'visibility', 'status'],
  },
  quotes: { permission: 'crm.write', timestamps: true, fields: ['code', 'customer_name', 'title', 'status', 'valid_until', 'branch_id'] },
  partners:     {
    permission: 'crm.write',
    timestamps: true,
    fields: ['code', 'name', 'tax_code', 'phone', 'email', 'partner_type', 'owner_name', 'visibility', 'status'],
  },
  containers: {
    permission: 'dispatch.write',
    timestamps: true,
    fields: ['container_number', 'container_type', 'owner_name', 'location_id', 'branch_id', 'status', 'notes'],
  },
  locations: {
    permission: 'dispatch.write',
    timestamps: true,
    fields: ['code', 'name', 'location_type', 'address', 'city', 'area_id', 'branch_id', 'status'],
  },
  areas: {
    permission: 'dispatch.write',
    timestamps: true,
    fields: ['code', 'name', 'parent_id', 'region', 'description', 'status'],
  },
  company_profiles: {
    permission: 'settings.write',
    timestamps: true,
    fields: ['name', 'short_name', 'tax_code', 'address', 'invoice_address', 'phone', 'email', 'website', 'bank_name', 'bank_account', 'notes'],
  },
  departments: {
    permission: 'settings.write',
    timestamps: true,
    fields: ['code', 'name', 'parent_id', 'branch_id', 'status'],
  },
  teams: {
    permission: 'settings.write',
    timestamps: true,
    fields: ['code', 'name', 'department_id', 'manager_id', 'status'],
  },
  employees:    {
    permission: 'hr.write',
    timestamps: true,
    fields: ['code', 'name', 'job_title', 'phone', 'email', 'department', 'start_date', 'dependents', 'status'],
  },
  employment_contracts: {
    permission: 'hr.write',
    timestamps: true,
    fields: ['code', 'employee_id', 'contract_type', 'start_date', 'end_date', 'base_salary', 'status'],
  },
  work_shifts: {
    permission: 'hr.write',
    timestamps: true,
    fields: ['code', 'name', 'start_time', 'end_time', 'break_minutes', 'status'],
  },
  timesheets: {
    permission: 'hr.write',
    timestamps: true,
    fields: ['employee_id', 'work_date', 'shift_id', 'hours', 'status', 'notes'],
  },
  payrolls: {
    permission: 'hr.write',
    timestamps: true,
    fields: ['code', 'employee_id', 'pay_month', 'base_salary', 'allowance', 'deduction', 'net_salary', 'status'],
  },
  master_data: {
    permission: 'catalog.write',
    timestamps: true,
    fields: ['code', 'name', 'description', 'symbol', 'decimals', 'status', 'sort_order'],
    scopes: ['container_type', 'vehicle_type', 'unit', 'cargo_type', 'fee_type', 'currency'],
  },
  accounting_entries: {
    permission: 'accounting.write',
    timestamps: true,
    fields: ['code', 'name', 'counterparty', 'amount', 'currency', 'status', 'document_date', 'due_date', 'description', 'branch_id', 'linked_advance_id', 'parent_id', 'sort_order'],
    scopes: ['debit_note', 'payment_request', 'advance', 'settlement', 'invoice_template', 'ledger_account'],
  },
  system_configs: { permission: 'system.write', timestamps: true, fields: ['code', 'name', 'config_value', 'description', 'prefix', 'sequence_width', 'reset_cadence', 'next_sequence', 'status', 'sort_order'], scopes: ['code_rule', 'print_template', 'approval_flow', 'shipment_type', 'trip_status', 'fee_rule', 'storage'] },
  branches: {
    permission: 'settings.write',
    timestamps: true,
    fields: ['name', 'city', 'region', 'status'],
  },
  users: {
    permission: 'settings.write',
    timestamps: true,
    fields: ['email', 'name', 'avatar_url', 'preferred_lang', 'enabled', 'branch_id', 'department_id', 'roles', 'password'],
  },
  roles: {
    permission: 'settings.write',
    timestamps: false,
    fields: ['name', 'description', 'view_scope'],
  },
};



  const REGISTERED_NAMED_ACTIONS = new Set([
    ...Object.keys(ORDER_ACTION_REGISTRY),
    ...Object.keys(FINANCIAL_ACTION_REGISTRY),
    ...Object.keys(BUSINESS_ACTION_REGISTRY),
    ...Object.keys(LINE_ITEM_ACTION_REGISTRY),
    ...Object.keys(CHAT_ACTION_REGISTRY),
    ...Object.keys(CONTACT_ACTION_REGISTRY),
    ...Object.keys(APPROVAL_ACTION_REGISTRY),
    ...Object.keys(TRIP_ACTION_REGISTRY),
    ...Object.keys(TEMPLATE_ACTION_REGISTRY),
    ...Object.keys(CODE_RULE_ACTION_REGISTRY),
    ...Object.keys(ROLE_ACTION_REGISTRY),
    ...Object.keys(USER_ROLE_ACTION_REGISTRY),
    ...Object.keys(CURRENCY_ACTION_REGISTRY),
    ...Object.keys(CRM_ENTITY_ACTION_REGISTRY),
    ...Object.keys(ACCOUNTING_DOCUMENT_ACTION_REGISTRY),
  ]);

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

  // ── Auth (no JWT required) ────────────────────────────────────────────────
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = await req.json() as any;
    if (!email || !password) return apiError(400, 'email and password required');
    try {
      return json(await authProvider.login(email, password, repository));
    } catch (err) {
      const error = err as any;
      return apiError(error.status || 401, error.message || 'Invalid credentials');
    }
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = await requireAuth(req);
    return json(user);
  }

  // The login page is a public YAML page; all other page configs remain behind auth.
  const publicPageMatch = pathname.match(/^\/api\/pages\/([A-Za-z0-9_-]+)$/);
  if (publicPageMatch && method === 'GET' && publicPageMatch[1] === 'login') {
    const page = PAGES.get('login');
    if (!page) return apiError(404, 'Unknown page: login');
    const lang = requestLanguage(url);
    return json({
      ...publicPageConfig(page),
      i18n: {
        lang,
        page: translationMap(CATALOGS, lang, 'login'),
        global: translationMap(CATALOGS, lang, '*'),
      },
    });
  }

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
    if (meta.kind !== 'chat_attachment' && meta.kind !== 'employee_document' && meta.kind !== 'contract_document' && meta.kind !== 'company_document' && meta.kind !== 'master_data_import') return apiError(400, 'Unsupported upload kind');
    if (meta.kind === 'chat_attachment') {
      requirePerm('chat.write');
      if (typeof meta.thread_id !== 'string' || !meta.thread_id) return apiError(400, 'thread_id required');
    } else if (meta.kind === 'employee_document') {
      requirePerm('hr.write');
      if (typeof meta.employee_id !== 'string' || !meta.employee_id) return apiError(400, 'employee_id required');
      if (!(await recordInCurrentBranch('employees', meta.employee_id))) return apiError(403, 'Record is outside the current view scope');
    } else if (meta.kind === 'contract_document') {
      requirePerm('hr.write');
      if (typeof meta.contract_id !== 'string' || !meta.contract_id) return apiError(400, 'contract_id required');
      if (!(await recordInCurrentBranch('employment_contracts', meta.contract_id))) return apiError(403, 'Record is outside the current view scope');
    } else if (meta.kind === 'company_document') {
      requirePerm('settings.write');
      if (typeof meta.company_id !== 'string' || !meta.company_id) return apiError(400, 'company_id required');
    } else {
      requirePerm('catalog.write');
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
      const result = await repository.importMasterData(meta.scope, importText, activityActor);
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
      if (meta.kind === 'employee_document') return json(await repository.createEmployeeDocument(meta.employee_id, fileMeta, activityActor));
      if (meta.kind === 'contract_document') return json(await repository.createContractDocument(meta.contract_id, fileMeta, activityActor));
      if (meta.kind === 'company_document') return json(await repository.createCompanyDocument(meta.company_id, fileMeta, activityActor));
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
    requirePerm('hr.read');
    const document = await repository.getContractDocument(contractDocumentMatch[1]);
    if (!document) return apiError(404, 'Contract document not found');
    if (!(await recordInCurrentBranch('employment_contracts', String(document.contract_id)))) return apiError(403, 'Record is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Contract document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const companyDocumentMatch = pathname.match(/^\/api\/org\/company-documents\/([A-Za-z0-9-]+)$/);
  if (companyDocumentMatch && method === 'GET') {
    requirePerm('settings.read');
    const document = await repository.getCompanyDocument(companyDocumentMatch[1]);
    if (!document) return apiError(404, 'Company document not found');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Company document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const employeeDocumentMatch = pathname.match(/^\/api\/hr\/employee-documents\/([A-Za-z0-9-]+)$/);
  if (employeeDocumentMatch && method === 'GET') {
    requirePerm('hr.read');
    const document = await repository.getEmployeeDocument(employeeDocumentMatch[1]);
    if (!document) return apiError(404, 'Employee document not found');
    if (!(await recordInCurrentBranch('employees', String(document.employee_id)))) return apiError(403, 'Record is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Employee document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const attachmentMatch = pathname.match(/^\/api\/chat\/attachments\/([A-Za-z0-9-]+)$/);
  if (attachmentMatch && method === 'GET') {
    requirePerm('chat.read');
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

  // ── GET /api/pages/:id ────────────────────────────────────────────────────
  if (pathname === '/api/pages' && method === 'GET') {
    return json([...PAGES.values()].map((page) => publicPageConfig(page)));
  }

  const pageMatch = pathname.match(/^\/api\/pages\/([A-Za-z0-9_-]+)$/);
  if (pageMatch && method === 'GET') {
    const page = PAGES.get(pageMatch[1]);
    if (!page) return apiError(404, `Unknown page: ${pageMatch[1]}`);
    for (const permission of page.page?.auth?.require || []) requirePerm(permission);
    return json(await prefetchedPageConfig(page, url, authUser));
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

  // ── POST /api/actions/:name ───────────────────────────────────────────────
  const namedActionMatch = pathname.match(/^\/api\/actions\/([A-Za-z0-9_.-]+)$/);
  if (namedActionMatch && method === 'POST') {
    const actionName = namedActionMatch[1];
    const orderActionDefinition = ORDER_ACTION_REGISTRY[actionName];
    const financialActionDefinition = FINANCIAL_ACTION_REGISTRY[actionName];
    const businessActionDefinition = BUSINESS_ACTION_REGISTRY[actionName];
    const lineItemActionDefinition = LINE_ITEM_ACTION_REGISTRY[actionName];
    const chatActionDefinition = CHAT_ACTION_REGISTRY[actionName];
    const contactActionDefinition = CONTACT_ACTION_REGISTRY[actionName];
    const approvalActionDefinition = APPROVAL_ACTION_REGISTRY[actionName];
    const tripActionDefinition = TRIP_ACTION_REGISTRY[actionName];
    const templateActionDefinition = TEMPLATE_ACTION_REGISTRY[actionName];
    const codeRuleActionDefinition = CODE_RULE_ACTION_REGISTRY[actionName];
    const roleActionDefinition = ROLE_ACTION_REGISTRY[actionName];
    const userRoleActionDefinition = USER_ROLE_ACTION_REGISTRY[actionName];
    const currencyActionDefinition = CURRENCY_ACTION_REGISTRY[actionName];
    const crmEntityActionDefinition = CRM_ENTITY_ACTION_REGISTRY[actionName];
    const accountingDocumentActionDefinition = ACCOUNTING_DOCUMENT_ACTION_REGISTRY[actionName];
    const actionDefinition = orderActionDefinition
      || financialActionDefinition
      || businessActionDefinition
      || lineItemActionDefinition
      || chatActionDefinition
      || contactActionDefinition;
    const resolvedActionDefinition = actionDefinition || approvalActionDefinition || tripActionDefinition || templateActionDefinition || codeRuleActionDefinition || roleActionDefinition || userRoleActionDefinition || currencyActionDefinition || crmEntityActionDefinition || accountingDocumentActionDefinition;
    if (!resolvedActionDefinition) return apiError(404, `Unknown action: ${actionName}`);
    requirePerm(resolvedActionDefinition.permission);

    const body = await req.json() as any;
    if (currencyActionDefinition) {
      const configured = configuredCurrencyRates();
      return json(await repository.syncCurrencyRates(configured.rates, configured.source, activityActor));
    }
    if (crmEntityActionDefinition) {
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
      const updated = await repository.updateRecord(table, body.id, changes, true);
      if (!updated) return apiError(404, 'CRM entity not found');
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'update',
        resource: table,
        resourceId: body.id,
        detail: `Updated fields: ${changes.map((change) => change.field).join(', ')}`,
      });
      return json(updated);
    }
    if (accountingDocumentActionDefinition) {
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
      const updated = await repository.updateRecord('accounting_entries', body.id, changes, true);
      if (!updated) return apiError(404, 'Financial document not found');
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'update',
        resource: 'accounting_entries',
        resourceId: body.id,
        detail: `Updated fields: ${changes.map((change) => change.field).join(', ')}`,
      });
      return json(updated);
    }
    if (chatActionDefinition) {
      if (chatActionDefinition.operation === 'create_thread') {
        return json(await repository.createChatThread(
          body.values && typeof body.values === 'object' ? body.values : {},
          activityActor,
        ));
      }
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (chatActionDefinition.operation === 'send_message') {
        return json(await repository.sendChatMessage(body.id, body.content, activityActor));
      }
      return json(await repository.markChatThreadRead(body.id, String(authUser.sub)));
    }
    if (contactActionDefinition) {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      const domain = contactActionDefinition.domain === 'crm'
        ? body.kind
        : contactActionDefinition.domain;
      if (domain !== 'customer' && domain !== 'partner') {
        return apiError(400, 'Invalid CRM contact kind');
      }
      if (!(await crmEntityInScope(domain, body.id))) return apiError(403, 'Record is outside the current view scope');
      const isCustomer = domain === 'customer';
      return json(await repository.mutateCrmContact(
        isCustomer
          ? {
              parentTable: 'customers',
              contactTable: 'customer_contacts',
              parentKey: 'customer_id',
              label: 'Customer',
            }
          : {
              parentTable: 'partners',
              contactTable: 'partner_contacts',
              parentKey: 'partner_id',
              label: 'Partner',
            },
        contactActionDefinition.operation,
        body.id,
        typeof body.contact_id === 'string' ? body.contact_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (approvalActionDefinition) {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      return json(await repository.mutateApprovalFlowStep(
        approvalActionDefinition.operation,
        body.id,
        typeof body.step_id === 'string' ? body.step_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (tripActionDefinition) {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      return json(await repository.transitionTrip(body.id, tripActionDefinition.operation, actionName, activityActor));
    }
    if (templateActionDefinition) {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      return json(await repository.mutatePrintTemplateBlock(
        templateActionDefinition.operation,
        body.id,
        typeof body.block_id === 'string' ? body.block_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (codeRuleActionDefinition) {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      const [rule] = await repository.query("SELECT code, prefix, config_value, sequence_width, reset_cadence, next_sequence FROM system_configs WHERE id = ? AND kind = 'code_rule'", [body.id]);
      if (!rule) return apiError(404, 'Code rule not found');
      const prefix = String(rule.prefix || rule.config_value || rule.code || 'CODE');
      const width = Math.max(1, Math.min(12, Number(rule.sequence_width) || 4));
      const sequence = String(Number(rule.next_sequence) || 1).padStart(width, '0');
      const year = new Date().getUTCFullYear();
      return json({ preview: prefix.replace('{YYYY}', String(year)).replace(/\{SEQ(?::\d+)?\}/g, sequence), reset_cadence: rule.reset_cadence || 'never' });
    }
    if (roleActionDefinition) {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (typeof body.permission_key !== 'string' || !body.permission_key) return apiError(400, 'permission_key required');
      return json(await repository.mutateRolePermission(roleActionDefinition.operation, body.id, body.permission_key, actionName, activityActor));
    }
    if (userRoleActionDefinition) {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (typeof body.role_id !== 'string' || !body.role_id) return apiError(400, 'role_id required');
      if (!(await recordInCurrentBranch('users', body.id))) return apiError(403, 'User is outside the current view scope');
      return json(await repository.mutateUserRole(userRoleActionDefinition.operation, body.id, body.role_id, actionName, activityActor));
    }
    if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');

    if (lineItemActionDefinition) {
      const isOrder = lineItemActionDefinition.domain === 'order';
      const isQuote = lineItemActionDefinition.domain === 'quote';
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
        lineItemActionDefinition.operation,
        body.id,
        typeof body.line_id === 'string' ? body.line_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }

    if (orderActionDefinition) {
      if (!(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transition = orderWorkflow.get(orderActionDefinition.action);
      const order = await repository.transitionOrder(
        body.id,
        transition.from,
        transition.to,
        actionName,
        activityActor,
      );
      return json(order);
    }

    if (financialActionDefinition) {
      if (!(await recordInCurrentBranch('accounting_entries', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transition = financialWorkflow.get(financialActionDefinition.action);
      const document = await repository.transitionAccountingEntry(
        body.id,
        financialActionDefinition.kind,
        transition.from,
        transition.to,
        actionName,
        activityActor,
      );
      return json(document);
    }

    if (businessActionDefinition.domain === 'quote') {
      if (!(await recordInCurrentBranch('quotes', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transition = quoteWorkflow.get(businessActionDefinition.action);
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
    const transition = payrollWorkflow.get(businessActionDefinition.action);
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

    const tbl = TABLE_REGISTRY[table as keyof typeof TABLE_REGISTRY];
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
        await authProvider.changePassword(authUser.sub, body.current_password, body.new_password, repository);
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
