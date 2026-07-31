import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const port = 3400 + Math.floor(Math.random() * 300);
const databasePath = join(mkdtempSync(join(tmpdir(), 'core3-crm-browser-')), 'fixture.duckdb');
const origin = `http://127.0.0.1:${port}`;
const server = Bun.spawn(['bun', '../server.ts'], {
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
  if (resourceNames !== 'Customers,Leads,Teams') throw new Error(`Unexpected OData resources: ${resourceNames}`);
  if ((await fetch(`${origin}/api/crm?entity=leads&action=list`)).status !== 404) throw new Error('Legacy CRM action gateway must be removed');
  const filtered = await response(`/api/odata/Leads?${new URLSearchParams({ '$filter': "status eq 'new'", '$search': 'website', '$orderby': 'name asc', '$select': 'id,name,status', '$count': 'true', '$top': '1', '$skip': '0' })}`);
  if (!Array.isArray(filtered.value) || !filtered.value.length || filtered.value.some((lead: any) => lead.status !== 'new')) throw new Error('OData filter/select/order query failed');
  const grouped = await response(`/api/odata/Leads?${new URLSearchParams({ '$apply': 'groupby((status))' })}`);
  if (!Array.isArray(grouped.value) || !grouped.value.every((row: any) => Object.keys(row).length === 1 && 'status' in row)) throw new Error('OData grouping failed');
  if ((await fetch(`${origin}/api/odata/Leads?$orderby=not_a_field%20asc`)).ok) throw new Error('Invalid OData fields must be rejected');

  const created = await response('/api/odata/Leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Browser workflow lead', company: 'Core3', email: 'lead@core3.test', status: 'new' }) });
  if (!created.id) throw new Error('Lead creation failed');
  const read = await response(`/api/odata/Leads('${encodeURIComponent(created.id)}')`);
  if (read.name !== 'Browser workflow lead') throw new Error('Lead read failed');
  const updated = await response(`/api/odata/Leads('${encodeURIComponent(created.id)}')`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...read, name: 'Updated workflow lead', status: 'qualified' }) });
  if (updated.name !== 'Updated workflow lead' || updated.status !== 'qualified') throw new Error('Lead update failed');
  await response(`/api/odata/Leads('${encodeURIComponent(created.id)}')`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const deleted = await response(`/api/odata/Leads('${encodeURIComponent(created.id)}')`);
  if (deleted !== null) throw new Error('Lead delete failed');

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

  browser('/', ['Lead management', 'Website enquiry', 'New lead', 'Search leads']);
  browser('/leads/new', ['Lead name', 'Save', 'Cancel']);
  browser('/customers', ['Customers', 'Acme Corporation', 'New customer']);
  browser('/teams', ['Sales teams', 'North America', 'New team']);
  console.log('pass: OData CRUD/query options and YAML lead/customer/team screens');
} finally {
  server.kill();
}
