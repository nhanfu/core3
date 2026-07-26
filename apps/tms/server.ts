import duckdb from 'duckdb';
import { createFramework, SERVICE_KEYS } from '@core3/framework';
import { validatePageDefinition } from '@core3/framework/yaml/schema.ts';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { DuckDbRepository } from './services/repository.ts';
import { JwtAuthProvider } from './services/auth.ts';
import { ORDER_ACTION_REGISTRY, orderWorkflow } from './services/order-workflow.ts';
import {
  FINANCIAL_ACTION_REGISTRY,
  financialWorkflow,
} from './services/financial-workflow.ts';

const PORT = parseInt(process.env.PORT || '3001');
// TMS is now the package root.
const PROJECT_ROOT = import.meta.dir;
const DB_PATH = process.env.TMS_DB_PATH || join(PROJECT_ROOT, 'tms.duckdb');
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tms-dev-secret-32chars!!!!'
);
const FINANCIAL_WORKFLOW_SCOPES = new Set([
  'debit_note',
  'payment_request',
  'advance',
  'settlement',
]);

// ── DuckDB setup ─────────────────────────────────────────────────────────────
const db = new duckdb.Database(DB_PATH);
const services = createFramework({
  repository: new DuckDbRepository(db),
  auth: new JwtAuthProvider(JWT_SECRET),
});
const repository: any = services.resolve(SERVICE_KEYS.repository);
const authProvider: any = services.resolve(SERVICE_KEYS.auth);

// ── CORS ─────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function apiError(status: number, message: string): Response {
  return json({ error: message }, status);
}

// ── JWT ───────────────────────────────────────────────────────────────────────
async function requireAuth(req: Request) {
  return authProvider.getCurrentUser(req);
}

// ── Static file serving ───────────────────────────────────────────────────────
const SPA_PATHS = new Set([
  '/', '/dashboard', '/fleet', '/drivers', '/trips', '/maintenance', '/reports', '/settings', '/customers', '/partners', '/containers', '/locations', '/areas', '/org/own-company', '/org/departments', '/org/teams', '/hr/employees', '/hr/contracts', '/hr/timesheets', '/hr/shifts', '/hr/payroll', '/login',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.ts':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml':  'text/yaml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2': 'font/woff2',
};

function mimeFor(path: string) {
  const ext = path.slice(path.lastIndexOf('.')) as keyof typeof MIME;
  return MIME[ext] || 'application/octet-stream';
}

async function serveStatic(pathname: string) {
  const rel = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const packagePath = rel.startsWith('node_modules/@core3/framework/');
  if (rel.includes('..')) return null;
  // Page YAML contains server-only datasource SQL and must never be served.
  if (rel.startsWith('pages/') && /\.ya?ml$/i.test(rel)) return null;
  try {
    // The app consumes the framework through a local file dependency. Bun
    // materializes that package on install, so it can otherwise become stale
    // while framework files are edited in this workspace. Serve the source of
    // that dependency during local development instead.
    const file = packagePath
      ? Bun.file(join(PROJECT_ROOT, '../../lib', rel.slice('node_modules/@core3/framework/'.length)))
      : Bun.file(join(PROJECT_ROOT, rel));
    if (await file.exists()) {
      if (rel.endsWith('.ts')) {
        const transpiler = new Bun.Transpiler({ loader: 'ts' });
        return new Response(transpiler.transformSync(await file.text()), {
          headers: { 'Content-Type': 'application/javascript', ...CORS_HEADERS },
        });
      }
      return new Response(file, {
        headers: { 'Content-Type': mimeFor(rel), ...CORS_HEADERS },
      });
    }
  } catch {}
  return null;
}

async function serveSPA() {
  const file = Bun.file(join(PROJECT_ROOT, 'index.html'));
  if (await file.exists()) {
    return new Response(file, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS },
    });
  }
  return new Response('TMS server running. No index.html found.', {
    status: 200,
    headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
  });
}

