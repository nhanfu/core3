import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const params = { q: null, state: null, work_date: null, fixture_state: null, current_user_name: 'Admin User', view_scope: 'own' };

async function freshRepository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Timesheets My Timesheets parity slice', () => {
  test('maps the Odoo My Timesheets action to a page/API pair and complete view family', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const routes = discoverPageRoutes(discovered);
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components[0];

    expect(manifest.menu.groups.find((group: any) => group.id === 'work').items[0]).toMatchObject({ path: '/timesheets', label: 'Timesheets' });
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(api.page.id).toBe('timesheets');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_timesheet_entry', type: 'navigate' }),
    ]));
    expect(discovered.pages.get('timesheets')?.config.page.id).toBe('timesheets');
    expect(discovered.pageDatasources.get('timesheets')).toContain('timesheet_entries');
    expect(routes.find((route) => route.page === 'timesheets')?.path).toBe('/timesheets');
    expect(page.title).toBe('My Timesheets');
    expect(list.create_label).toBe('New');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'calendar', 'kanban', 'form']);
    expect(list.views.find((view: any) => view.id === 'calendar')).toMatchObject({ date_field: 'work_date' });
    expect(list.views.find((view: any) => view.id === 'list').mobile).toBe(false);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Project', 'Task', 'Date', 'Description', 'Sales Order Item', 'Time Spent', ' ']);
    expect(api.datasources[1]).toMatchObject({ id: 'timesheet_entries', permission: 'timesheets.read', error_states: { transport_error: { status: 503, code: 'TIMESHEETS_ENTRIES_UNAVAILABLE' } } });
    expect(api.actions.map((action: any) => action.id)).toEqual(expect.arrayContaining(['create_timesheet_entry', 'edit_timesheet_entry', 'delete_timesheet_entry', 'submit_timesheet_entry']));
  });

  test('keeps personal scope, deterministic date filters, display encoding, and migration idempotency', async () => {
    const { database, repository } = await freshRepository('timesheets_my_scope_migrations');
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_scope_migrations', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entries');

    const all = await repository.querySource(source, params, 0, 50);
    expect(all.meta.total).toBe(10);
    expect(all.data.every((row: any) => row.employee_name === 'Admin User')).toBe(true);
    expect(all.data[0]).toMatchObject({ id: 'timesheet-demo-001', time_spent_display: '08:00', work_date: '2026-01-15' });
    expect(all.data.find((row: any) => row.id === 'timesheet-my-009')).toMatchObject({ time_spent_display: '02:30', sales_order_item: 'Core3 Implementation (Stakeholder review)' });

    const thisWeek = await repository.querySource(source, { ...params, work_date: 'this_week' }, 0, 50);
    expect(thisWeek.data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-my-009', 'timesheet-my-010', 'timesheet-my-011']);
    const lastWeek = await repository.querySource(source, { ...params, work_date: 'last_week' }, 0, 50);
    expect(lastWeek.meta.total).toBe(6);
    expect((await repository.querySource(source, { ...params, q: 'Stakeholder' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, current_user_name: 'Morgan Taylor' }, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'timesheet-report-002', 'timesheet-report-003', 'timesheet-report-007',
    ]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE id LIKE 'timesheet-my-%'"))[0].count).toBe(7);
    database.close();
  });

  test('enforces personal CRUD and workflow-ready validation boundaries', async () => {
    const { database, repository } = await freshRepository('timesheets_my_crud_migrations');
    const create = yaml('api/entries.yaml').actions.find((action: any) => action.id === 'create_timesheet_entry').mutation;
    const update = yaml('api/entries.yaml').actions.find((action: any) => action.id === 'edit_timesheet_entry').mutation;
    const remove = yaml('api/entries.yaml').actions.find((action: any) => action.id === 'delete_timesheet_entry').mutation;

    const created = await repository.executeMutation(create, {
      id: 'timesheet-my-test',
      current_user_name: 'Admin User',
      values: { name: 'TS/2026/TEST', project_name: 'Core3 Implementation', task_name: 'Validation review', work_date: '2026-01-15', description: 'Validation review', hours: 2.25 },
    });
    expect(created).toMatchObject({ id: 'timesheet-my-test', employee_id: 'employee-demo-001', employee_name: 'Admin User', state: 'Draft' });
    await expect(repository.executeMutation(create, {
      id: 'timesheet-my-invalid',
      current_user_name: 'Admin User',
      values: { name: 'TS/2026/INVALID', project_name: 'Core3 Implementation', work_date: '2026-01-15', description: 'Too long', hours: 25 },
    })).rejects.toMatchObject({ status: 422, code: 'TIMESHEETS_ENTRY_INVALID' });

    const updated = await repository.executeMutation(update, {
      id: 'timesheet-my-009', expected_row_version: 1, current_user_name: 'Admin User',
      values: { work_date: '2026-01-15', project_name: 'Core3 Implementation', task_name: 'Stakeholder review updated', description: 'Stakeholder review updated', hours: 3.25 },
    });
    expect(updated).toMatchObject({ id: 'timesheet-my-009', hours: 3.25, row_version: 2 });
    await expect(repository.executeMutation(update, {
      id: 'timesheet-report-005', expected_row_version: 1, current_user_name: 'Admin User',
      values: { work_date: '2026-01-09', project_name: 'Delivery Enablement', description: 'Attempt approved edit', hours: 2 },
    })).rejects.toMatchObject({ status: 403, code: 'TIMESHEETS_ENTRY_SCOPE' });

    const deleted = await repository.executeMutation(remove, { id: 'timesheet-my-015', expected_row_version: 1, current_user_name: 'Admin User' });
    expect(deleted).toEqual({ id: 'timesheet-my-015', deleted: true });
    expect(await repository.query("SELECT id FROM timesheet_entries WHERE id = 'timesheet-my-015'")).toEqual([]);
    database.close();
  });
});
