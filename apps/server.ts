import duckdb from 'duckdb';
import { createFramework, SERVICE_KEYS } from '@core3/framework';
import { join } from 'node:path';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { discoverPages } from './lib/server/discovery.ts';
import { createTmsApi } from './tms/api.ts';
import { DuckDbRepository, JwtAuthProvider, initTmsDatabase } from './tms/module.ts';

const PORT = parseInt(process.env.PORT || '3001');
const PROJECT_ROOT = import.meta.dir;
const TMS_ROOT = join(PROJECT_ROOT, 'tms');
const DB_PATH = process.env.TMS_DB_PATH || join(TMS_ROOT, 'tms.duckdb');
const UPLOAD_ROOT = process.env.TMS_UPLOAD_ROOT || join(TMS_ROOT, '.data', 'uploads');
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tms-dev-secret-32chars!!!!'
);
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

function apiError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ── Static file serving ───────────────────────────────────────────────────────
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
  if (/(^|\/)pages\/.+\.ya?ml$/i.test(rel)) return null;
  try {
    // The app consumes the framework through a local file dependency. Bun
    // materializes that package on install, so it can otherwise become stale
    // while framework files are edited in this workspace. Serve the source of
    // that dependency during local development instead.
    const file = packagePath
      ? Bun.file(join(PROJECT_ROOT, 'lib', rel.slice('node_modules/@core3/framework/'.length)))
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
// ── Convention-based page and datasource registry ───────────────────────────
// Every apps/*/pages and apps/pages YAML file is discovered automatically.
const discovered = discoverPages(PROJECT_ROOT);
const SOURCES = discovered.datasources;
const PAGES = new Map([...discovered.pages].map(([id, page]) => [id, page.config]));
const CATALOGS = discovered.catalogs;

const handleAPI = createTmsApi({
  repository,
  authProvider,
  sources: SOURCES,
  pages: PAGES,
  catalogs: CATALOGS,
  uploadRoot: UPLOAD_ROOT,
});

// ── Main server ───────────────────────────────────────────────────────────────
await initTmsDatabase(repository, TMS_ROOT);

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
      // Convention over configuration: every non-asset GET is an SPA route.
      return serveSPA();
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`TMS server running at http://localhost:${PORT}`);
