import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Analysis report action', () => {
  test('matches Odoo hr_leave_report_action and keeps the page/API contract separate', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const list = page.components[0];
    const report = api.datasources.find((source: any) => source.id === 'time_off_analysis_report');

    expect(page.page).toMatchObject({ id: 'time-off-analysis', route: '/time-off-analysis' });
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: 'time_off_analysis_report', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(list.views[0]).toMatchObject({ category_field: 'employee_name', series_field: 'leave_type', measure_field: 'number_of_days' });
    expect(list.views[1].pivot.default).toEqual({
      rows: ['employee_name', 'leave_type_name'],
      columns: ['month'],
      measures: [
        { field: 'number_of_days', aggregate: 'sum', column: 'Number of Days' },
        { field: 'number_of_hours', aggregate: 'sum', column: 'Number of Hours' },
      ],
    });
    expect(report.permission).toBe('time_off.read');
    expect(report.pivot.fields).toEqual(expect.arrayContaining(['employee_name', 'leave_type', 'month', 'number_of_days', 'number_of_hours', 'department_name']));
    expect(report.error_states.transport_error).toMatchObject({ status: 503, code: 'TIME_OFF_ANALYSIS_UNAVAILABLE' });
  });

  test('unifies durable allocations and leave requests with Odoo signed measures and filters', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE leave_requests(
      id VARCHAR, name VARCHAR, employee_id VARCHAR, employee_name VARCHAR,
      leave_type_id VARCHAR, leave_type_name VARCHAR, date_from DATE, date_to DATE,
      days DECIMAL(18,3), reason VARCHAR, state VARCHAR,
      department_name VARCHAR, company_name VARCHAR
    );`);
    await repository.run(`CREATE TABLE leave_allocations(
      id VARCHAR, name VARCHAR, employee_id VARCHAR, employee_name VARCHAR,
      leave_type_id VARCHAR, leave_type_name VARCHAR, days DECIMAL(18,3),
      date_from DATE, date_to DATE, state VARCHAR, department_name VARCHAR, company_name VARCHAR
    );`);
    await repository.run("INSERT INTO leave_requests VALUES ('request-1', 'Annual request', 'employee-1', 'Admin User', 'annual', 'Annual Leave', '2026-02-03', '2026-02-04', 2, 'Vacation', 'Approved', 'Administration', 'Core3 Demo Company'), ('request-2', 'Sick request', 'employee-2', 'Marc Demo', 'sick', 'Sick Time Off', '2026-03-10', '2026-03-10', 1, 'Appointment', 'Submitted', 'Engineering', 'Core3 Demo Company')");
    await repository.run("INSERT INTO leave_allocations VALUES ('allocation-1', 'Annual allocation', 'employee-1', 'Admin User', 'annual', 'Annual Leave', 20, '2026-01-01', '2026-12-31', 'Approved', 'Administration', 'Core3 Demo Company')");

    const report = yaml('api/analysis.yaml').datasources.find((source: any) => source.id === 'time_off_analysis_report');
    const rows = await repository.querySource(report, { q: null, state: null, leave_type: null, employee_name: null, department_name: null, date_from: null, date_to: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => ({ leave_type: row.leave_type, number_of_days: row.number_of_days, month: row.month }))).toEqual([
      { leave_type: 'Time Off', number_of_days: -1, month: '2026-03' },
      { leave_type: 'Time Off', number_of_days: -2, month: '2026-02' },
      { leave_type: 'Allocation', number_of_days: 20, month: '2026-01' },
    ]);
    const approved = await repository.querySource(report, { q: null, state: 'Approved', leave_type: 'Time Off', employee_name: 'Admin User', department_name: 'Administration', date_from: '2026-01-01', date_to: '2026-12-31', fixture_state: null }, 0, 50);
    expect(approved.data).toHaveLength(1);
    expect(approved.data[0]).toMatchObject({ employee_name: 'Admin User', leave_type: 'Time Off', number_of_days: -2, number_of_hours: -15.2, state: 'Approved' });
    expect((await repository.querySource(report, { q: null, state: null, leave_type: null, employee_name: null, department_name: null, date_from: null, date_to: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('replays the report schema migration idempotently and leaves durable indexes available', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_analysis_test_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_analysis_test_schema_migrations', ['schema', 'data']);

    expect((await repository.query("SELECT version FROM time_off_analysis_test_schema_migrations WHERE version = '0.0.25'")).length).toBe(1);
    expect((await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name IN ('leave_requests_analysis_idx', 'leave_allocations_analysis_idx') ORDER BY index_name"))).toEqual([
      { index_name: 'leave_allocations_analysis_idx' },
      { index_name: 'leave_requests_analysis_idx' },
    ]);
    expect((await repository.query("SELECT department_name, company_name FROM leave_requests WHERE id = 'leave-request-demo-001'")).at(0)).toMatchObject({ department_name: 'Administration', company_name: 'Core3 Demo Company' });
    database.close();
  });
});
