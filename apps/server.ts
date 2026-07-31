import { closeDatabase, initDatabase } from './crm/db/database.ts';
import { routeODataRequest } from './crm/db/datasource-runtime.ts';
import { readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

type Role = 'salesperson' | 'manager' | 'system';

const port = Number(process.env.PORT || 3010);
const configuredRole: Role = process.env.CRM_ROLE === 'manager' || process.env.CRM_ROLE === 'system' ? process.env.CRM_ROLE : 'salesperson';
const allowRoleHeader = process.env.CRM_ALLOW_ROLE_HEADER === 'true' && ['development', 'test'].includes(process.env.NODE_ENV || '');
const headers = {
  'Access-Control-Allow-Origin': process.env.CRM_CORS_ORIGIN || `http://localhost:${port}`,
  'Access-Control-Allow-Headers': allowRoleHeader ? 'Content-Type, X-CRM-Role' : 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
};
const publicFiles = new Map([
  ['app.ts', join(import.meta.dir, 'crm', 'app.ts')],
  ['index.html', join(import.meta.dir, 'index.html')],
  ['styles.css', join(import.meta.dir, 'styles.css')],
]);
const contentTypes: Record<string, string> = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.ts': 'application/javascript', '.yaml': 'text/yaml', '.yml': 'text/yaml',
};

function roleOf(request: Request): Role {
  if (allowRoleHeader) {
    const role = request.headers.get('x-crm-role');
    if (role === 'manager' || role === 'system') return role;
  }
  return configuredRole;
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function errorResponse(error: unknown) {
  const status = typeof (error as { status?: unknown })?.status === 'number' ? Number((error as { status: number }).status) : 500;
  if (status >= 500) console.error(error);
  return json({ error: status >= 500 ? 'Internal server error' : error instanceof Error ? error.message : 'Invalid request' }, status);
}

async function screenDefinition() {
  const directory = join(import.meta.dir, 'crm', 'screens');
  const files = readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map(entry => join(directory, entry.name));
  const documents = await Promise.all(files.map(async path => Bun.YAML.parse(await Bun.file(path).text()) as Record<string, unknown>));
  return {
    datasources: Object.assign({}, ...documents.map(document => document.datasources || {})),
    screens: documents.flatMap(document => Array.isArray(document.screens) ? document.screens : []),
    navigation: documents.flatMap(document => Array.isArray(document.navigation) ? document.navigation : []),
  };
}

async function staticFile(pathname: string) {
  let relative: string;
  try { relative = decodeURIComponent(pathname === '/' ? 'index.html' : pathname.slice(1)); } catch { return null; }
  if (!relative || relative.includes('\0') || relative.includes('\\') || relative.split('/').includes('..')) return null;
  let filePath = publicFiles.get(relative);
  if (!filePath && relative.startsWith('screens/')) filePath = resolve(join(import.meta.dir, 'crm', relative));
  if (!filePath || !contentTypes[extname(filePath).toLowerCase()]) return null;
  const allowedRoot = resolve(join(import.meta.dir, 'crm'));
  if (relative.startsWith('screens/') && !filePath.startsWith(`${allowedRoot}/screens/`)) return null;
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  if (filePath.endsWith('.ts')) return new Response(new Bun.Transpiler({ loader: 'ts' }).transformSync(await file.text()), { headers: { ...headers, 'Content-Type': contentTypes['.ts'] } });
  return new Response(file, { headers: { ...headers, 'Content-Type': contentTypes[extname(filePath).toLowerCase()] } });
}

async function dispatch(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/odata')) {
    const response = await routeODataRequest(request, roleOf(request));
    if (response) return response;
  }
  if (url.pathname === '/api/ui' && request.method === 'GET') return json(await screenDefinition());
  if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
  if (request.method === 'GET') {
    const asset = await staticFile(url.pathname);
    if (asset) return asset;
    if (!url.pathname.includes('.')) return await staticFile('/');
    return new Response('Not found', { status: 404 });
  }
  return json({ error: 'Not found' }, 404);
}

await initDatabase();
const server = Bun.serve({ port, async fetch(request) {
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
console.log(`CRM app running at http://localhost:${port}`);