// ── DB initialisation ─────────────────────────────────────────────────────────
async function initDb(): Promise<void> {
  const schemaSQL = readFileSync(join(import.meta.dir, 'db/schema.sql'), 'utf8');
  const seedSQL   = readFileSync(join(import.meta.dir, 'db/seed.sql'),   'utf8');

  // Run schema (idempotent — IF NOT EXISTS)
  await repository.runStatements(schemaSQL);
  // This additive migration keeps existing local development databases aligned
  // with the seed schema without resetting user-entered truck records.
  await repository.runStatements(`
    ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_kg INTEGER DEFAULT 0;
    ALTER TABLE system_activity ADD COLUMN IF NOT EXISTS actor_id VARCHAR;
    ALTER TABLE system_activity ADD COLUMN IF NOT EXISTS resource_id VARCHAR;
    CREATE INDEX IF NOT EXISTS idx_system_activity_resource ON system_activity(resource, resource_id);
    UPDATE trucks SET capacity_kg = CASE type
      WHEN 'Semi' THEN 20000 WHEN 'Flatbed' THEN 18000
      WHEN 'Box Truck' THEN 5000 ELSE 0 END
    WHERE capacity_kg IS NULL OR capacity_kg = 0;

    INSERT INTO permissions(id, role_id, permission_key)
    SELECT 'perm-adm-13', id, 'crm.read'
    FROM roles
    WHERE name = 'admin'
      AND NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'perm-adm-13');
    INSERT INTO permissions(id, role_id, permission_key)
    SELECT 'perm-adm-14', id, 'crm.write'
    FROM roles
    WHERE name = 'admin'
      AND NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'perm-adm-14');
  `);

  // Seed only if roles table is empty
  if (await repository.countRows('roles') === 0) {
    await repository.runStatements(seedSQL);
    console.log('✓ Database seeded');
  }

  // Keep pre-existing local databases authorized for the additive Orders page.
  // New databases receive these permissions through seed.sql above.
  await repository.runStatements(`
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-15', 'role-admin', 'orders.read'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'orders.read');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-16', 'role-admin', 'orders.write'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'orders.write');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-dp-05', 'role-dispatcher', 'orders.read'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-dispatcher' AND permission_key = 'orders.read');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-dp-06', 'role-dispatcher', 'orders.write'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-dispatcher' AND permission_key = 'orders.write');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-17', 'role-admin', 'catalog.read'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'catalog.read');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-18', 'role-admin', 'catalog.write'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'catalog.write');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-19', 'role-admin', 'accounting.read'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'accounting.read');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-20', 'role-admin', 'accounting.write'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'accounting.write');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-21', 'role-admin', 'hr.read'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'hr.read');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-22', 'role-admin', 'hr.write'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'hr.write');
    INSERT INTO permissions (id, role_id, permission_key) SELECT 'perm-adm-23', 'role-admin', 'system.read' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'system.read');
    INSERT INTO permissions (id, role_id, permission_key) SELECT 'perm-adm-24', 'role-admin', 'system.write' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'system.write');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-25', 'role-admin', 'dispatch.read'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'dispatch.read');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-26', 'role-admin', 'dispatch.write'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'dispatch.write');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-27', 'role-admin', 'orders.approve'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'orders.approve');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-28', 'role-admin', 'accounting.approve'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'accounting.approve');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-adm-29', 'role-admin', 'accounting.pay'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-admin' AND permission_key = 'accounting.pay');
    INSERT INTO roles (id, name, description)
    SELECT 'role-accountant', 'accountant', 'Accounting document preparation'
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 'role-accountant');
    INSERT INTO users (id, email, name, password_hash, preferred_lang)
    SELECT 'user-accountant', 'accountant@tms.local', 'Accountant One', 'accountant123', 'vi'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 'user-accountant');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-ac-01', 'role-accountant', 'accounting.read'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-accountant' AND permission_key = 'accounting.read');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-ac-02', 'role-accountant', 'accounting.write'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-accountant' AND permission_key = 'accounting.write');
    INSERT INTO user_roles (user_id, role_id)
    SELECT 'user-accountant', 'role-accountant'
    WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = 'user-accountant' AND role_id = 'role-accountant');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-dp-07', 'role-dispatcher', 'dispatch.read'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-dispatcher' AND permission_key = 'dispatch.read');
    INSERT INTO permissions (id, role_id, permission_key)
    SELECT 'perm-dp-08', 'role-dispatcher', 'dispatch.write'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = 'role-dispatcher' AND permission_key = 'dispatch.write');
  `);
}

