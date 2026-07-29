import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { addActivity, addAttachment, addFollower, addMessage, getLead, initDatabase, leadExtras, listLeads, moveStage, mutateLeads, partners, pipeline, saveLead } from './database.ts';

const PORT = Number(process.env.PORT || 3010);
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const moduleDefinition = Bun.YAML.parse(readFileSync(join(import.meta.dir, 'module.yaml'), 'utf8'));
function roleOf(request: Request) { return request.headers.get('x-crm-role') === 'manager' ? 'manager' : 'salesperson'; }

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

async function staticFile(pathname: string) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (relative.includes('..')) return null;
  const packagePath = relative.startsWith('node_modules/@core3/framework/');
  const filePath = packagePath
    ? join(import.meta.dir, '../../lib', relative.slice('node_modules/@core3/framework/'.length))
    : join(import.meta.dir, relative);
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  if (filePath.endsWith('.ts')) {
    const source = await file.text();
    return new Response(new Bun.Transpiler({ loader: 'ts' }).transformSync(source), { headers: { ...headers, 'Content-Type': 'application/javascript' } });
  }
  return new Response(file, { headers: { ...headers, 'Content-Type': filePath.endsWith('.css') ? 'text/css' : 'text/html' } });
}

await initDatabase();
Bun.serve({
  port: PORT,
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (url.pathname === '/api/crm/pipeline' && request.method === 'GET') return json(await pipeline(url.searchParams.get('search') || '', {
      filter: url.searchParams.get('filter') || undefined,
      sort: url.searchParams.get('sort') || undefined,
    }));
    if (url.pathname === '/api/crm/module' && request.method === 'GET') return json(moduleDefinition);
    if (url.pathname === '/api/crm/leads' && request.method === 'GET') return json(await listLeads(url.searchParams.get('search') || '', {
      type: url.searchParams.get('type') || undefined,
      filter: url.searchParams.get('filter') || undefined,
      sort: url.searchParams.get('sort') || undefined,
      groupBy: url.searchParams.get('group_by') || undefined,
    }));
    if (url.pathname === '/api/crm/partners' && request.method === 'GET') return json(await partners(url.searchParams.get('search') || ''));
    const leadMatch = url.pathname.match(/^\/api\/crm\/leads\/([^/]+)$/);
    if (leadMatch && request.method === 'GET') return json(await getLead(leadMatch[1]));
    const extrasMatch = url.pathname.match(/^\/api\/crm\/leads\/([^/]+)\/extras$/);
    if (extrasMatch && request.method === 'GET') return json(await leadExtras(extrasMatch[1]));
    if (extrasMatch && request.method === 'POST') {
      const body = await request.json() as any;
      if (body.kind === 'message') return json(await addMessage(extrasMatch[1], String(body.body || '')));
      if (body.kind === 'activity') return json(await addActivity(extrasMatch[1], String(body.activity_type || 'To-do'), String(body.summary || ''), String(body.due_date || '')));
      if (body.kind === 'follower') return json(await addFollower(extrasMatch[1], String(body.name || '')));
      if (body.kind === 'attachment') return json(await addAttachment(extrasMatch[1], String(body.name || '')));
      return json({ error: 'Unknown record activity' }, 400);
    }
    if (url.pathname === '/api/crm/leads' && request.method === 'POST') return json(await saveLead(await request.json()));
    if (url.pathname === '/api/crm/stage' && request.method === 'POST') {
      const body = await request.json() as { id?: string; stage_id?: string };
      if (!body.id || !body.stage_id) return json({ error: 'id and stage_id are required' }, 400);
      await moveStage(body.id, body.stage_id);
      return json({ ok: true });
    }
    if (url.pathname === '/api/crm/mutate' && request.method === 'POST') {
      const body = await request.json() as { ids?: string[]; operation?: string; value?: string };
      if (roleOf(request) !== 'manager' && ['archive', 'restore', 'delete', 'assign', 'merge'].includes(body.operation || '')) return json({ error: 'Manager permission required' }, 403);
      return json(await mutateLeads(body.ids || [], body.operation || '', body.value || ''));
    }
    if (request.method === 'GET') return (await staticFile(url.pathname)) || new Response('Not found', { status: 404 });
    return json({ error: 'Not found' }, 404);
  },
});
console.log(`CRM app running at http://localhost:${PORT}`);
