import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Summary report action parity', () => {
  test('keeps the Odoo employee Print action contract in the page-id API seam', () => {
    const discovered = discoverPages(join(root, '..'));
    const page = yaml('pages/report-by-employee.yaml');
    const api = yaml('api/report-by-employee.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'print_time_off_summary');

    expect(page.page).toMatchObject({ id: 'time-off-report-by-employee', route: '/time-off-reporting/by-employee' });
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get(page.page.id)).toEqual(expect.arrayContaining(['time_off_employee_report', 'time_off_summary_types']));
    expect(list.header_actions).toContainEqual(expect.objectContaining({ id: 'print_time_off_summary', label: 'Time Off Summary' }));
    expect(list.columns.find((column: any) => column.field === 'actions').actions).toContainEqual(expect.objectContaining({ id: 'print_time_off_summary', label: 'Time Off Summary' }));
    expect(action).toMatchObject({
      type: 'server_form', title: 'Time Off Summary', permission: 'time_off.read',
      submit_label: 'Print', cancel_label: 'Cancel', modal_style: 'time_off_summary', handler: 'yaml_mutation', operation: 'create',
    });
    expect(action.prefill).toMatchObject({ employee_id: '{row.employee_id}', employee_name: '{row.employee_name}', date_from: '2026-09-01' });
    expect(action.fields.map((field: any) => field.label)).toEqual(['Employee', 'Employee', 'From', 'Select Time Off Type']);
    expect(action.mutation).toMatchObject({ operation: 'insert', table: 'time_off_summary_runs' });
    expect(action.mutation.guards.map((guard: any) => guard.status)).toEqual([404, 422, 422]);
  });

  test('uses fixed employee/request fixtures and records valid report runs', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_summary_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_summary_schema_migrations', ['schema', 'data']);
    const api = yaml('api/report-by-employee.yaml');
    const report = api.datasources.find((source: any) => source.id === 'time_off_employee_report');
    const action = api.actions.find((candidate: any) => candidate.id === 'print_time_off_summary');

    const rows = await repository.querySource(report, { q: null, state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.employee_name)).toEqual(['Admin User', 'Admin User', 'Marc Demo']);
    expect(rows.data[0]).toMatchObject({ employee_id: 'employee-demo-001', leave_type_name: 'Sick Time Off' });
    expect(await repository.querySource(api.datasources.find((source: any) => source.id === 'time_off_summary_types'), {}, 0, 10)).toEqual({
      data: [
        { value: 'Approved', label: 'Approved' },
        { value: 'Confirmed', label: 'Confirmed' },
        { value: 'both', label: 'Both Approved and Confirmed' },
      ],
      meta: { total: 3, page: 1, pageSize: 10, pages: 1 },
    });

    const created = await repository.executeMutation(action.mutation, {
      values: { employee_id: 'employee-demo-002', employee_name: 'Marc Demo', date_from: '2026-09-01', holiday_type: 'Approved' },
    });
    expect(created).toMatchObject({ employee_id: 'employee-demo-002', employee_name: 'Marc Demo', date_from: '2026-09-01T00:00:00.000Z', holiday_type: 'Approved' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM time_off_summary_runs"))[0].count).toBe(1);
    database.close();
  });

  test('enforces the read-bound action and deterministic validation boundary', async () => {
    const action = yaml('api/report-by-employee.yaml').actions.find((candidate: any) => candidate.id === 'print_time_off_summary');
    expect(action.permission).toBe('time_off.read');
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404, code: 'TIME_OFF_SUMMARY_EMPLOYEE_NOT_FOUND' }),
      expect.objectContaining({ status: 422, code: 'TIME_OFF_SUMMARY_DATE_INVALID' }),
      expect.objectContaining({ status: 422, code: 'TIME_OFF_SUMMARY_TYPE_INVALID' }),
    ]));
  });
});
