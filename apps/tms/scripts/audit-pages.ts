import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = (process.env.TMS_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const email = process.env.TMS_AUDIT_EMAIL || 'admin@tms.local';
const password = process.env.TMS_AUDIT_PASSWORD || 'admin123';
const pageDir = join(import.meta.dir, '..', 'pages');
const appSource = readFileSync(join(import.meta.dir, '..', 'app.ts'), 'utf8');

type Source = { id: string; query?: string };
type Page = { page?: { id?: string }; datasources?: Source[] };

function bindParams(query: string): Record<string, null> {
  const params: Record<string, null> = {};
  for (const match of query.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)) params[match[1]] = null;
  return params;
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { response, body };
}

const login = await request('/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!login.response.ok || !login.body?.token) {
  throw new Error(`login failed (${login.response.status}): ${JSON.stringify(login.body)}`);
}
const headers = {
  Authorization: `Bearer ${login.body.token}`,
  'content-type': 'application/json',
};

const pages = readdirSync(pageDir).filter((file) => file.endsWith('.yaml')).sort();
let pageFailures = 0;
let sourceFailures = 0;
let directFailures = 0;
let sourceCount = 0;

for (const file of pages) {
  const page = Bun.YAML.parse(readFileSync(join(pageDir, file), 'utf8')) as Page;
  const pageId = page.page?.id;
  if (!pageId) {
    pageFailures++;
    console.error(`PAGE ${file}: missing page.id`);
    continue;
  }
  const pageResult = await request(`/api/pages/${pageId}`, { headers });
  if (!pageResult.response.ok) {
    pageFailures++;
    console.error(`PAGE ${pageId}: ${pageResult.response.status} ${JSON.stringify(pageResult.body)}`);
  }
  for (const source of page.datasources || []) {
    sourceCount++;
    const result = await request('/api/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({ sourceId: source.id, params: bindParams(source.query || ''), top: 5 }),
    });
    if (!result.response.ok) {
      sourceFailures++;
      console.error(`SOURCE ${source.id}: ${result.response.status} ${JSON.stringify(result.body)}`);
    }
  }
}

const routes = [...appSource.matchAll(/^\s*'([^']+)'\s*:/gm)]
  .map((match) => match[1])
  .filter((route) => route.startsWith('/') && route !== '/login');
for (const route of new Set(routes)) {
  const response = await fetch(`${baseUrl}${route}`);
  if (!response.ok) {
    directFailures++;
    console.error(`DIRECT ${route}: ${response.status}`);
  }
}

console.log(`pages=${pages.length} sources=${sourceCount} direct_routes=${new Set(routes).size} page_failures=${pageFailures} source_failures=${sourceFailures} direct_failures=${directFailures}`);
if (pageFailures || sourceFailures || directFailures) process.exit(1);
