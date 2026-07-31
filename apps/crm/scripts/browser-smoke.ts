import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const port = 3400 + Math.floor(Math.random() * 300);
const databasePath = join(mkdtempSync(join(tmpdir(), 'core3-crm-browser-')), 'fixture.duckdb');
const origin = `http://127.0.0.1:${port}`;
const server = Bun.spawn(['bun', '../lib/server.ts'], {
  cwd: import.meta.dir.replace(/\/scripts$/, ''),
  env: { ...process.env, PORT: String(port), CRM_DB_PATH: databasePath, NODE_ENV: 'test', CRM_ALLOW_ROLE_HEADER: 'true' },
  stdout: 'ignore', stderr: 'pipe',
});

async function response(path: string, options?: RequestInit) {
  const result = await fetch(`${origin}${path}`, options);
  const body = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(`${options?.method || 'GET'} ${path}: ${result.status} ${body.error || ''}`);
  return body;
}

function browser(path: string, required: string[]) {
  const result = Bun.spawnSync([
    'google-chrome', '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--window-size=1440,900', '--virtual-time-budget=3000', '--dump-dom', `${origin}${path}`,
  ], { stdout: 'pipe', stderr: 'ignore' });
  const document = new TextDecoder().decode(result.stdout);
  const missing = required.filter(marker => !document.includes(marker));
  if (missing.length) throw new Error(`${path}: missing ${missing.join(', ')}`);
}

