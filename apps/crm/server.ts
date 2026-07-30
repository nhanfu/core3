import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { activityAnalysis, activityDrilldown, addActivity, addAttachment, addAttachmentFile, addFollower, addMessage, attachmentFile, canAccessActivities, canAccessLead, canAccessLeads, catalogRows, commitImport, convertLead, crmConfig, crmLookups, crmStages, crmTags, customerRelated, findDuplicates, getCustomer, getLead, getTeam, importHistory, leadAnalysis, leadDrilldown, leadExtras, listActivities, listCustomers, listLeads, listTeams, loseLead, lostReasons, mergeLeads, mergePreview, moveStage, mutateActivities, mutateLeads, partners, pipeline, previewImportWithHistory, reportAnalysis, reportDrilldown, reportSummary, saveCatalogRow, saveCrmConfig, saveCrmStages, saveCrmTag, saveCustomer, saveLead, saveLostReason, saveTeam } from './services/crm-service.ts';
import { closeDatabase, initDatabase } from './db/database.ts';
import { routeDatasourceRequest } from './db/datasource-runtime.ts';

const PORT = Number(process.env.PORT || 3010);
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const moduleDefinition = Bun.YAML.parse(readFileSync(join(import.meta.dir, 'module.yaml'), 'utf8'));
const appManifests = moduleDefinition.apps || [];
function roleOf(request: Request) {
  const role = request.headers.get('x-crm-role');
  return role === 'manager' || role === 'system' ? role : 'salesperson';
}