// ── YAML datasource registry ─────────────────────────────────────────────────
// Queries are loaded from the page YAML files, never accepted from API requests.
const SOURCE_FILES = [
  'pages/dashboard.yaml',
  'pages/schedule.yaml',
  'pages/orders.yaml',
  'pages/vehicles.yaml',
  'pages/customers.yaml',
  'pages/quotes.yaml', 'pages/crm-dashboard.yaml', 'pages/crm-kpi.yaml',
  'pages/branches.yaml',
  'pages/partners.yaml',
  'pages/areas.yaml',
  'pages/own-company.yaml',
  'pages/departments.yaml',
  'pages/teams.yaml',
  'pages/containers.yaml',
  'pages/locations.yaml',
  'pages/users.yaml',
  'pages/roles.yaml',
  'pages/employees.yaml',
  'pages/contracts.yaml',
  'pages/timesheets.yaml',
  'pages/shifts.yaml',
  'pages/payroll.yaml',
  'pages/catalog-container-types.yaml',
  'pages/catalog-vehicle-types.yaml',
  'pages/catalog-units.yaml',
  'pages/catalog-cargo-types.yaml',
  'pages/catalog-fee-types.yaml',
  'pages/catalog-currencies.yaml',
  'pages/accounting-debit-notes.yaml',
  'pages/accounting-debit-note-summary.yaml',
  'pages/accounting-payment-requests.yaml',
  'pages/accounting-payment-request-summary.yaml',
  'pages/accounting-advances.yaml',
  'pages/accounting-settlements.yaml',
  'pages/accounting-invoice-templates.yaml',
  'pages/accounting-ledger-accounts.yaml',
  'pages/system-activity.yaml', 'pages/system-code-rules.yaml',
  'pages/system-print-templates.yaml', 'pages/system-approval-flows.yaml', 'pages/system-shipment-types.yaml',
  'pages/system-trip-statuses.yaml', 'pages/system-fee-rules.yaml', 'pages/system-storage.yaml',
  'pages/fleet.yaml',
  'pages/drivers.yaml',
  'pages/trips.yaml',
  'pages/maintenance.yaml',
  'pages/reports.yaml',
  'pages/settings.yaml',
];

function loadSources() {
  const sources = new Map();
  for (const file of SOURCE_FILES) {
    const page: any = Bun.YAML.parse(readFileSync(join(import.meta.dir, file), 'utf8'));
    validatePageDefinition(page);
    for (const source of page.datasources || []) {
      if (sources.has(source.id)) throw new Error(`Duplicate datasource id: ${source.id}`);
      sources.set(source.id, source);
    }
  }
  return sources;
}

const SOURCES = loadSources();
const PAGES = new Map<string, any>(
  SOURCE_FILES.map((file) => {
    const page = Bun.YAML.parse(readFileSync(join(import.meta.dir, file), 'utf8'));
    return [page.page?.id, page];
  })
);

function publicPageConfig(page: any) {
  const { datasources, ...config } = page;
  return config;
}

