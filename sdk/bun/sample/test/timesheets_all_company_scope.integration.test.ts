import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const params = { q: null, state: null, work_date: null, fixture_state: null };

async function freshRepository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Timesheets All Timesheets company scope parity', () => {
  test('maps Odoo analytic-line company rules to the separate page/API pair', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const detailApi = yaml('api/all-timesheets-detail.yaml');
    const analyticSecurity = readFileSync('/home/nhanjs/projects/odoo/addons/analytic/security/analytic_security.xml', 'utf8');
    const timesheetSecurity = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/security/hr_timesheet_security.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(page.actions).toContainEqual(expect.objectContaining({ id: 'view_all_timesheet_entry', navigate_to: '/all-timesheets/detail' }));
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(api.datasources[0]).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage' });
    expect(api.datasources[0].pivot.fields).toContain('company_name');
    expect(api.datasources[0].query).toContain("t.company_name = COALESCE(NULLIF(:current_company_name, ''), 'Core3 Demo Company')");
    expect(detailApi.datasources[0].query).toContain("company_name = COALESCE(NULLIF(:current_company_name, ''), 'Core3 Demo Company')");
    expect(analyticSecurity).toContain("('company_id', 'in', company_ids)");
    expect(timesheetSecurity).toContain("('project_id', '!=', False)");
  });

  test('keeps durable all-timesheet rows inside the active company while allowing an explicit company switch', async () => {
    const { database, repository } = await freshRepository('timesheets_all_company_scope');
    const source = yaml('api/all-timesheets.yaml').datasources[0];

    await repository.run(
      "INSERT INTO timesheet_entries(id, name, employee_id, employee_name, company_name, project_id, project_name, task_id, task_name, work_date, description, hours, billable, unit_amount, state, row_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE '2026-01-15', ?, 2, TRUE, 125, 'Draft', 1, TIMESTAMP '2026-01-15 00:00:00', TIMESTAMP '2026-01-15 00:00:00')",
      ['timesheet-foreign-company-001', 'TS/FOREIGN/001', 'employee-demo-001', 'Admin User', 'Core3 Vietnam Branch', 'project-demo-001', 'Core3 Implementation', 'task-demo-001', 'Complete module migration', 'Foreign company row'],
    );

    const defaultCompany = await repository.querySource(source, params, 0, 50);
    expect(defaultCompany.data).toHaveLength(15);
    expect(defaultCompany.data.some((row: any) => row.id === 'timesheet-foreign-company-001')).toBe(false);
    expect(defaultCompany.data.every((row: any) => row.company_name === 'Core3 Demo Company')).toBe(true);

    const switchedCompany = await repository.querySource(source, { ...params, current_company_name: 'Core3 Vietnam Branch' }, 0, 50);
    expect(switchedCompany.data).toHaveLength(1);
    expect(switchedCompany.data[0]).toMatchObject({ id: 'timesheet-foreign-company-001', company_name: 'Core3 Vietnam Branch' });
    expect((await repository.querySource(source, { ...params, current_company_name: 'Unknown Company' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('preserves company scope after restart and rejects foreign edits plus stale owned writes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-company-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_company_restart', ['schema', 'data']);
    await repository.run(
      "INSERT INTO timesheet_entries(id, name, employee_id, employee_name, company_name, project_id, project_name, task_id, task_name, work_date, description, hours, billable, unit_amount, state, row_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE '2026-01-15', ?, 2, TRUE, 125, 'Draft', 1, TIMESTAMP '2026-01-15 00:00:00', TIMESTAMP '2026-01-15 00:00:00')",
      ['timesheet-foreign-company-002', 'TS/FOREIGN/002', 'employee-demo-001', 'Admin User', 'Core3 Vietnam Branch', 'project-demo-001', 'Core3 Implementation', 'task-demo-001', 'Complete module migration', 'Foreign company row'],
    );

    const edit = yaml('api/all-timesheets-detail.yaml').actions.find((action: any) => action.id === 'edit_all_timesheet_detail').mutation;
    await expect(repository.executeMutation(edit, {
      id: 'timesheet-foreign-company-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      values: { work_date: '2026-01-15', project_name: 'Core3 Implementation', description: 'Must stay private', hours: 3 },
    })).rejects.toMatchObject({ status: 403, code: 'TIMESHEETS_ALL_ENTRY_SCOPE' });

    const updated = await repository.executeMutation(edit, {
      id: 'timesheet-report-003', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      values: { work_date: '2026-01-13', project_name: 'Core3 Implementation', description: 'Company scoped update', hours: 4.5 },
    });
    expect(updated).toMatchObject({ id: 'timesheet-report-003', company_name: 'Core3 Demo Company', row_version: 2 });
    await expect(repository.executeMutation(edit, {
      id: 'timesheet-report-003', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      values: { work_date: '2026-01-13', project_name: 'Core3 Implementation', description: 'Stale update', hours: 3 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    const source = yaml('api/all-timesheets.yaml').datasources[0];
    expect((await reopened.querySource(source, params, 0, 50)).data.some((row: any) => row.id === 'timesheet-foreign-company-002')).toBe(false);
    expect((await reopened.querySource(source, { ...params, current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data[0]).toMatchObject({ id: 'timesheet-foreign-company-002' });
    expect((await reopened.query("SELECT company_name, row_version, description FROM timesheet_entries WHERE id = 'timesheet-report-003'")).at(0)).toMatchObject({ company_name: 'Core3 Demo Company', row_version: 2, description: 'Company scoped update' });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('keeps the company predicate deterministic and permission-bound', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const source = yaml('api/all-timesheets.yaml').datasources[0];
    expect(page.page.auth.require).toEqual(['timesheets.manage']);
    expect(source.permission).toBe('timesheets.manage');
    expect(source.query).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(source.query.indexOf('t.company_name =')).toBeLessThan(source.query.indexOf('ORDER BY'));
  });
});
