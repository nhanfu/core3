import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/employees');
const odooRoot = '/home/nhanjs/projects/odoo/addons/hr';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

async function generateBadge(repository: YamlRepository): Promise<void> {
  const generate = action(yaml('api/employee-detail.yaml'), 'generate_employee_barcode');
  await repository.executeMutation(generate.mutation, {
    id: 'employee-demo-003', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User',
    current_company_name: 'Core3 Vietnam',
  });
}

describe('Employees Print Badge parity', () => {
  test('maps the Odoo report and keeps employee detail and badge page/API contracts separate', () => {
    const report = readFileSync(join(odooRoot, 'report/hr_employee_badge.xml'), 'utf8');
    const views = readFileSync(join(odooRoot, 'views/hr_employee_views.xml'), 'utf8');
    const detailPage = yaml('pages/employee-detail.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const badgePage = yaml('pages/employee-badge.yaml');
    const badgeApi = yaml('api/employee-badge.yaml');
    const printDetail = action(detailApi, 'print_employee_badge');
    const record = action(badgeApi, 'record_employee_badge_print_run');

    expect(report).toContain('id="hr_employee_print_badge"');
    expect(report).toContain('report_type">qweb-pdf');
    expect(report).toContain('t-field="employee.barcode"');
    expect(report).toContain('t-out="employee.name"');
    expect(views).toContain('name="%(hr_employee_print_badge)d"');
    expect(views).toContain('string="Print Badge"');
    expect(detailPage.page.id).toBe(detailApi.page.id);
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.components[0].header_actions).toContainEqual({
      id: 'print_employee_badge', label: 'Print Badge', variant: 'secondary', permission: 'employees.read',
      show_if: 'state.employee_detail.active === true && !!state.employee_detail.barcode',
    });
    expect(printDetail).toMatchObject({ type: 'client', permission: 'employees.read' });
    expect(printDetail.script).toContain('/api/actions/employees.records.print_badge');
    expect(printDetail.script).toContain('/employees/badge?id=');
    expect(badgePage.page.id).toBe(badgeApi.page.id);
    expect(badgePage.datasources).toBeUndefined();
    expect(badgePage.actions).toBeUndefined();
    expect(badgeApi.datasources.map((source: any) => source.id)).toEqual(['employee_badge', 'employee_badge_print_runs']);
    expect(action(badgeApi, 'print_employee_badge_document')).toMatchObject({ type: 'client', permission: 'employees.read' });
    expect(record).toMatchObject({
      type: 'server', permission: 'employees.read', action: 'employees.records.print_badge', handler: 'yaml_mutation',
    });
    expect(record.mutation.steps).toHaveLength(1);
  });

  test('records a durable badge print run with source report fields', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_print_badge_create');
    await generateBadge(repository);
    const api = yaml('api/employee-badge.yaml');
    const badge = api.datasources.find((source: any) => source.id === 'employee_badge');
    const record = action(api, 'record_employee_badge_print_run');
    const base = {
      employee_id: 'employee-demo-003', expected_row_version: 2,
      current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Vietnam',
    };

    expect(await repository.querySource(badge, { id: base.employee_id, current_company_name: base.current_company_name }, 0, 1)).toMatchObject({
      data: { id: base.employee_id, name: 'Tran Bao Long', barcode: '041000000003', print_status: 'Ready' },
    });
    expect(await repository.executeMutation(record.mutation, base)).toMatchObject({
      id: 'employee-badge-print-employee-demo-003-1', employee_id: base.employee_id,
      employee_name: 'Tran Bao Long', job_title: 'QA Specialist', company_name: 'Core3 Vietnam',
      barcode: '041000000003', report_name: 'Badge - Tran Bao Long', requested_by: 'Admin User', row_version: 1,
    });
    expect(await repository.query("SELECT employee_id, barcode, report_name, requested_by, row_version FROM employee_badge_print_runs"))
      .toEqual([{ employee_id: 'employee-demo-003', barcode: '041000000003', report_name: 'Badge - Tran Bao Long', requested_by: 'Admin User', row_version: 1 }]);
    await database.close();
  });

  test('enforces actor, company, barcode, stale, actor identity, and company identity guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_print_badge_guards');
    await generateBadge(repository);
    const record = action(yaml('api/employee-badge.yaml'), 'record_employee_badge_print_run');
    const base = {
      employee_id: 'employee-demo-003', expected_row_version: 2,
      current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Vietnam',
    };

    await expect(repository.executeMutation(record.mutation, { ...base, current_user_id: null })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_BADGE_REPORT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(record.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_BADGE_REPORT_NOT_FOUND' });
    await expect(repository.executeMutation(record.mutation, { ...base, employee_id: 'employee-demo-002', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_BADGE_REPORT_BARCODE_REQUIRED' });
    await expect(repository.executeMutation(record.mutation, { ...base, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(record.mutation, { ...base, requested_by: 'Other User' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_BADGE_REPORT_ACTOR_MISMATCH' });
    await expect(repository.executeMutation(record.mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_BADGE_REPORT_COMPANY_MISMATCH' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM employee_badge_print_runs')).toEqual([{ count: 0 }]);
    await database.close();
  });

  test('preserves report history through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-print-badge-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_print_badge_restart');
    await generateBadge(firstRepository);
    const record = action(yaml('api/employee-badge.yaml'), 'record_employee_badge_print_run');
    await firstRepository.executeMutation(record.mutation, {
      employee_id: 'employee-demo-003', expected_row_version: 2, current_user_id: 'user-admin',
      current_user_name: 'Admin User', current_company_name: 'Core3 Vietnam',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_print_badge_restart');
    const history = yaml('api/employee-badge.yaml').datasources.find((source: any) => source.id === 'employee_badge_print_runs');
    expect((await secondRepository.querySource(history, { id: 'employee-demo-003', current_company_name: 'Core3 Vietnam' }, 0, 20)).data)
      .toMatchObject([{ id: 'employee-badge-print-employee-demo-003-1', employee_id: 'employee-demo-003', employee_name: 'Tran Bao Long', barcode: '041000000003', report_name: 'Badge - Tran Bao Long', requested_by: 'Admin User', row_version: 1 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