// ── TABLE_REGISTRY ────────────────────────────────────────────────────────────
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
      'total_amount',
      'notes',
    ],
  },
  trucks:       { permission: 'fleet.write',       timestamps: true  },
  drivers:      { permission: 'drivers.write',     timestamps: true  },
  trips:        { permission: 'trips.write',        timestamps: true  },
  maintenance:  { permission: 'maintenance.write',  timestamps: true  },
  customers:    {
    permission: 'crm.write',
    timestamps: true,
    fields: ['code', 'name', 'tax_code', 'phone', 'email', 'stage', 'owner_name', 'visibility', 'status'],
  },
  quotes: { permission: 'crm.write', timestamps: true, fields: ['code', 'customer_name', 'title', 'amount', 'status', 'valid_until'] },
  partners:     {
    permission: 'crm.write',
    timestamps: true,
    fields: ['code', 'name', 'tax_code', 'phone', 'email', 'partner_type', 'owner_name', 'visibility', 'status'],
  },
  containers: {
    permission: 'dispatch.write',
    timestamps: true,
    fields: ['container_number', 'container_type', 'owner_name', 'location_id', 'status', 'notes'],
  },
  locations: {
    permission: 'dispatch.write',
    timestamps: true,
    fields: ['code', 'name', 'location_type', 'address', 'city', 'area_id', 'status'],
  },
  areas: {
    permission: 'dispatch.write',
    timestamps: true,
    fields: ['code', 'name', 'region', 'description', 'status'],
  },
  company_profiles: {
    permission: 'settings.write',
    timestamps: true,
    fields: ['name', 'short_name', 'tax_code', 'address', 'invoice_address', 'phone', 'email', 'website', 'bank_name', 'bank_account', 'notes'],
  },
  departments: {
    permission: 'settings.write',
    timestamps: true,
    fields: ['code', 'name', 'branch_id', 'status'],
  },
  teams: {
    permission: 'settings.write',
    timestamps: true,
    fields: ['code', 'name', 'department_id', 'status'],
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
    fields: ['code', 'name', 'counterparty', 'amount', 'currency', 'status', 'document_date', 'due_date', 'description', 'sort_order'],
    scopes: ['debit_note', 'payment_request', 'advance', 'settlement', 'invoice_template', 'ledger_account'],
  },
  system_configs: { permission: 'system.write', timestamps: true, fields: ['code', 'name', 'config_value', 'description', 'status', 'sort_order'], scopes: ['code_rule', 'print_template', 'approval_flow', 'shipment_type', 'trip_status', 'fee_rule', 'storage'] },
  branches:     { permission: 'settings.write',     timestamps: true  },
  users:        { permission: 'settings.write',     timestamps: true  },
  translations: { permission: 'settings.write',     timestamps: false },
};