function isManager(request: Request) {
  return roleOf(request) === 'manager' || roleOf(request) === 'system';
}

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
const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (url.pathname === '/api/crm/pipeline' && request.method === 'GET') return json(await pipeline(url.searchParams.get('search') || '', {
      filter: url.searchParams.get('filter') || undefined,
      sort: url.searchParams.get('sort') || undefined,
      role: roleOf(request),
    }));
    const datasourceResponse = await routeDatasourceRequest(request, roleOf(request));
    if (datasourceResponse) return datasourceResponse;
    if (url.pathname === '/api/crm/module' && request.method === 'GET') return json(moduleDefinition);
    if (url.pathname === '/api/modules' && request.method === 'GET') return json(appManifests);
    if (url.pathname === '/api/crm/leads' && request.method === 'GET') return json(await listLeads(url.searchParams.get('search') || '', {
      type: url.searchParams.get('type') || undefined,
      filter: url.searchParams.get('filter') || undefined,
      sort: url.searchParams.get('sort') || undefined,
      groupBy: url.searchParams.get('group_by') || undefined,
      teamId: url.searchParams.get('team_id') || undefined,
      role: roleOf(request),
    }));
    if (url.pathname === '/api/crm/partners' && request.method === 'GET') return json(await partners(url.searchParams.get('search') || ''));
    if (url.pathname === '/api/crm/lookups' && request.method === 'GET') return json(await crmLookups(url.searchParams.get('search') || ''));
    if (url.pathname === '/api/crm/customers' && request.method === 'GET') return json(await listCustomers(url.searchParams.get('search') || ''));
    if (url.pathname === '/api/crm/teams' && request.method === 'GET') return json(await listTeams());
    const customerMatch = url.pathname.match(/^\/api\/crm\/customers\/([^/]+)$/);
    if (customerMatch && request.method === 'GET') return json(await getCustomer(customerMatch[1]));
    const customerRelatedMatch = url.pathname.match(/^\/api\/crm\/customers\/([^/]+)\/related$/);
    if (customerRelatedMatch && request.method === 'GET') return json(await customerRelated(customerRelatedMatch[1]));
    if (url.pathname === '/api/crm/customers' && request.method === 'POST') return json(await saveCustomer(await request.json()));
    const teamMatch = url.pathname.match(/^\/api\/crm\/teams\/([^/]+)$/);
    if (teamMatch && request.method === 'GET') return json(await getTeam(teamMatch[1]));
    if (url.pathname === '/api/crm/teams' && request.method === 'POST') {
      if (roleOf(request) !== 'manager' && roleOf(request) !== 'system') return json({ error: 'Manager permission required' }, 403);
      return json(await saveTeam(await request.json()));
    }
    if (url.pathname === '/api/crm/report/summary' && request.method === 'GET') return json(await reportSummary(roleOf(request)));
    if (url.pathname === '/api/crm/report/analysis' && request.method === 'GET') return json(await reportAnalysis(url.searchParams.get('dimension') || 'stage', roleOf(request), url.searchParams.get('from') || '', url.searchParams.get('to') || '', url.searchParams.get('search') || ''));
    if (url.pathname === '/api/crm/report/drilldown' && request.method === 'GET') return json(await reportDrilldown(url.searchParams.get('dimension') || 'stage', url.searchParams.get('value') || '', roleOf(request), url.searchParams.get('secondary_dimension') || '', url.searchParams.get('secondary_value') || ''));
    if (url.pathname === '/api/crm/report/lead-analysis' && request.method === 'GET') return json(await leadAnalysis(url.searchParams.get('dimension') || 'source', roleOf(request), url.searchParams.get('search') || ''));
    if (url.pathname === '/api/crm/report/lead-drilldown' && request.method === 'GET') return json(await leadDrilldown(url.searchParams.get('dimension') || 'source', url.searchParams.get('value') || '', roleOf(request)));
    if (url.pathname === '/api/crm/config' && request.method === 'GET') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await crmConfig());
    }
    if (url.pathname === '/api/crm/config' && request.method === 'POST') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await saveCrmConfig(await request.json()));
    }
    if (url.pathname === '/api/crm/stages' && request.method === 'GET') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await crmStages());
    }
    if (url.pathname === '/api/crm/stages' && request.method === 'POST') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await saveCrmStages((await request.json() as { rows?: unknown[] }).rows || []));
    }
    if (url.pathname === '/api/crm/tags' && request.method === 'GET') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await crmTags());
    }
    if (url.pathname === '/api/crm/tags' && request.method === 'POST') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      const body = await request.json() as { id?: string; name?: string; color?: string };
      return json(await saveCrmTag(body.id || '', body.name || '', body.color || ''));
    }
    if (url.pathname === '/api/crm/lost-reasons' && request.method === 'POST') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      const body = await request.json() as { id?: string; name?: string };
      return json(await saveLostReason(body.id || '', body.name || ''));
    }
    const catalogMatch = url.pathname.match(/^\/api\/crm\/catalog\/(activity_types|activity_plans|recurring_plans)$/);
    if (catalogMatch && request.method === 'GET') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await catalogRows(catalogMatch[1] as 'activity_types' | 'activity_plans' | 'recurring_plans'));
    }
    if (catalogMatch && request.method === 'POST') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await saveCatalogRow(catalogMatch[1] as 'activity_types' | 'activity_plans' | 'recurring_plans', await request.json()));
    }
    if (url.pathname === '/api/crm/lost-reasons' && request.method === 'GET') return json(await lostReasons());
    const convertMatch = url.pathname.match(/^\/api\/crm\/leads\/([^/]+)\/convert$/);
    if (convertMatch && request.method === 'POST') {
      if (!await canAccessLead(convertMatch[1], roleOf(request))) return json({ error: 'Record access denied' }, 403);
      const body = await request.json().catch(() => ({})) as { customer_name?: string };
      return json(await convertLead(convertMatch[1], String(body.customer_name || '')));
    }
    const lostMatch = url.pathname.match(/^\/api\/crm\/leads\/([^/]+)\/lost$/);
    if (lostMatch && request.method === 'POST') {
      const body = await request.json() as { reason_id?: string };
      if (!await canAccessLead(lostMatch[1], roleOf(request))) return json({ error: 'Record access denied' }, 403);
      return json(await loseLead(lostMatch[1], body.reason_id || ''));
    }
    const duplicateMatch = url.pathname.match(/^\/api\/crm\/leads\/([^/]+)\/duplicates$/);
    if (duplicateMatch && request.method === 'GET') {
      if (!await canAccessLead(duplicateMatch[1], roleOf(request))) return json({ error: 'Record access denied' }, 403);
      return json(await findDuplicates(duplicateMatch[1]));
    }
    if (url.pathname === '/api/crm/merge' && request.method === 'POST') {
      if (roleOf(request) !== 'manager' && roleOf(request) !== 'system') return json({ error: 'Manager permission required' }, 403);
      const body = await request.json() as { ids?: string[] };
      return json(await mergeLeads(body.ids || []));
    }
    if (url.pathname === '/api/crm/merge/preview' && request.method === 'POST') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      const body = await request.json() as { ids?: string[] };
      return json(await mergePreview(body.ids || []));
    }
    if (url.pathname === '/api/crm/import/preview' && request.method === 'POST') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await previewImportWithHistory((await request.json() as { rows?: unknown[] }).rows || []));
    }
    if (url.pathname === '/api/crm/import/history' && request.method === 'GET') {
      if (!isManager(request)) return json({ error: 'Manager permission required' }, 403);
      return json(await importHistory());
    }
    if (url.pathname === '/api/crm/import/commit' && request.method === 'POST') {
      if (roleOf(request) !== 'manager' && roleOf(request) !== 'system') return json({ error: 'Manager permission required' }, 403);
      return json(await commitImport((await request.json() as { rows?: unknown[] }).rows || []));
    }
    if (url.pathname === '/api/crm/activities' && request.method === 'GET') return json(await listActivities({ search: url.searchParams.get('search') || '', status: url.searchParams.get('status') || undefined, role: roleOf(request) }));
    if (url.pathname === '/api/crm/report/activity-analysis' && request.method === 'GET') return json(await activityAnalysis(url.searchParams.get('dimension') || 'activity_type', roleOf(request), url.searchParams.get('search') || ''));
    if (url.pathname === '/api/crm/report/activity-drilldown' && request.method === 'GET') return json(await activityDrilldown(url.searchParams.get('dimension') || 'activity_type', url.searchParams.get('value') || '', roleOf(request)));
    if (url.pathname === '/api/crm/activities/mutate' && request.method === 'POST') {
      const body = await request.json() as { ids?: string[]; operation?: string; value?: string };
      if (!await canAccessActivities(body.ids || [], roleOf(request))) return json({ error: 'Record access denied' }, 403);
      return json(await mutateActivities(body.ids || [], body.operation || '', body.value || ''));
    }
    const leadMatch = url.pathname.match(/^\/api\/crm\/leads\/([^/]+)$/);
    if (leadMatch && request.method === 'GET') {
      if (!await canAccessLead(leadMatch[1], roleOf(request))) return json({ error: 'Record access denied' }, 403);
      return json(await getLead(leadMatch[1]));
    }
    const extrasMatch = url.pathname.match(/^\/api\/crm\/leads\/([^/]+)\/extras$/);
    if (extrasMatch && request.method === 'GET') {
      if (!await canAccessLead(extrasMatch[1], roleOf(request))) return json({ error: 'Record access denied' }, 403);
      return json(await leadExtras(extrasMatch[1]));
    }
    if (extrasMatch && request.method === 'POST') {
      if (!await canAccessLead(extrasMatch[1], roleOf(request))) return json({ error: 'Record access denied' }, 403);
      if ((request.headers.get('content-type') || '').startsWith('multipart/form-data')) {
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return json({ error: 'file is required' }, 400);
        return json(await addAttachmentFile(extrasMatch[1], file));
      }
      const body = await request.json() as any;
      if (body.kind === 'message') return json(await addMessage(extrasMatch[1], String(body.body || '')));
      if (body.kind === 'activity') return json(await addActivity(extrasMatch[1], String(body.activity_type || 'To-do'), String(body.summary || ''), String(body.due_date || '')));
      if (body.kind === 'follower') return json(await addFollower(extrasMatch[1], String(body.name || '')));
      if (body.kind === 'attachment') return json(await addAttachment(extrasMatch[1], String(body.name || '')));
      return json({ error: 'Unknown record activity' }, 400);
    }
    const attachmentMatch = url.pathname.match(/^\/api\/crm\/attachments\/([^/]+)$/);
    if (attachmentMatch && request.method === 'GET') {
      const attachment = await attachmentFile(attachmentMatch[1]);
      if (!attachment?.stored_path) return json({ error: 'Attachment file not found' }, 404);
      if (!await canAccessLead(attachment.lead_id, roleOf(request))) return json({ error: 'Record access denied' }, 403);
      const file = Bun.file(join(import.meta.dir, 'db', 'uploads', attachment.stored_path));
      if (!(await file.exists())) return json({ error: 'Attachment file not found' }, 404);
      return new Response(file, { headers: { ...headers, 'Content-Type': attachment.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${attachment.name.replace(/"/g, '')}"` } });
    }
    if (url.pathname === '/api/crm/leads' && request.method === 'POST') {
      const body = await request.json() as Record<string, unknown>;
      if (body.id && !await canAccessLead(String(body.id), roleOf(request))) return json({ error: 'Record access denied' }, 403);
      if (roleOf(request) === 'salesperson' && ((body.salesperson_id && !['user-mitchell', 'Mitchell Admin'].includes(String(body.salesperson_id))) || (body.salesperson && !['', 'Mitchell Admin'].includes(String(body.salesperson))))) return json({ error: 'Manager permission required to assign records' }, 403);
      try { return json(await saveLead(body)); } catch (error: any) { return json({ error: error?.message || 'Unable to save record' }, Number(error?.status) || 400); }
    }
    if (url.pathname === '/api/crm/stage' && request.method === 'POST') {
      const body = await request.json() as { id?: string; stage_id?: string };
      if (!body.id || !body.stage_id) return json({ error: 'id and stage_id are required' }, 400);
      if (!await canAccessLead(body.id, roleOf(request))) return json({ error: 'Record access denied' }, 403);
      await moveStage(body.id, body.stage_id);
      return json({ ok: true });
    }
    if (url.pathname === '/api/crm/mutate' && request.method === 'POST') {
      const body = await request.json() as { ids?: string[]; operation?: string; value?: string };
      if (roleOf(request) !== 'manager' && ['archive', 'restore', 'delete', 'assign', 'merge'].includes(body.operation || '')) return json({ error: 'Manager permission required' }, 403);
      if (!await canAccessLeads(body.ids || [], roleOf(request))) return json({ error: 'Record access denied' }, 403);
      if (body.operation === 'merge') return json(await mergeLeads(body.ids || []));
      return json(await mutateLeads(body.ids || [], body.operation || '', body.value || ''));
    }
    if (request.method === 'GET') return (await staticFile(url.pathname)) || new Response('Not found', { status: 404 });
    return json({ error: 'Not found' }, 404);
  },
});

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
