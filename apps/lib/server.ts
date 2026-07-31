import { readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

export type ApplicationBackend = {
  id: string;
  name: string;
  headers(port: number): HeadersInit;
  init(): Promise<void>;
  close(): Promise<void>;
  routeApi(request: Request): Promise<Response | undefined>;
};

const appId = process.env.CORE3_APP || 'crm';
if (!/^[a-z][a-z0-9-]*$/.test(appId)) throw new Error('CORE3_APP must be a lowercase application id.');

const backend = (await import(`../${appId}/backend.ts`)).default as ApplicationBackend;
const appDirectory = resolve(join(import.meta.dir, '..', appId));
const port = Number(process.env.PORT || 3010);
const headers = backend.headers(port);
const contentTypes: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.ts': 'application/javascript',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
};
const publicFiles = new Map([
  ['index.html', join(import.meta.dir, '..', 'index.html')],
  ['styles.css', join(import.meta.dir, '..', 'styles.css')],
  ['lib/render.ts', join(import.meta.dir, 'render.ts')],
  ['lib/html.ts', join(import.meta.dir, 'html.ts')],
]);

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: unknown) {
  const status = typeof (error as { status?: unknown })?.status === 'number'
    ? Number((error as { status: number }).status)
    : 500;
  if (status >= 500) console.error(error);
  return json({ error: status >= 500 ? 'Internal server error' : error instanceof Error ? error.message : 'Invalid request' }, status);
}

async function screenDefinition() {
  const directory = join(appDirectory, 'screens');
  const files = readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map(entry => join(directory, entry.name));
  const documents = await Promise.all(files.map(async path => Bun.YAML.parse(await Bun.file(path).text()) as Record<string, unknown>));
  return {
    application: { id: backend.id, name: backend.name },
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
  if (!filePath && relative.startsWith('screens/')) filePath = resolve(join(appDirectory, relative));
  if (!filePath || !contentTypes[extname(filePath).toLowerCase()]) return null;
  const screensDirectory = resolve(join(appDirectory, 'screens'));
  if (relative.startsWith('screens/') && !filePath.startsWith(`${screensDirectory}/`)) return null;
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  if (filePath.endsWith('.ts')) {
    return new Response(new Bun.Transpiler({ loader: 'ts' }).transformSync(await file.text()), {
      headers: { ...headers, 'Content-Type': contentTypes['.ts'] },
    });
  }
  return new Response(file, { headers: { ...headers, 'Content-Type': contentTypes[extname(filePath).toLowerCase()] } });
}

async function dispatch(request: Request) {
  const url = new URL(request.url);
  const apiResponse = await backend.routeApi(request);
  if (apiResponse) return apiResponse;
  if (url.pathname === '/api/ui' && request.method === 'GET') return json(await screenDefinition());
  if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
  if (request.method === 'GET') {
    const asset = await staticFile(url.pathname);
    if (asset) return asset;
    if (!url.pathname.includes('.')) return await staticFile('/');
  }
  return new Response('Not found', { status: 404 });
}

await backend.init();
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
  await backend.close();
}
process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
console.log(`${backend.name} app running at http://localhost:${port}`);