// ── API handler ───────────────────────────────────────────────────────────────
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

  // ── GET /api/pages/:id ────────────────────────────────────────────────────
  const pageMatch = pathname.match(/^\/api\/pages\/([A-Za-z0-9_-]+)$/);
  if (pageMatch && method === 'GET') {
    const page = PAGES.get(pageMatch[1]);
    if (!page) return apiError(404, `Unknown page: ${pageMatch[1]}`);
    for (const permission of page.page?.auth?.require || []) requirePerm(permission);
    return json(publicPageConfig(page));
  }

  // ── POST /api/query ───────────────────────────────────────────────────────
  if (pathname === '/api/query' && method === 'POST') {
    const vm = await req.json() as any;
    const src = SOURCES.get(vm.sourceId);
    if (!src) return apiError(404, `Unknown source: ${vm.sourceId}`);
    if (src.permission) requirePerm(src.permission);
    const result = await repository.querySource(src, vm.params || {}, vm.skip || 0, vm.top || 25);
    return json(result);
  }

  // ── POST /api/actions/:name ───────────────────────────────────────────────
  const namedActionMatch = pathname.match(/^\/api\/actions\/([A-Za-z0-9_.-]+)$/);
  if (namedActionMatch && method === 'POST') {
    const actionName = namedActionMatch[1];
    const orderActionDefinition = ORDER_ACTION_REGISTRY[actionName];
    const financialActionDefinition = FINANCIAL_ACTION_REGISTRY[actionName];
    const actionDefinition = orderActionDefinition || financialActionDefinition;
    if (!actionDefinition) return apiError(404, `Unknown action: ${actionName}`);
    requirePerm(actionDefinition.permission);

    const body = await req.json() as any;
    if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');

    if (orderActionDefinition) {
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

  // ── POST /api/patch ───────────────────────────────────────────────────────
  if (pathname === '/api/patch' && method === 'POST') {
    const body = await req.json() as any;
    const { table, action, id, changes = [], scope } = body;

    const tbl = TABLE_REGISTRY[table as keyof typeof TABLE_REGISTRY];
    if (!tbl) return apiError(404, `Unknown table: ${table}`);
    requirePerm(tbl.permission);
    if ('fields' in tbl && changes.some((change: any) => !tbl.fields.includes(change.field))) {
      return apiError(400, 'Invalid field for this resource');
    }
    if ('scopes' in tbl && !tbl.scopes.includes(scope)) {
      return apiError(400, 'Invalid resource scope');
    }
    if (
      table === 'accounting_entries'
      && FINANCIAL_WORKFLOW_SCOPES.has(scope)
      && changes.some((change: any) => change.field === 'status')
    ) {
      return apiError(400, 'Financial document status requires a named action');
    }

    if ('scopes' in tbl && action !== 'insert') {
      const existing = await repository.query(`SELECT kind FROM ${table} WHERE id = ?`, [id]);
      if (!existing[0] || existing[0].kind !== scope) return apiError(404, 'Resource not found');
    }
    if (table === 'orders' && (action === 'update' || action === 'delete')) {
      const [order] = await repository.query('SELECT status FROM orders WHERE id = ?', [id]);
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

  // ── i18n ─────────────────────────────────────────────────────────────────
  if (pathname === '/api/v1/i18n/list' && method === 'GET') {
    requirePerm('settings.read');
    const lang = url.searchParams.get('lang') || 'en';
    const page = url.searchParams.get('page') || '';
    const q    = url.searchParams.get('q') || '';
    return json(await repository.listTranslations({ lang, page, q }));
  }

  if (pathname === '/api/v1/i18n' && method === 'GET') {
    const lang = url.searchParams.get('lang') || 'en';
    const page = url.searchParams.get('page') || '*';
    return json(await repository.getTranslationMap(lang, page));
  }

  if (pathname === '/api/v1/i18n' && method === 'POST') {
    requirePerm('settings.write');
    const body = await req.json() as any;
    await repository.saveTranslation(body);
    return json({ ok: true });
  }

  const i18nMatch = pathname.match(/^\/api\/v1\/i18n\/(\d+)$/);
  if (i18nMatch) {
    const id = parseInt(i18nMatch[1]);
    if (method === 'PATCH') {
      requirePerm('settings.write');
      const { translated } = await req.json() as any;
      await repository.updateTranslation(id, translated);
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      requirePerm('settings.write');
      await repository.deleteTranslation(id);
      return json({ ok: true });
    }
  }

  return apiError(404, 'API route not found');
}

// ── Main server ───────────────────────────────────────────────────────────────
await initDb();

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // API
    if (pathname.startsWith('/api/')) {
      try {
        return await handleAPI(req, url);
      } catch (err) {
        const error = err as any;
        if (error?.status) return apiError(error.status, error.message);
        console.error('[API error]', err);
        return apiError(500, 'Internal server error');
      }
    }

    // Static assets
    if (req.method === 'GET') {
      const staticResp = await serveStatic(pathname);
      if (staticResp) return staticResp;
      if (SPA_PATHS.has(pathname)) return serveSPA();
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`TMS server running at http://localhost:${PORT}`);
