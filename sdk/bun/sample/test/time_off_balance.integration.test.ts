import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Balance report parity', () => {
  test('declares the manager-only read-only balance report with all display modes', () => {
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    expect(reporting.items).toContainEqual(expect.objectContaining({
      path: '/time-off-reporting/balance',
      label: 'Balance',
      permission: 'time_off.manage',
    }));

    const page = yaml('pages/balance.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.page).toMatchObject({
      id: 'time-off-balance',
      route: '/time-off-reporting/balance',
      auth: { require: ['time_off.manage'] },
    });
    expect(page.page.datasources).toBeUndefined();
    expect(list.source).toBe('time_off_balance_report');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'list', 'pivot', 'calendar']);
    expect(list.views[2].pivot.default).toMatchObject({
      rows: ['employee_name'],
      columns: ['leave_type_name'],
      measures: [
        { field: 'allocation_days', aggregate: 'sum', column: 'Allocated Days' },
        { field: 'taken_days', aggregate: 'sum', column: 'Taken Days' },
        { field: 'remaining_days', aggregate: 'sum', column: 'Remaining Days' },
      ],
    });
    expect(list.create_action).toBeUndefined();
    expect(list.row_open_action).toBeUndefined();
    expect(list.actions).toBeUndefined();
  });

  test('uses page-id API discovery, fixed 2026 balances, filters, empty and transport states', async () => {
    const api = yaml('api/balance.yaml');
    expect(api.page.id).toBe('time-off-balance');
    expect(api.datasources.every((source: any) => source.permission === 'time_off.manage')).toBe(true);
    const source = api.datasources.find((candidate: any) => candidate.id === 'time_off_balance_report');
    expect(source.pivot.fields).toContain('remaining_hours');
    expect(source.query).toContain("DATE '2026-01-01'");
    expect(source.query).toContain("DATE '2027-01-01'");
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'TIME_OFF_BALANCE_UNAVAILABLE' });

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_balance_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_balance_schema_migrations', ['schema', 'data']);

    const params = { q: null, employee_id: null, leave_type_id: null, fixture_state: null };
    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data.map((row: any) => row.employee_name + '/' + row.leave_type_name)).toEqual([
      'Admin User/Annual Leave',
      'Admin User/Sick Time Off',
      'Marc Demo/Annual Leave',
      'Mitchell Admin/Compensatory Days',
    ]);
    expect(populated.data[0]).toMatchObject({ allocation_days: 20, taken_days: 3, planned_days: 0, remaining_days: 17 });
    expect(populated.data[1]).toMatchObject({ allocation_days: 10, taken_days: 0, planned_days: 0, remaining_days: 10 });

    const searched = await repository.querySource(source, { ...params, q: 'marc' }, 0, 50);
    expect(searched.data).toHaveLength(1);
    expect(searched.data[0]).toMatchObject({ employee_name: 'Marc Demo', remaining_days: 15 });
    const employeeFiltered = await repository.querySource(source, { ...params, employee_id: 'employee-demo-003' }, 0, 50);
    expect(employeeFiltered.data).toHaveLength(1);
    expect(employeeFiltered.data[0].leave_type_name).toBe('Compensatory Days');
    expect(await repository.querySource(source, { ...params, q: 'does-not-exist' }, 0, 50)).toMatchObject({ data: [] });
    expect(await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).toMatchObject({ data: [] });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({
      status: 503,
      code: 'TIME_OFF_BALANCE_UNAVAILABLE',
    });
    expect((await repository.query("SELECT version FROM time_off_balance_schema_migrations WHERE version = '0.0.7'")).length).toBe(1);
    expect((await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'leave_balances_report_year_employee_type_idx'")).length).toBe(1);
    database.close();
  });
});
