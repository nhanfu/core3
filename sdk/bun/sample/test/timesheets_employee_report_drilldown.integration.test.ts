import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Timesheets By Employee report drilldown parity', () => {
  test('maps the Odoo analysis form state to a separate page/API row action', () => {
    const page = yaml('pages/timesheets-by-employee.yaml');
    const api = yaml('api/timesheets-by-employee.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'timesheet_report_by_employee');
    const action = api.actions.find((candidate: any) => candidate.id === 'view_employee_report_entry');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'timesheets-by-employee', route: '/timesheets-by-employee', auth: { require: ['timesheets.manage'] } });
    expect(page.components[0]).toMatchObject({
      source: 'timesheet_report_by_employee',
      row_open_action: 'view_employee_report_entry',
      row_double_click_action: 'view_employee_report_entry',
    });
    expect(api.page).toEqual({ id: 'timesheets-by-employee' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['employee_id', 'project_id', 'task_id']));
    expect(action).toMatchObject({
      type: 'navigate',
      permission: 'timesheets.manage',
      navigate_to: '/timesheets/detail',
      params: { id: '{row.id}', view_scope: 'all', report_scope: 'employee' },
    });
    expect(source.id).toBe('timesheet_report_by_employee');
  });

  test('returns persisted employee report rows and opens their detail after restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_employee_report_drilldown_restart', ['schema', 'data']);
    const report = yaml('api/timesheets-by-employee.yaml').datasources[0];
    const result = await repository.querySource(report, { q: null, fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 50);
    const row = result.data.find((candidate: any) => candidate.id === 'timesheet-demo-001');
    expect(row).toMatchObject({ employee_id: 'employee-demo-001', project_id: 'project-demo-001', task_id: 'task-demo-001', employee_name: 'Admin User' });

    const detail = yaml('api/entry-detail.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_detail');
    const detailResult = await repository.querySource(detail, {
      id: row.id,
      view_scope: 'all',
      current_user_name: 'Admin User',
      current_company_name: 'Core3 Demo Company',
    }, 0, 1);
    expect(detailResult.data).toMatchObject({ id: row.id, employee_id: row.employee_id, company_name: 'Core3 Demo Company' });

    const filePath = `/tmp/timesheets-employee-report-drilldown-${process.pid}.duckdb`;
    database.close();
    const first = await DuckDbDatabase.open(filePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, 'timesheets_employee_report_drilldown_file', ['schema', 'data']);
    expect((await firstRepository.querySource(report, { q: 'Morgan Taylor', fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toHaveLength(3);
    first.close();
    const restarted = await DuckDbDatabase.open(filePath);
    const restartedRepository = new YamlRepository(restarted);
    await migrateDatabase(restartedRepository, join(serviceRoot, 'migrations'), undefined, 'timesheets_employee_report_drilldown_file', ['schema', 'data']);
    expect((await restartedRepository.querySource(detail, {
      id: 'timesheet-demo-001',
      view_scope: 'all',
      current_user_name: 'Admin User',
      current_company_name: 'Core3 Demo Company',
    }, 0, 1)).data).toMatchObject({ id: 'timesheet-demo-001', employee_name: 'Admin User' });
    restarted.close();
  });

  test('keeps report drilldown scoped to the active company and manager permission', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_employee_report_drilldown_guards', ['schema', 'data']);
    const report = yaml('api/timesheets-by-employee.yaml').datasources[0];
    const companyRows = await repository.querySource(report, { q: null, fixture_state: null, current_company_name: 'Other Company' }, 0, 50);
    expect(companyRows.data).toEqual([]);
    const action = yaml('api/timesheets-by-employee.yaml').actions[0];
    expect(action.permission).toBe('timesheets.manage');
    expect(yaml('pages/timesheets-by-employee.yaml').page.auth.require).toEqual(['timesheets.manage']);
    database.close();
  });

  test('keeps employee report fixtures fixed and free of moving time or generated values', () => {
    const source = readFileSync(join(serviceRoot, 'api/timesheets-by-employee.yaml'), 'utf8');
    expect(source).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|RANDOM\(|gen_random_uuid|Date\.now/);
  });
});
