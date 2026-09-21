import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const migrations = join(serviceRoot, 'migrations');
const valid = { q: null, department_id: null, fixture_state: null, current_company_name: 'Core3 Demo Company' };

describe('Timesheets Department report context parity', () => {
  test('maps the Odoo Department Kanban action to a paired By Employee filter', () => {
    const page = yaml('pages/timesheets-by-employee.yaml');
    const api = yaml('api/timesheets-by-employee.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const report = api.datasources.find((item: any) => item.id === 'timesheet_report_by_employee');
    const departments = api.datasources.find((item: any) => item.id === 'timesheet_report_departments');
    const odooDepartmentView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_department_views.xml', 'utf8');
    const odooReportView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/hr_timesheet_report_view.xml', 'utf8');

    expect(odooDepartmentView).toContain('act_hr_timesheet_report');
    expect(odooDepartmentView).toContain('search_default_department_id');
    expect(odooDepartmentView).toContain('default_department_id');
    expect(odooReportView).toContain('<field name="path">timesheets-by-employee</field>');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'timesheets-by-employee', route: '/timesheets-by-employee', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'timesheets-by-employee' });
    expect(list.filters).toContainEqual({ field: 'department_id', label: 'Department', options_source: 'timesheet_report_departments' });
    expect(departments).toMatchObject({ id: 'timesheet_report_departments', permission: 'timesheets.manage' });
    expect(report).toMatchObject({ id: 'timesheet_report_by_employee', permission: 'timesheets.manage' });
    expect(report.pivot.fields).toEqual(expect.arrayContaining(['department_id', 'department_name']));
    expect(String(report.query)).toContain('JOIN timesheet_employees e');
    expect(String(report.query)).toContain('e.department_id = :department_id');
    expect(String(report.query)).toContain('e.company_name = COALESCE');
  });

  test('returns deterministic department options and filters persisted report rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_department_report_context', ['schema', 'data']);
    const api = yaml('api/timesheets-by-employee.yaml');
    const departments = api.datasources.find((item: any) => item.id === 'timesheet_report_departments');
    const report = api.datasources.find((item: any) => item.id === 'timesheet_report_by_employee');

    const options = await repository.querySource(departments, { current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(options.data).toEqual(expect.arrayContaining([
      { value: 'department-demo-engineering', label: 'Engineering' },
      { value: 'department-demo-delivery', label: 'Delivery' },
    ]));
    const engineering = await repository.querySource(report, { ...valid, department_id: 'department-demo-engineering' }, 0, 50);
    expect(engineering.data.length).toBeGreaterThan(0);
    expect(engineering.data.every((row: any) => row.department_id === 'department-demo-engineering' && row.department_name === 'Engineering')).toBe(true);
    expect((await repository.querySource(report, { ...valid, department_id: 'department-demo-delivery' }, 0, 50)).data.every((row: any) => row.department_name === 'Delivery')).toBe(true);
    expect((await repository.querySource(report, { ...valid, department_id: 'missing-department' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(report, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces the manager permission and current-company boundary after relation changes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_department_report_guards', ['schema', 'data']);
    const page = yaml('pages/timesheets-by-employee.yaml');
    const api = yaml('api/timesheets-by-employee.yaml');
    const report = api.datasources.find((item: any) => item.id === 'timesheet_report_by_employee');
    expect(page.page.auth.require).toEqual(['timesheets.manage']);
    expect(report.permission).toBe('timesheets.manage');
    expect((await repository.querySource(report, { ...valid, current_company_name: 'Other Company', department_id: 'department-demo-engineering' }, 0, 50)).data).toEqual([]);

    await repository.run("UPDATE timesheet_employees SET department_id = 'department-wave31', department_name = 'Wave 31' WHERE id = 'employee-demo-001'");
    const refreshed = await repository.querySource(report, { ...valid, department_id: 'department-wave31' }, 0, 50);
    expect(refreshed.data.length).toBeGreaterThan(0);
    expect(refreshed.data.every((row: any) => row.department_name === 'Wave 31')).toBe(true);
    expect((await repository.querySource(report, { ...valid, department_id: 'department-demo-engineering' }, 0, 50)).data.every((row: any) => row.employee_id !== 'employee-demo-001')).toBe(true);
    database.close();
  });

  test('preserves department options and filtered report rows through replay and restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-department-report-'));
    const path = join(directory, 'timesheets.duckdb');
    const report = yaml('api/timesheets-by-employee.yaml').datasources.find((item: any) => item.id === 'timesheet_report_by_employee');
    const departments = yaml('api/timesheets-by-employee.yaml').datasources.find((item: any) => item.id === 'timesheet_report_departments');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_department_report_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_department_report_restart', ['schema', 'data']);
      expect((await repository.querySource(departments, { current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual(expect.arrayContaining([{ value: 'department-demo-engineering', label: 'Engineering' }]));
      expect((await repository.querySource(report, { ...valid, department_id: 'department-demo-engineering' }, 0, 50)).data.length).toBeGreaterThan(0);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_department_report_restart', ['schema', 'data']);
      const rows = await reopened.querySource(report, { ...valid, department_id: 'department-demo-delivery' }, 0, 50);
      expect(rows.data.length).toBeGreaterThan(0);
      expect(rows.data.every((row: any) => row.department_id === 'department-demo-delivery')).toBe(true);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
