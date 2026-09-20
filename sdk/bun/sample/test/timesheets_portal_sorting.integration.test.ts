import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { q: null, work_date: null, sortby: null, fixture_state: null, current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };

describe('Timesheets portal sorting parity', () => {
  test('maps Odoo portal sorting to the separate page/API pair', () => {
    const page = yaml('pages/portal-timesheets.yaml');
    const api = yaml('api/portal-timesheets.yaml');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/controllers/portal.py', 'utf8');
    const sortFilter = page.components[0].filters.find((filter: any) => filter.field === 'sortby');
    const source = api.datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');

    expect(controller).toContain("'date desc': {'label': _('Newest')");
    expect(controller).toContain("'employee_id': {'label': _('Employee')");
    expect(controller).toContain("'project_id': {'label': _('Project')");
    expect(controller).toContain("'task_id': {'label': _('Task')");
    expect(controller).toContain("'name': {'label': _('Description')");
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets-portal' });
    expect(api.datasources.map((candidate: any) => candidate.id)).toContain('portal_timesheet_entries');
    expect(sortFilter.options).toEqual([
      { id: 'date_desc', label: 'Newest' },
      { id: 'employee', label: 'Employee' },
      { id: 'project', label: 'Project' },
      { id: 'task', label: 'Task' },
      { id: 'description', label: 'Description' },
    ]);
    expect(source).toMatchObject({ id: 'portal_timesheet_entries', permission: 'timesheets.read' });
    expect(source.query).toContain("COALESCE(:sortby, 'date_desc') = 'project'");
    expect(source.query).toContain("COALESCE(:sortby, 'date_desc') = 'description'");
  });

  test('orders durable portal rows by date, project, task, and description deterministically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_sorting', ['schema', 'data']);
    const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
    const dateRows = (await repository.querySource(source, { ...valid, sortby: 'date_desc' }, 0, 100)).data;
    const projectRows = (await repository.querySource(source, { ...valid, sortby: 'project' }, 0, 100)).data;
    const taskRows = (await repository.querySource(source, { ...valid, sortby: 'task' }, 0, 100)).data;
    const descriptionRows = (await repository.querySource(source, { ...valid, sortby: 'description' }, 0, 100)).data;
    const byField = (field: string) => (left: any, right: any) => String(left[field] || '').localeCompare(String(right[field] || '')) || String(left.id).localeCompare(String(right.id));

    expect(dateRows[0]).toMatchObject({ id: 'timesheet-demo-001', work_date: '2026-01-15' });
    expect(projectRows.map((row: any) => row.id)).toEqual([...projectRows].sort(byField('project_name')).map((row: any) => row.id));
    expect(taskRows.map((row: any) => row.id)).toEqual([...taskRows].sort(byField('task_name')).map((row: any) => row.id));
    expect(descriptionRows.map((row: any) => row.id)).toEqual([...descriptionRows].sort(byField('description')).map((row: any) => row.id));
    expect((await repository.querySource(source, { ...valid, sortby: 'project', work_date: 'this_month' }, 0, 100)).data.map((row: any) => row.id)).toEqual(projectRows.map((row: any) => row.id));
    database.close();
  });

  test('preserves sorted portal reads after restart and retains permission/company/stale guards', async () => {
    const path = `/tmp/timesheets-portal-sorting-${process.pid}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_sorting_restart', ['schema', 'data']);
    const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
    const sorted = await repository.querySource(source, { ...valid, sortby: 'description' }, 0, 100);
    expect(sorted.data).toHaveLength(10);
    expect((await repository.querySource(source, { ...valid, sortby: 'project', current_user_name: 'Unauthorized User' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, sortby: 'task', current_company_name: 'Other Company' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, sortby: 'employee', fixture_state: 'empty' }, 0, 100)).data).toEqual([]);
    first.close();

    const restarted = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(restarted);
    await migrateDatabase(reopened, migrations, undefined, 'timesheets_portal_sorting_restart', ['schema', 'data']);
    expect((await reopened.querySource(source, { ...valid, sortby: 'description' }, 0, 100)).data.map((row: any) => row.id)).toEqual(sorted.data.map((row: any) => row.id));
    const update = yaml('api/entry-detail.yaml').actions.find((action: any) => action.id === 'edit_timesheet_detail').mutation;
    await expect(reopened.executeMutation(update, {
      id: 'timesheet-my-009', expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
      values: { work_date: '2026-01-15', project_name: 'Core3 Implementation', description: 'Stale portal sorting edit', hours: 2 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    restarted.close();
  });

  test('keeps portal sorting read-scoped and free of moving values', () => {
    const page = yaml('pages/portal-timesheets.yaml');
    const api = yaml('api/portal-timesheets.yaml');
    expect(page.page.auth.require).toEqual(['timesheets.read']);
    expect(api.datasources[0].permission).toBe('timesheets.read');
    expect(api.actions[0].permission).toBe('timesheets.read');
    expect(readFileSync(join(serviceRoot, 'api/portal-timesheets.yaml'), 'utf8')).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|RANDOM\(|gen_random_uuid|Date\.now/);
  });
});
