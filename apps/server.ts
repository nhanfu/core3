import { join } from 'node:path';
import { discoverModules, ModuleManager } from './lib/server/module.ts';

const PORT = parseInt(process.env.PORT || '3001');
const APPS_ROOT = import.meta.dir;
const PUBLIC_ROOT = join(APPS_ROOT, 'public');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function apiError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.ts': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function mimeFor(path: string) {
  const ext = path.slice(path.lastIndexOf('.')) as keyof typeof MIME;
  return MIME[ext] || 'application/octet-stream';
}

async function serveStatic(pathname: string) {
  const rel = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (rel.includes('..')) return null;
  // Page YAML may contain server-only datasource SQL.
  if (/(^|\/)pages\/.+\.ya?ml$/i.test(rel)) return null;
  try {
    const publicFile = Bun.file(join(PUBLIC_ROOT, rel));
    const file = await publicFile.exists() ? publicFile : Bun.file(join(APPS_ROOT, rel));
    if (!(await file.exists())) return null;
    if (rel.endsWith('.ts')) {
      const transpiler = new Bun.Transpiler({ loader: 'ts' });
      return new Response(transpiler.transformSync(await file.text()), {
        headers: { 'Content-Type': 'application/javascript', ...CORS_HEADERS },
      });
    }
    return new Response(file, { headers: { 'Content-Type': mimeFor(rel), ...CORS_HEADERS } });
  } catch {
    return null;
  }
}

async function serveSPA() {
  const file = Bun.file(join(PUBLIC_ROOT, 'index.html'));
  if (await file.exists()) {
    return new Response(file, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS } });
  }
  return new Response('Core3 server running. No index.html found.', {
    headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
  });
}

const modules = await discoverModules(APPS_ROOT);
const moduleManager = new ModuleManager(modules);
await moduleManager.loadAll({ appsRoot: APPS_ROOT, env: process.env });

const shutdown = async () => {
  await moduleManager.unloadAll({ appsRoot: APPS_ROOT, env: process.env });
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    if (url.pathname.startsWith('/api/')) {
      try {
        return (await moduleManager.handle(req, url)) || apiError(404, 'API route not found');
      } catch (error) {
        const failure = error as any;
        if (failure?.status) return apiError(failure.status, failure.message);
        console.error('[API error]', error);
        return apiError(500, 'Internal server error');
      }
    }

    if (req.method === 'GET') return (await serveStatic(url.pathname)) || serveSPA();
    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`Core3 server running at http://localhost:${PORT}`);
