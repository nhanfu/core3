import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { q: null, work_date: null, fixture_state: null, current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };

describe('Timesheets portal parity', () => {
  test('maps Odoo authenticated portal route and keeps page/API contracts separate', () => {
    const page = yaml('pages/portal-timesheets.yaml');
    const api = yaml('api/portal-timesheets.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(sampleRoot);
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/controllers/portal.py', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_portal_templates.xml', 'utf8');

    expect(controller).toContain("@http.route(['/my/timesheets', '/my/timesheets/page/<int:page>'], type='http', auth=\"user\", website=True)");
    expect(controller).toContain("'employee_id': {'input': 'employee_id'");
    expect(controller).toContain("'project_id': {'input': 'project_id'");
    expect(controller).toContain("'task_id': {'input': 'task_id'");
    expect(template).toContain('<t>Timesheets</t>');
    expect(template).toContain('<th>Description</th>');
    expect(template).toContain('Time Spent');
    expect(manifest.menu.groups).toContainEqual(expect.objectContaining({ id: 'portal', label: 'Portal' }));
    expect(page.page).toMatchObject({ id: 'timesheets-portal', route: '/my/timesheets', auth: { require: ['timesheets.read'] } });
    expect(api.page).toEqual({ id: 'timesheets-portal' });
    expect(page.datasources).toBeUndefined();
    expect(discovered.pages.get('timesheets-portal')?.config.page.route).toBe('/my/timesheets');
    expect(discovered.pageDatasources.get('timesheets-portal')).toEqual(['portal_timesheet_entries']);
  });

  test('returns the durable actor/company-scoped portal row and preserves it after restart', async () => {
    const path = `/tmp/timesheets-portal-${process.pid}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_restart', ['schema', 'data']);
    const source = yaml('api/portal-timesheets.yaml').datasources[0];
    const result = await repository.querySource(source, valid, 0, 100);
    const row = result.data.find((candidate: any) => candidate.id === 'timesheet-demo-001');
    expect(row).toMatchObject({
      id: 'timesheet-demo-001',
      employee_id: 'employee-demo-001',
      employee_name: 'Admin User',
      project_id: 'project-demo-001',
      task_id: 'task-demo-001',
      company_name: 'Core3 Demo Company',
      description: 'Migration work',
      time_spent_display: '08:00',
    });
    const action = yaml('api/portal-timesheets.yaml').actions[0];
    expect(action.params).toEqual({ id: '{row.id}', view_scope: 'own', portal_scope: true });
    const detail = yaml('api/entry-detail.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_detail');
    expect((await repository.querySource(detail, { id: row.id, view_scope: 'own', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' }, 0, 1)).data)
      .toMatchObject({ id: row.id, employee_name: 'Admin User', company_name: 'Core3 Demo Company' });
    first.close();

    const restarted = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(restarted);
    await migrateDatabase(reopened, migrations, undefined, 'timesheets_portal_restart', ['schema', 'data']);
    expect((await reopened.querySource(source, valid, 0, 100)).data.find((candidate: any) => candidate.id === row.id)).toMatchObject({
      employee_name: row.employee_name,
      project_id: row.project_id,
      task_id: row.task_id,
      work_date: row.work_date,
    });
    restarted.close();
  });

  test('fails closed for wrong actor, wrong company, empty fixture, and action/page permission boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_guards', ['schema', 'data']);
    const source = yaml('api/portal-timesheets.yaml').datasources[0];
    expect((await repository.querySource(source, { ...valid, current_user_name: 'Unauthorized User' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 100)).data).toEqual([]);
    expect(source.permission).toBe('timesheets.read');
    expect(yaml('pages/portal-timesheets.yaml').page.auth.require).toEqual(['timesheets.read']);
    expect(yaml('api/portal-timesheets.yaml').actions[0].permission).toBe('timesheets.read');
    database.close();
  });

  test('keeps portal fixtures deterministic and matches the Odoo read-only workflow', () => {
    const page = yaml('pages/portal-timesheets.yaml');
    const source = readFileSync(join(serviceRoot, 'api/portal-timesheets.yaml'), 'utf8');
    const labels = page.components[0].columns.map((column: any) => column.label);
    expect(labels).toEqual(['Date', 'Employee', 'Project', 'Task', 'Description', 'Time Spent']);
    expect(page.components[0].empty_state.title).toBe('There are no timesheets.');
    expect(page.components[0].row_open_action).toBe('view_portal_timesheet_entry');
    expect(source).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|RANDOM\(|gen_random_uuid|Date\.now/);
    expect(source).toContain("t.company_name = COALESCE(NULLIF(:current_company_name, ''), 'Core3 Demo Company')");
    expect(source).toContain("t.employee_name = COALESCE(NULLIF(:current_user_name, ''), 'Admin User')");
  });
});
