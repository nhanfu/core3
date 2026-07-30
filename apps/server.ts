import { basename, extname, isAbsolute, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { closeDatabase, initDatabase } from './crm/db/database.ts';
import { executeDatasource } from './crm/db/datasource-runtime.ts';

type Role = 'salesperson' | 'manager' | 'system';
type Params = Record<string, string>;
type Context = { request: Request; url: URL; role: Role };
type Handler = (context: Context, params: Params) => Promise<Response>;

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const PORT = Number(process.env.PORT || 3010);
const databasePath = process.env.CRM_DB_PATH || join(import.meta.dir, 'crm', 'crm.duckdb');
const uploadDirectory = join(import.meta.dir, 'crm', 'uploads');
const MAX_REQUEST_BYTES = 10 * 1024 * 1024;
const configuredRole: Role = process.env.CRM_ROLE === 'manager' || process.env.CRM_ROLE === 'system' ? process.env.CRM_ROLE : 'salesperson';
const allowRoleHeader = process.env.CRM_ALLOW_ROLE_HEADER === 'true' && ['development', 'test'].includes(process.env.NODE_ENV || '');
const corsOrigin = process.env.CRM_CORS_ORIGIN || `http://localhost:${PORT}`;
const headers = {
  'Access-Control-Allow-Origin': corsOrigin,
  'Access-Control-Allow-Headers': allowRoleHeader ? 'Content-Type, X-CRM-Role' : 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
};
const moduleDefinition = Bun.YAML.parse(readFileSync(join(import.meta.dir, 'crm', 'module.yaml'), 'utf8')) as {
  apps?: unknown[];
};
const appManifests = moduleDefinition.apps || [];
const publicFiles = new Map([
  ['app.ts', join(import.meta.dir, 'crm', 'app.ts')],
  ['index.html', join(import.meta.dir, 'index.html')],
  ['styles.css', join(import.meta.dir, 'styles.css')],
]);
const contentTypes: Record<string, string> = {
  '.css': 'text/css', '.html': 'text/html', '.ico': 'image/x-icon', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.ts': 'application/javascript', '.woff2': 'font/woff2',
};

const operations = new Map<string, Handler>();

function operation(method: string, entity: string, action: string, handler: Handler) {
  const key = `${method} ${entity} ${action}`;
  if (operations.has(key)) throw new Error(`Duplicate operation: ${key}`);
  operations.set(key, handler);
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function roleOf(request: Request): Role {
  if (allowRoleHeader) {
    const role = request.headers.get('x-crm-role');
    if (role === 'manager' || role === 'system') return role;
  }
  return configuredRole;
}

function isManager(role: Role) {
  return role === 'manager' || role === 'system';
}

function requireManager(context: Context) {
  if (!isManager(context.role)) throw new HttpError(403, 'Manager permission required');
}

function requireLeadAccess(_context: Context, _id: string) {}

function crm(operation: string, payload: Record<string, unknown> = {}) {
  return executeDatasource(`crm.${operation}`, payload);
}

async function readJson<T>(request: Request): Promise<T> {
  if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
  try {
    return await request.json() as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'JSON body must be an object');
  return value as Record<string, unknown>;
}

function stringArray(value: unknown, field = 'ids'): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new HttpError(400, `${field} must be an array of strings`);
  return value;
}

function rowsBody(value: unknown): unknown[] {
  const body = objectBody(value);
  if (body.rows === undefined) return [];
  if (!Array.isArray(body.rows)) throw new HttpError(400, 'rows must be an array');
  return body.rows;
}

function pathParam(params: Params, name: string) {
  try {
    return decodeURIComponent(params[name]);
  } catch {
    throw new HttpError(400, `Invalid ${name}`);
  }
}

async function staticFile(pathname: string) {
  let relative: string;
  try {
    relative = decodeURIComponent(pathname === '/' ? 'index.html' : pathname.slice(1));
  } catch {
    return null;
  }
  if (!relative || relative.includes('\0') || relative.includes('\\') || relative.split('/').includes('..')) return null;
  const libraryPath = relative.startsWith('lib/');
  if (!libraryPath && !publicFiles.has(relative)) return null;
  const root = resolve(libraryPath ? join(import.meta.dir, 'lib') : import.meta.dir);
  const filePath = resolve(libraryPath ? join(import.meta.dir, 'lib', relative.slice('lib/'.length)) : publicFiles.get(relative)!);
  if (!filePath.startsWith(`${root}${process.platform === 'win32' ? '\\' : '/'}`) || !contentTypes[extname(filePath).toLowerCase()]) return null;
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  if (filePath.endsWith('.ts')) {
    const source = await file.text();
    return new Response(new Bun.Transpiler({ loader: 'ts' }).transformSync(source), { headers: { ...headers, 'Content-Type': contentTypes['.ts'] } });
  }
  return new Response(file, { headers: { ...headers, 'Content-Type': contentTypes[extname(filePath).toLowerCase()] } });
}

function errorResponse(error: unknown) {
  const status = error instanceof HttpError ? error.status : error instanceof SyntaxError ? 400 : 500;
  if (status >= 500) console.error(error);
  return json({ error: status >= 500 ? 'Internal server error' : error instanceof Error ? error.message : 'Invalid request' }, status);
}

function registerOperations() {
  operation('GET', 'pipeline', 'list', async ({ url, role }) => json(await crm('pipeline', { search: url.searchParams.get('search') || '', filter: url.searchParams.get('filter') || '', sort: url.searchParams.get('sort') || '', role })));
  operation('GET', 'module', 'get', async () => json(moduleDefinition));
  operation('GET', 'modules', 'list', async () => json(appManifests));
  operation('GET', 'leads', 'list', async ({ url, role }) => json(await executeDatasource('crm.list_leads', { search: url.searchParams.get('search') || '', type: url.searchParams.get('type') || '', filter: url.searchParams.get('filter') || '', sort: url.searchParams.get('sort') || '', group_by: url.searchParams.get('group_by') || '', team_id: url.searchParams.get('team_id') || '', role })));
  operation('GET', 'partners', 'list', async ({ url }) => json(await executeDatasource('crm.partners', { search: `%${(url.searchParams.get('search') || '').trim()}%` })));
  operation('GET', 'lookups', 'list', async ({ url }) => json(await crm('crmLookups', { search: url.searchParams.get('search') || '' })));
  operation('GET', 'customers', 'list', async ({ url }) => json(await executeDatasource('crm.customers', { search: `%${(url.searchParams.get('search') || '').trim()}%` })));
  operation('GET', 'customers', 'get', async ({ url }) => json((await executeDatasource('crm.customer', { id: url.searchParams.get('id') || '' }))[0] || null));
  operation('GET', 'customers', 'related', async ({ url }) => json(await crm('customerRelated', { id: url.searchParams.get('id') || '' })));
  operation('POST', 'customers', 'create', async ({ request }) => json(await crm('saveCustomer', { values: objectBody(await readJson(request)) })));
  operation('GET', 'teams', 'list', async () => json(await executeDatasource('crm.teams')));
  operation('GET', 'teams', 'get', async ({ url }) => json(await crm('getTeam', { id: url.searchParams.get('id') || '' })));
  operation('POST', 'teams', 'create', async context => { requireManager(context); return json(await crm('saveTeam', { values: objectBody(await readJson(context.request)) })); });
  operation('GET', 'report', 'summary', async ({ role }) => json(await crm('reportSummary', { role })));
  operation('GET', 'report', 'analysis', async ({ url, role }) => json(await crm('reportAnalysis', { dimension: url.searchParams.get('dimension') || 'stage', role, from_date: url.searchParams.get('from') || '', to_date: url.searchParams.get('to') || '', search: url.searchParams.get('search') || '' })));
  operation('GET', 'report', 'drilldown', async ({ url, role }) => json(await crm('reportDrilldown', { dimension: url.searchParams.get('dimension') || 'stage', value: url.searchParams.get('value') || '', secondary_dimension: url.searchParams.get('secondary_dimension') || '', secondary_value: url.searchParams.get('secondary_value') || '', role })));
  operation('GET', 'report', 'lead-analysis', async ({ url, role }) => json(await crm('leadAnalysis', { dimension: url.searchParams.get('dimension') || 'source', role, search: url.searchParams.get('search') || '' })));
  operation('GET', 'report', 'lead-drilldown', async ({ url, role }) => json(await crm('leadDrilldown', { dimension: url.searchParams.get('dimension') || 'source', value: url.searchParams.get('value') || '', role })));
  operation('GET', 'report', 'activity-analysis', async ({ url, role }) => json(await crm('activityAnalysis', { dimension: url.searchParams.get('dimension') || 'activity_type', role, search: url.searchParams.get('search') || '' })));
  operation('GET', 'report', 'activity-drilldown', async ({ url, role }) => json(await crm('activityDrilldown', { dimension: url.searchParams.get('dimension') || 'activity_type', value: url.searchParams.get('value') || '', role })));
  operation('GET', 'activities', 'list', async ({ url, role }) => json(await executeDatasource('crm.activities', { search: url.searchParams.get('search')?.trim() ? `%${url.searchParams.get('search')!.trim()}%` : '', status: url.searchParams.get('status') || '', role })));
  operation('POST', 'activities', 'mutate', async ({ request }) => { const body = objectBody(await readJson(request)); return json(await crm('mutateActivities', { ids: stringArray(body.ids), operation: String(body.operation || ''), value: String(body.value || '') })); });
  operation('GET', 'config', 'get', async context => { requireManager(context); return json(await executeDatasource('crm.config')); });
  operation('POST', 'config', 'save', async context => { requireManager(context); return json(await crm('saveConfig', { values: objectBody(await readJson(context.request)) })); });
  operation('GET', 'stages', 'list', async context => { requireManager(context); return json(await executeDatasource('crm.stages')); });
  operation('POST', 'stages', 'save', async context => { requireManager(context); return json(await crm('saveStages', { rows: rowsBody(await readJson(context.request)) })); });
  operation('GET', 'tags', 'list', async context => { requireManager(context); return json(await executeDatasource('crm.tags')); });
  operation('POST', 'tags', 'save', async context => { requireManager(context); const body = objectBody(await readJson(context.request)); return json(await crm('saveTag', { id: String(body.id || ''), name: String(body.name || ''), color: String(body.color || '') })); });
  operation('POST', 'lost-reasons', 'save', async context => { requireManager(context); const body = objectBody(await readJson(context.request)); return json(await crm('saveLostReason', { id: String(body.id || ''), name: String(body.name || '') })); });
  operation('GET', 'lost-reasons', 'list', async () => json(await executeDatasource('crm.lost_reasons')));
  operation('POST', 'import', 'preview', async context => { requireManager(context); return json(await crm('previewImportWithHistory', { rows: rowsBody(await readJson(context.request)) })); });
  operation('GET', 'import', 'history', async context => { requireManager(context); return json(await executeDatasource('crm.import_history')); });
  operation('POST', 'import', 'commit', async context => { requireManager(context); return json(await crm('commitImport', { rows: rowsBody(await readJson(context.request)) })); });
  operation('POST', 'leads', 'create', async ({ request, role }) => { const body = objectBody(await readJson(request)); if (role === 'salesperson' && (body.salesperson_id || body.salesperson)) throw new HttpError(403, 'Manager permission required to assign records'); return json(await executeDatasource('crm.save_lead', { values: body })); });
  operation('GET', 'leads', 'get', async context => { const id = context.url.searchParams.get('id') || ''; await requireLeadAccess(context, id); return json(await crm('getLead', { id })); });
  operation('GET', 'leads', 'extras', async context => { const id = context.url.searchParams.get('id') || ''; await requireLeadAccess(context, id); return json(await crm('leadExtras', { id })); });
  operation('POST', 'leads', 'convert', async context => { const id = context.url.searchParams.get('id') || ''; await requireLeadAccess(context, id); const body = objectBody(await readJson(context.request)); return json(await executeDatasource('crm.convert_lead', { id, customer_name: String(body.customer_name || '') })); });
  operation('POST', 'leads', 'lost', async context => { const id = context.url.searchParams.get('id') || ''; await requireLeadAccess(context, id); const body = objectBody(await readJson(context.request)); return json(await executeDatasource('crm.lose_lead', { id, reason_id: String(body.reason_id || '') })); });
  operation('GET', 'leads', 'duplicates', async context => { const id = context.url.searchParams.get('id') || ''; await requireLeadAccess(context, id); return json(await crm('findDuplicates', { id })); });
  operation('POST', 'leads', 'move-stage', async context => { const body = objectBody(await readJson(context.request)); const id = String(body.id || context.url.searchParams.get('id') || ''); if (!id || !body.stage_id) throw new HttpError(400, 'id and stage_id are required'); await requireLeadAccess(context, id); await executeDatasource('crm.move_stage', { id, stage_id: String(body.stage_id) }); return json({ ok: true }); });
  operation('POST', 'leads', 'mutate', async context => { const body = objectBody(await readJson(context.request)); const ids = stringArray(body.ids); const action = String(body.operation || ''); if (!isManager(context.role) && ['archive', 'restore', 'delete', 'assign', 'merge'].includes(action)) throw new HttpError(403, 'Manager permission required'); return json(action === 'merge' ? await executeDatasource('crm.merge_leads', { ids }) : await crm('mutateLeads', { ids, operation: action, value: String(body.value || '') })); });
  operation('POST', 'leads', 'merge', async context => { requireManager(context); const body = objectBody(await readJson(context.request)); return json(await executeDatasource('crm.merge_leads', { ids: stringArray(body.ids) })); });
  operation('POST', 'leads', 'merge-preview', async context => { requireManager(context); const body = objectBody(await readJson(context.request)); return json(await crm('mergePreview', { ids: stringArray(body.ids) })); });
  operation('GET', 'catalog', 'list', async context => { requireManager(context); const kind = context.url.searchParams.get('kind') || ''; return json(await executeDatasource(`crm.catalog.${kind}`)); });
  operation('POST', 'catalog', 'save', async context => { requireManager(context); return json(await crm('saveCatalog', { kind: context.url.searchParams.get('kind') || '', values: objectBody(await readJson(context.request)) })); });
  operation('GET', 'attachments', 'get', async context => { const attachment = (await executeDatasource('crm.attachment', { id: context.url.searchParams.get('id') || '' }))[0] || null; if (!attachment?.stored_path) throw new HttpError(404, 'Attachment file not found'); await requireLeadAccess(context, attachment.lead_id); const storedPath = String(attachment.stored_path); if (storedPath !== basename(storedPath) || isAbsolute(storedPath)) throw new HttpError(500, 'Invalid attachment path'); const file = Bun.file(join(uploadDirectory, storedPath)); if (!(await file.exists())) throw new HttpError(404, 'Attachment file not found'); const downloadName = String(attachment.name || 'download').replace(/[\r\n"]/g, '_'); return new Response(file, { headers: { ...headers, 'Content-Type': attachment.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${downloadName}"` } }); });
}

async function dispatch(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === '/api/crm') {
    const entity = url.searchParams.get('entity')?.trim();
    const action = url.searchParams.get('action')?.trim();
    if (!entity || !action || !/^[a-z][a-z0-9-]*$/.test(entity) || !/^[a-z][a-z0-9-]*$/.test(action)) return json({ error: 'entity and action parameters are required' }, 400);
    const handler = operations.get(`${request.method} ${entity} ${action}`);
    if (!handler) return json({ error: `Unsupported CRM operation: ${request.method} ${entity}/${action}` }, 404);
    return handler({ request, url, role: roleOf(request) }, {});
  }

  if (url.pathname.startsWith('/api/')) return json({ error: 'Use /api/crm with entity and action parameters' }, 404);
  if (request.method === 'GET') return await staticFile(url.pathname) || new Response('Not found', { status: 404 });
  return json({ error: 'Not found' }, 404);
}
registerOperations();
if (!existsSync(databasePath)) await initDatabase();
const server = Bun.serve({ port: PORT, maxRequestBodySize: MAX_REQUEST_BYTES, async fetch(request) {
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    return await dispatch(request);
  } catch (error) {
    return errorResponse(error);
  }
} });

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.stop(true);
  await closeDatabase();
}

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
console.log(`CRM app running at http://localhost:${PORT}`);