try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`${origin}/api/odata/$metadata`)).ok) break; } catch {}
    await Bun.sleep(50);
    if (attempt === 59) throw new Error('CRM server did not start');
  }

  const metadata = await response('/api/odata/$metadata');
  const resourceNames = metadata.resources?.map((resource: any) => resource.name).sort().join(',');
  if (resourceNames !== 'Activities,Attachments,Catalogs,Customers,Followers,Imports,Leads,Messages,Stages,Teams') throw new Error(`Unexpected OData resources: ${resourceNames}`);
  if ((await fetch(`${origin}/api/crm?entity=leads&action=list`)).status !== 404) throw new Error('Legacy CRM action gateway must be removed');
  const filtered = await response(`/api/odata/Leads?${new URLSearchParams({ '$filter': "status eq 'new'", '$search': 'website', '$orderby': 'name asc', '$select': 'id,name,status', '$count': 'true', '$top': '1', '$skip': '0' })}`);
  if (!Array.isArray(filtered.value) || !filtered.value.length || filtered.value.some((lead: any) => lead.status !== 'new')) throw new Error('OData filter/select/order query failed');
  const grouped = await response(`/api/odata/Leads?${new URLSearchParams({ '$apply': 'groupby((status))' })}`);
  if (!Array.isArray(grouped.value) || !grouped.value.every((row: any) => Object.keys(row).length === 1 && 'status' in row)) throw new Error('OData grouping failed');
  if ((await fetch(`${origin}/api/odata/Leads?$orderby=not_a_field%20asc`)).ok) throw new Error('Invalid OData fields must be rejected');

  const created = await response('/api/odata/Leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Browser workflow lead', company: 'Core3', email: 'lead@core3.test', status: 'new', expected_revenue: 1234 }) });
  if (!created.id) throw new Error('Lead creation failed');
  const read = await response(`/api/odata/Leads('${encodeURIComponent(created.id)}')`);
  if (read.name !== 'Browser workflow lead') throw new Error('Lead read failed');
  const updated = await response(`/api/odata/Leads('${encodeURIComponent(created.id)}')`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...read, name: 'Updated workflow lead', status: 'qualified' }) });
  if (updated.name !== 'Updated workflow lead' || updated.status !== 'qualified' || Number(updated.expected_revenue) !== 1234) throw new Error('Lead update failed');
  await response(`/api/odata/Leads('${encodeURIComponent(created.id)}')`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const deleted = await response(`/api/odata/Leads('${encodeURIComponent(created.id)}')`);
  if (deleted !== null) throw new Error('Lead delete failed');

  const workflowLead = await response('/api/odata/Leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Workflow lead', company: 'Workflow Co', email: 'workflow@core3.test', status: 'new' }) });
  const stage = await response('/api/odata/Stages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'e2e-stage', name: 'E2E Stage', sequence: 35 }) });
  if (stage.id !== 'e2e-stage') throw new Error('Stage creation failed');
  const moved = await response(`/api/odata/Leads('${encodeURIComponent(workflowLead.id)}')/moveStage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'e2e-stage' }) });
  if (moved.status !== 'e2e-stage') throw new Error('Lead stage move failed');
  const duplicates = await response(`/api/odata/Leads('${encodeURIComponent(workflowLead.id)}')/duplicates`);
  if (!Array.isArray(duplicates)) throw new Error('Lead duplicate action failed');
  const conversion = await response(`/api/odata/Leads('${encodeURIComponent(workflowLead.id)}')/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_name: 'Workflow Customer' }) });
  if (!conversion.customer?.id) throw new Error('Lead conversion failed');
  const lostLead = await response('/api/odata/Leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Lost workflow lead' }) });
  const lost = await response(`/api/odata/Leads('${encodeURIComponent(lostLead.id)}')/lose`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lost_reason: 'Budget', lost_feedback: 'Budget was not approved.' }) });
  if (lost.status !== 'lost' || lost.lost_reason !== 'Budget' || lost.lost_feedback !== 'Budget was not approved.') throw new Error('Lost lead reason workflow failed');
  const invalidLost = await fetch(`${origin}/api/odata/Leads('${encodeURIComponent(lostLead.id)}')/lose`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lost_reason: 'Unknown reason' }) });
  if (invalidLost.status !== 400) throw new Error('Invalid lost reason must be rejected');
  const managerHeaders = { 'Content-Type': 'application/json', 'X-CRM-Role': 'manager' };
  await response(`/api/odata/Leads('${encodeURIComponent(workflowLead.id)}')/archive`, { method: 'POST', headers: managerHeaders, body: '{}' });
  if (await response(`/api/odata/Leads('${encodeURIComponent(workflowLead.id)}')`)) throw new Error('Lead archive failed');
  await response(`/api/odata/Leads('${encodeURIComponent(workflowLead.id)}')/restore`, { method: 'POST', headers: managerHeaders, body: '{}' });
  if (!(await response(`/api/odata/Leads('${encodeURIComponent(workflowLead.id)}')`))) throw new Error('Lead restore failed');
  const mergePrimary = await response('/api/odata/Leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Merge primary' }) });
  const mergeDuplicate = await response('/api/odata/Leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Merge duplicate' }) });
  const merged = await response(`/api/odata/Leads('${encodeURIComponent(mergePrimary.id)}')/merge`, { method: 'POST', headers: managerHeaders, body: JSON.stringify({ ids: [mergeDuplicate.id] }) });
  if (merged.primary !== mergePrimary.id || (await response(`/api/odata/Leads('${encodeURIComponent(mergeDuplicate.id)}')`))) throw new Error('Lead merge failed');

  const customer = await response('/api/odata/Customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'E2E Customer', email: 'customer@core3.test' }) });
  const changedCustomer = await response(`/api/odata/Customers('${encodeURIComponent(customer.id)}')`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...customer, phone: '+1 555 1212' }) });
  if (changedCustomer.phone !== '+1 555 1212') throw new Error('Customer update failed');
  await response(`/api/odata/Customers('${encodeURIComponent(customer.id)}')`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (await response(`/api/odata/Customers('${encodeURIComponent(customer.id)}')`)) throw new Error('Customer delete failed');

  const team = await response('/api/odata/Teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'E2E Team', quota: 42 }) });
  const changedTeam = await response(`/api/odata/Teams('${encodeURIComponent(team.id)}')`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...team, quota: 99 }) });
  if (Number(changedTeam.quota) !== 99) throw new Error('Team update failed');
  await response(`/api/odata/Teams('${encodeURIComponent(team.id)}')`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (await response(`/api/odata/Teams('${encodeURIComponent(team.id)}')`)) throw new Error('Team delete failed');

  const activity = await response('/api/odata/Activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: 'lead-001', summary: 'E2E activity', activity_type: 'call' }) });
  const completed = await response(`/api/odata/Activities('${encodeURIComponent(activity.id)}')/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (completed.done !== true) throw new Error('Activity completion failed');
  await response(`/api/odata/Activities('${encodeURIComponent(activity.id)}')`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (await response(`/api/odata/Activities('${encodeURIComponent(activity.id)}')`)) throw new Error('Activity delete failed');

  const preview = await response('/api/odata/Imports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv: 'name,company,status,expected_revenue\nImported E2E,Core3,new,5000' }) });
  if (preview.error_count !== 0 || !preview.id) throw new Error('Import preview failed');
  const committed = await response(`/api/odata/Imports('${encodeURIComponent(preview.id)}')/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (committed.state !== 'committed' || committed.imported_count !== 1) throw new Error('Import commit failed');
  const imported = await response(`/api/odata/Leads?${new URLSearchParams({ '$filter': "name eq 'Imported E2E'" })}`);
  if (imported.value?.length !== 1) throw new Error('Imported lead is unavailable');

  const message = await response('/api/odata/Messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: 'lead-001', author: 'E2E', body: 'E2E chatter message' }) });
  const follower = await response('/api/odata/Followers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: 'lead-001', name: 'E2E follower' }) });
  const attachment = await response('/api/odata/Attachments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: 'lead-001', name: 'e2e.txt', mime_type: 'text/plain', content: 'attached content' }) });
  const chatter = await response(`/api/odata/Messages?${new URLSearchParams({ '$filter': "lead_id eq 'lead-001'" })}`);
  if (!chatter.value?.some((row: any) => row.id === message.id) || !follower.id || attachment.content !== 'attached content') throw new Error('Lead collaboration resources failed');

  const catalog = await response('/api/odata/Catalogs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'tag', name: 'E2E tag', value: '#111111' }) });
  const changedCatalog = await response(`/api/odata/Catalogs('${encodeURIComponent(catalog.id)}')`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...catalog, value: '#222222' }) });
  if (changedCatalog.value !== '#222222') throw new Error('Catalog update failed');
  await response(`/api/odata/Catalogs('${encodeURIComponent(catalog.id)}')`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });

  const ui = await response('/api/ui');
  if (ui.shell?.app_name !== 'CRM' || ui.shell?.nav?.[0]?.label !== 'Sales') throw new Error('YAML Odoo shell definition is unavailable');
  const leadScreen = ui.screens?.find((screen: any) => screen.id === 'lead-form');
  if (!leadScreen?.components?.some((component: any) => component.type === 'dialog' && component.title === 'Lost Lead')
    || !leadScreen.components.some((component: any) => component.type === 'dialog' && component.title === 'Convert to Opportunity')
    || !leadScreen.components.some((component: any) => component.type === 'dialog' && component.title === 'Similar Leads' && component.records === '$data.duplicates')) throw new Error('YAML CRM action dialogs are unavailable');
  const leadsList = ui.screens?.find((screen: any) => screen.id === 'leads');
  if (!leadsList?.components?.some((component: any) => component.type === 'table' && component.group_by === '$state.group_by')
    || !leadsList.components.some((component: any) => component.type === 'kanban' && component.visible_when?.includes("ctx.state.view === 'kanban'"))) throw new Error('YAML CRM list controls are unavailable');
  browser('/', ['odoo-shell', 'CRM', 'Sales', 'My Pipeline', 'Lead management', 'Website enquiry', 'New lead', 'Search leads', 'List', 'Kanban', 'Group by stage', 'Next']);
  browser('/leads/new', ['Lead name', 'Save', 'Cancel']);
  browser('/leads/lead-001', ['Lead', 'Qualified', 'Possible duplicates', 'Move stage', 'Similar leads', 'Chatter', 'E2E chatter message', 'E2E follower', 'e2e.txt']);
  browser('/leads/lead-001/collaboration', ['Lead collaboration', 'Messages', 'Followers', 'Attachments']);
  browser('/pipeline', ['Sales pipeline', 'New', 'Qualified']);
  browser('/customers', ['Customers', 'Acme Corporation', 'New customer']);
  browser('/teams', ['Sales teams', 'North America', 'New team']);
  browser('/activities', ['Activities', 'Call about product requirements', 'New activity']);
  browser('/configuration', ['Pipeline stages', 'New stage', 'Qualified']);
  browser('/configuration/catalogs', ['Configuration catalogs', 'Hot', 'Monthly']);
  browser('/reporting', ['Pipeline reporting', 'Expected revenue', 'qualified']);
  browser('/forecast', ['Forecast', 'Open pipeline', 'Expected revenue']);
  browser('/analysis/pivot', ['Lead revenue pivot', 'Company', 'Acme Corporation']);
  browser('/calendar', ['Activity calendar', 'Call about product requirements']);
  browser('/import', ['Import leads', 'Preview import', 'Import history']);
  console.log('pass: OData CRUD/actions/query options and YAML CRM screens including import');
} finally {
  server.kill();
}
