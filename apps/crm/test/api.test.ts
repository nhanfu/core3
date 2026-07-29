import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 3200 + Math.floor(Math.random() * 200);
const databasePath = join(mkdtempSync(join(tmpdir(), 'core3-crm-api-')), 'fixture.duckdb');
let server: ReturnType<typeof Bun.spawn>;

async function request(path: string, role = 'salesperson') {
  return fetch(`http://127.0.0.1:${port}${path}`, { headers: { 'X-CRM-Role': role } });
}

beforeAll(async () => {
  server = Bun.spawn(['bun', 'server.ts'], { cwd: join(import.meta.dir, '..'), env: { ...process.env, PORT: String(port), CRM_DB_PATH: databasePath }, stdout: 'ignore', stderr: 'pipe' });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await request('/api/modules')).ok) return; } catch {}
    await Bun.sleep(50);
  }
  throw new Error('CRM test server did not start');
});

afterAll(() => server?.kill());

describe('CRM HTTP contract', () => {
  test('exposes modules and enforces manager configuration access', async () => {
    const modules = await request('/api/modules');
    expect((await modules.json()).some((item: any) => item.id === 'inventory' && item.status === 'coming_soon')).toBe(true);
    expect((await request('/api/crm/config')).status).toBe(403);
    expect((await request('/api/crm/config', 'manager')).status).toBe(200);
    expect((await request('/api/crm/import/history')).status).toBe(403);
    expect((await request('/api/crm/import/history', 'manager')).status).toBe(200);
    const preview = await fetch(`http://127.0.0.1:${port}/api/crm/import/preview`, { method: 'POST', headers: { 'X-CRM-Role': 'salesperson', 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: [{ name: 'blocked' }] }) });
    expect(preview.status).toBe(403);
    const invalidPreview = await fetch(`http://127.0.0.1:${port}/api/crm/import/preview`, { method: 'POST', headers: { 'X-CRM-Role': 'manager', 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: [{ name: '' }] }) });
    expect(invalidPreview.status).toBe(200);
    const history = await (await request('/api/crm/import/history', 'manager')).json();
    expect(history[0]?.error_count).toBe(1);
  });

  test('scopes records and exposes report drill-downs', async () => {
    const salesperson = await (await request('/api/crm/leads')).json();
    const manager = await (await request('/api/crm/leads', 'manager')).json();
    expect(salesperson.length).toBeLessThan(manager.length);
    expect((await request('/api/crm/leads/opp-002')).status).toBe(403);
    expect((await request('/api/crm/report/drilldown?dimension=stage&value=New')).status).toBe(200);
    expect((await request('/api/crm/report/drilldown?dimension=salesperson&value=Mitchell%20Admin&secondary_dimension=stage&secondary_value=Qualified')).status).toBe(200);
    expect((await request('/api/crm/report/activity-analysis')).status).toBe(200);
    expect((await request('/api/crm/report/activity-analysis?dimension=activity_type&search=timeline')).status).toBe(200);
    expect((await request('/api/crm/report/lead-analysis?dimension=source')).status).toBe(200);
    expect((await request('/api/crm/report/lead-analysis?dimension=source&search=Website')).status).toBe(200);
    expect((await request('/api/crm/report/analysis?dimension=stage&from=2100-01-01')).status).toBe(200);
    const teamPipeline = await (await request('/api/crm/leads?team_id=team-na', 'manager')).json();
    expect(teamPipeline.every((row: any) => row.team_id === 'team-na' || row.team === 'North America')).toBe(true);
    const archive = await fetch(`http://127.0.0.1:${port}/api/crm/mutate`, { method: 'POST', headers: { 'X-CRM-Role': 'manager', 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ['opp-001'], operation: 'archive' }) });
    expect(archive.status).toBe(200);
    const archived = await (await request('/api/crm/leads?filter=archived', 'manager')).json();
    expect(archived.some((row: any) => row.id === 'opp-001')).toBe(true);
    const restore = await fetch(`http://127.0.0.1:${port}/api/crm/mutate`, { method: 'POST', headers: { 'X-CRM-Role': 'manager', 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ['opp-001'], operation: 'restore' }) });
    expect(restore.status).toBe(200);
    const assignment = await fetch(`http://127.0.0.1:${port}/api/crm/leads`, { method: 'POST', headers: { 'X-CRM-Role': 'salesperson', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'opp-004', name: 'Annual support contract', salesperson_id: 'user-marc' }) });
    expect(assignment.status).toBe(403);
  });
});
