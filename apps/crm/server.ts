import { basename, extname, isAbsolute, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { closeDatabase, initDatabase } from './db/database.ts';
import { executeDatasource, routeDatasourceRequest } from './db/datasource-runtime.ts';

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
const databasePath = process.env.CRM_DB_PATH || join(import.meta.dir, 'crm.duckdb');
const uploadDirectory = join(import.meta.dir, 'uploads');
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
const moduleDefinition = Bun.YAML.parse(readFileSync(join(import.meta.dir, 'module.yaml'), 'utf8'));
const appManifests = moduleDefinition.apps || [];
const publicFiles = new Set(['app.ts', 'index.html', 'styles.css']);
const contentTypes: Record<string, string> = {
  '.css': 'text/css', '.html': 'text/html', '.ico': 'image/x-icon', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.ts': 'application/javascript', '.woff2': 'font/woff2',
};

const exactRoutes = new Map<string, Handler>();
const parameterRoutes = new Map<string, Array<{ pattern: RegExp; handler: Handler }>>();

function route(method: string, path: string, handler: Handler, _metadata?: unknown) {
  const key = `${method} ${path}`;
  if (exactRoutes.has(key)) throw new Error(`Duplicate route: ${key}`);
  exactRoutes.set(key, handler);
}

function parameterRoute(method: string, pattern: RegExp, handler: Handler) {
  const routes = parameterRoutes.get(method) || [];
  routes.push({ pattern, handler });
  parameterRoutes.set(method, routes);
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

async function requireLeadAccess(context: Context, id: string) {
  if (context.role === 'salesperson' && !(await executeDatasource('crm.lead_access', { id }))[0]) throw new HttpError(403, 'Record access denied');
}

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
  const packagePath = relative.startsWith('node_modules/@core3/framework/');
  if (!packagePath && !publicFiles.has(relative)) return null;
  const root = resolve(packagePath ? join(import.meta.dir, '../../lib') : import.meta.dir);
  const filePath = resolve(packagePath
    ? join(import.meta.dir, '../../lib', relative.slice('node_modules/@core3/framework/'.length))
    : join(import.meta.dir, relative));
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

function registerRoutes() {
  route('GET', '/api/crm/pipeline', async ({ url, role }) => json(await crm('pipeline', { search: url.searchParams.get('search') || '', filter: url.searchParams.get('filter') || '', sort: url.searchParams.get('sort') || '', role })), {});
  route('GET', '/api/crm/module', async () => json(moduleDefinition), {});
  route('GET', '/api/modules', async () => json(appManifests), {});
  route('GET', '/api/crm/leads', async ({ url, role }) => json(await executeDatasource('crm.list_leads', { search: url.searchParams.get('search') || '', type: url.searchParams.get('type') || '', filter: url.searchParams.get('filter') || '', sort: url.searchParams.get('sort') || '', group_by: url.searchParams.get('group_by') || '', team_id: url.searchParams.get('team_id') || '', role })), {});
  route('GET', '/api/crm/partners', async ({ url }) => json(await executeDatasource('crm.partners', { search: `%${(url.searchParams.get('search') || '').trim()}%` })), {});
  route('GET', '/api/crm/lookups', async ({ url }) => json(await crm('crmLookups', { search: url.searchParams.get('search') || '' })), {});
  route('GET', '/api/crm/customers', async ({ url }) => json(await executeDatasource('crm.customers', { search: `%${(url.searchParams.get('search') || '').trim()}%` })), {});
  route('GET', '/api/crm/teams', async () => json(await executeDatasource('crm.teams')), {});
  route('POST', '/api/crm/customers', async ({ request }) => json(await crm('saveCustomer', { values: objectBody(await readJson(request)) })), {});
  route('GET', '/api/crm/report/summary', async ({ role }) => json(await crm('reportSummary', { role })), {});
  route('GET', '/api/crm/report/analysis', async ({ url, role }) => json(await crm('reportAnalysis', { dimension: url.searchParams.get('dimension') || 'stage', role, from_date: url.searchParams.get('from') || '', to_date: url.searchParams.get('to') || '', search: url.searchParams.get('search') || '' })), {});
  route('GET', '/api/crm/report/drilldown', async ({ url, role }) => json(await crm('reportDrilldown', { dimension: url.searchParams.get('dimension') || 'stage', value: url.searchParams.get('value') || '', secondary_dimension: url.searchParams.get('secondary_dimension') || '', secondary_value: url.searchParams.get('secondary_value') || '', role })), {});
  route('GET', '/api/crm/report/lead-analysis', async ({ url, role }) => json(await crm('leadAnalysis', { dimension: url.searchParams.get('dimension') || 'source', role, search: url.searchParams.get('search') || '' })), {});
  route('GET', '/api/crm/report/lead-drilldown', async ({ url, role }) => json(await crm('leadDrilldown', { dimension: url.searchParams.get('dimension') || 'source', value: url.searchParams.get('value') || '', role })), {});
  route('GET', '/api/crm/lost-reasons', async () => json(await executeDatasource('crm.lost_reasons')), {});
  route('GET', '/api/crm/activities', async ({ url, role }) => json(await executeDatasource('crm.activities', { search: url.searchParams.get('search')?.trim() ? `%${url.searchParams.get('search')!.trim()}%` : '', status: url.searchParams.get('status') || '', role })), {});
  route('GET', '/api/crm/report/activity-analysis', async ({ url, role }) => json(await crm('activityAnalysis', { dimension: url.searchParams.get('dimension') || 'activity_type', role, search: url.searchParams.get('search') || '' })), {});
  route('GET', '/api/crm/report/activity-drilldown', async ({ url, role }) => json(await crm('activityDrilldown', { dimension: url.searchParams.get('dimension') || 'activity_type', value: url.searchParams.get('value') || '', role })), {});
  route('POST', '/api/crm/teams', async context => { requireManager(context); return json(await crm('saveTeam', { values: objectBody(await readJson(context.request)) })); }, {});
  route('GET', '/api/crm/config', async context => { requireManager(context); return json(await executeDatasource('crm.config')); }, {});
  route('POST', '/api/crm/config', async context => { requireManager(context); return json(await crm('saveConfig', { values: objectBody(await readJson(context.request)) })); }, {});
  route('GET', '/api/crm/stages', async context => { requireManager(context); return json(await executeDatasource('crm.stages')); }, {});
  route('POST', '/api/crm/stages', async context => { requireManager(context); return json(await crm('saveStages', { rows: rowsBody(await readJson(context.request)) })); }, {});
  route('GET', '/api/crm/tags', async context => { requireManager(context); return json(await executeDatasource('crm.tags')); }, {});
  route('POST', '/api/crm/tags', async context => { requireManager(context); const body = objectBody(await readJson(context.request)); return json(await crm('saveTag', { id: String(body.id || ''), name: String(body.name || ''), color: String(body.color || '') })); }, {});
  route('POST', '/api/crm/lost-reasons', async context => { requireManager(context); const body = objectBody(await readJson(context.request)); return json(await crm('saveLostReason', { id: String(body.id || ''), name: String(body.name || '') })); }, {});
  route('POST', '/api/crm/import/preview', async context => { requireManager(context); return json(await crm('previewImportWithHistory', { rows: rowsBody(await readJson(context.request)) })); }, {});
  route('GET', '/api/crm/import/history', async context => { requireManager(context); return json(await executeDatasource('crm.import_history')); }, {});
  route('POST', '/api/crm/import/commit', async context => { requireManager(context); return json(await crm('commitImport', { rows: rowsBody(await readJson(context.request)) })); }, {});
  route('POST', '/api/crm/merge', async context => { requireManager(context); const body = objectBody(await readJson(context.request)); return json(await executeDatasource('crm.merge_leads', { ids: stringArray(body.ids) })); }, {});
  route('POST', '/api/crm/merge/preview', async context => { requireManager(context); const body = objectBody(await readJson(context.request)); return json(await crm('mergePreview', { ids: stringArray(body.ids) })); }, {});
  route('POST', '/api/crm/leads', async ({ request, role }) => {
    const body = objectBody(await readJson(request));
    if (body.id && role === 'salesperson' && !(await executeDatasource('crm.lead_access', { id: String(body.id) }))[0]) throw new HttpError(403, 'Record access denied');
    if (role === 'salesperson' && ((body.salesperson_id && !['user-mitchell', 'Mitchell Admin'].includes(String(body.salesperson_id))) || (body.salesperson && !['', 'Mitchell Admin'].includes(String(body.salesperson))))) throw new HttpError(403, 'Manager permission required to assign records');
    return json(await executeDatasource('crm.save_lead', { values: body }));
  }, {});
  route('POST', '/api/crm/stage', async context => {
    const body = objectBody(await readJson(context.request));
    if (!body.id || !body.stage_id) throw new HttpError(400, 'id and stage_id are required');
    await requireLeadAccess(context, String(body.id)); await executeDatasource('crm.move_stage', { id: String(body.id), stage_id: String(body.stage_id) }); return json({ ok: true });
  }, {});
  route('POST', '/api/crm/activities/mutate', async ({ request, role }) => {
    const body = objectBody(await readJson(request)); const ids = stringArray(body.ids);
    if (role === 'salesperson' && ids.length && Number((await executeDatasource('crm.access.activities', { ids }))[0]?.count || 0) !== ids.length) throw new HttpError(403, 'Record access denied');
    return json(await crm('mutateActivities', { ids, operation: String(body.operation || ''), value: String(body.value || '') }));
  }, {});
  route('POST', '/api/crm/mutate', async context => {
    const body = objectBody(await readJson(context.request)); const ids = stringArray(body.ids); const operation = String(body.operation || '');
    if (!isManager(context.role) && ['archive', 'restore', 'delete', 'assign', 'merge'].includes(operation)) throw new HttpError(403, 'Manager permission required');
    if (context.role === 'salesperson' && ids.length && Number((await executeDatasource('crm.access.leads', { ids }))[0]?.count || 0) !== ids.length) throw new HttpError(403, 'Record access denied');
    return json(operation === 'merge' ? await executeDatasource('crm.merge_leads', { ids }) : await crm('mutateLeads', { ids, operation, value: String(body.value || '') }));
  }, {});
  parameterRoute('GET', /^\/api\/crm\/customers\/(?<id>[^/]+)\/related$/, async (_context, params) => json(await crm('customerRelated', { id: pathParam(params, 'id') })));
  parameterRoute('GET', /^\/api\/crm\/customers\/(?<id>[^/]+)$/, async (_context, params) => json((await executeDatasource('crm.customer', { id: pathParam(params, 'id') }))[0] || null));
  parameterRoute('GET', /^\/api\/crm\/teams\/(?<id>[^/]+)$/, async (_context, params) => json(await crm('getTeam', { id: pathParam(params, 'id') })));
  parameterRoute('GET', /^\/api\/crm\/catalog\/(?<catalog>activity_types|activity_plans|recurring_plans)$/, async context => { requireManager(context); return json(await executeDatasource(`crm.catalog.${context.url.pathname.split('/').pop()}`)); });
  parameterRoute('POST', /^\/api\/crm\/catalog\/(?<catalog>activity_types|activity_plans|recurring_plans)$/, async (context, params) => { requireManager(context); return json(await crm('saveCatalog', { kind: params.catalog, values: objectBody(await readJson(context.request)) })); });
  parameterRoute('GET', /^\/api\/crm\/leads\/(?<id>[^/]+)$/, async (context, params) => { const id = pathParam(params, 'id'); await requireLeadAccess(context, id); return json(await crm('getLead', { id })); });
  parameterRoute('GET', /^\/api\/crm\/leads\/(?<id>[^/]+)\/extras$/, async (context, params) => { const id = pathParam(params, 'id'); await requireLeadAccess(context, id); return json(await crm('leadExtras', { id })); });
  parameterRoute('POST', /^\/api\/crm\/leads\/(?<id>[^/]+)\/convert$/, async (context, params) => { const id = pathParam(params, 'id'); await requireLeadAccess(context, id); const body = objectBody(await readJson(context.request)); return json(await executeDatasource('crm.convert_lead', { id, customer_name: String(body.customer_name || '') })); });
  parameterRoute('POST', /^\/api\/crm\/leads\/(?<id>[^/]+)\/lost$/, async (context, params) => { const id = pathParam(params, 'id'); await requireLeadAccess(context, id); const body = objectBody(await readJson(context.request)); return json(await executeDatasource('crm.lose_lead', { id, reason_id: String(body.reason_id || '') })); });
  parameterRoute('GET', /^\/api\/crm\/leads\/(?<id>[^/]+)\/duplicates$/, async (context, params) => { const id = pathParam(params, 'id'); await requireLeadAccess(context, id); return json(await crm('findDuplicates', { id })); });
  parameterRoute('POST', /^\/api\/crm\/leads\/(?<id>[^/]+)\/extras$/, async (context, params) => {
    const id = pathParam(params, 'id'); await requireLeadAccess(context, id);
    if ((context.request.headers.get('content-type') || '').startsWith('multipart/form-data')) {
      const file = (await context.request.formData()).get('file');
      if (!(file instanceof File)) throw new HttpError(400, 'file is required');
      return json(await crm('addAttachmentFile', { id, file, upload_directory: uploadDirectory }));
    }
    const body = objectBody(await readJson(context.request));
    if (body.kind === 'message') return json(await crm('addMessage', { id, body: String(body.body || '') }));
    if (body.kind === 'activity') return json(await crm('addActivity', { id, activity_type: String(body.activity_type || 'To-do'), summary: String(body.summary || ''), due_date: String(body.due_date || '') }));
    if (body.kind === 'follower') return json(await crm('addFollower', { id, name: String(body.name || '') }));
    if (body.kind === 'attachment') return json(await crm('addAttachment', { id, name: String(body.name || '') }));
    throw new HttpError(400, 'Unknown record activity');
  });
  parameterRoute('GET', /^\/api\/crm\/attachments\/(?<id>[^/]+)$/, async (context, params) => {
    const attachment = (await executeDatasource('crm.attachment', { id: pathParam(params, 'id') }))[0] || null;
    if (!attachment?.stored_path) throw new HttpError(404, 'Attachment file not found');
    await requireLeadAccess(context, attachment.lead_id);
    const storedPath = String(attachment.stored_path);
    if (storedPath !== basename(storedPath) || isAbsolute(storedPath)) throw new HttpError(500, 'Invalid attachment path');
    const file = Bun.file(join(uploadDirectory, storedPath));
    if (!(await file.exists())) throw new HttpError(404, 'Attachment file not found');
    const downloadName = String(attachment.name || 'download').replace(/[\r\n"]/g, '_');
    return new Response(file, { headers: { ...headers, 'Content-Type': attachment.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${downloadName}"` } });
  });
}

async function dispatch(request: Request) {
  const url = new URL(request.url);
  const context = { request, url, role: roleOf(request) } satisfies Context;
  const routeKey = `${request.method} ${url.pathname}`;
  if (routeKey === 'GET /api/crm/pipeline') return exactRoutes.get(routeKey)!(context, {});
  const datasourceResponse = await routeDatasourceRequest(request, context.role);
  if (datasourceResponse) return datasourceResponse;
  const exactHandler = exactRoutes.get(routeKey);
  if (exactHandler) return exactHandler(context, {});
  const routes = parameterRoutes.get(request.method) || [];
  for (const routeDefinition of routes) {
    const match = routeDefinition.pattern.exec(url.pathname);
    if (match) return routeDefinition.handler(context, match.groups || {});
  }
  if (request.method === 'GET') return await staticFile(url.pathname) || new Response('Not found', { status: 404 });
  return json({ error: 'Not found' }, 404);
}

registerRoutes();
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
