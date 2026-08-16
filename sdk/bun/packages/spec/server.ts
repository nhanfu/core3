import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { registerPageComponentSchema, validatePageDefinition } from '@core3/server/yaml/schema';

const PORT = parseInt(process.env.PORT || '3002');
const APPS_ROOT = import.meta.dir;
const REPO_ROOT = join(APPS_ROOT, '..', '..');
const PUBLIC_ROOT = join(APPS_ROOT, 'public');
const PAGES_ROOT = join(APPS_ROOT, 'pages');

// The spec app has no datasources, auth, or storage — it registers its own
// content component so the shared page schema still validates its YAML.
registerPageComponentSchema('DocPage', ['hero', 'sections']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function parseYaml(file: string): any {
  return Bun.YAML.parse(readFileSync(file, 'utf8'));
}

function loadNav(): any {
  return parseYaml(join(PAGES_ROOT, 'nav.yaml'));
}

function loadPage(id: string): any {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  const file = join(PAGES_ROOT, `${id}.yaml`);
  try {
    const config = parseYaml(file);
    return validatePageDefinition(config, { allowExternalSources: true });
  } catch {
    return null;
  }
}

function listPageIds(): string[] {
  return readdirSync(PAGES_ROOT)
    .filter((name) => /\.ya?ml$/i.test(name) && name !== 'nav.yaml')
    .map((name) => name.replace(/\.ya?ml$/i, ''));
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.ts': 'application/javascript',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function mimeFor(path: string) {
  const ext = path.slice(path.lastIndexOf('.'));
  return MIME[ext] || 'application/octet-stream';
}

async function serveStatic(pathname: string) {
  const rel = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (rel.includes('..')) return null;
  try {
    const publicFile = Bun.file(join(PUBLIC_ROOT, rel));
    const repoFile = Bun.file(join(REPO_ROOT, rel));
    const file = await publicFile.exists() ? publicFile : repoFile;
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

function serveShell() {
  return new Response(Bun.file(join(PUBLIC_ROOT, 'index.html')), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS },
  });
}

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    if (url.pathname === '/api/nav' && req.method === 'GET') {
      return json(loadNav());
    }
    if (url.pathname === '/api/pages' && req.method === 'GET') {
      return json(listPageIds());
    }
    const pageMatch = url.pathname.match(/^\/api\/pages\/([a-z0-9-]+)$/i);
    if (pageMatch && req.method === 'GET') {
      const config = loadPage(pageMatch[1]);
      if (!config) return json({ error: 'Page not found' }, 404);
      return json(config);
    }

    if (req.method === 'GET') return (await serveStatic(url.pathname)) || serveShell();
    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`Core3 spec running at http://localhost:${PORT}`);
