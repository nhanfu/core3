import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees employee version detail parity', () => {
  test('maps Odoo action_open_version and keeps list/detail page and API contracts separate', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const listPage = yaml('pages/versions.yaml');
    const listApi = yaml('api/versions.yaml');
    const detailPage = yaml('pages/version-detail.yaml');
    const detailApi = yaml('api/version-detail.yaml');

    expect(source).toContain('def action_open_version(self):');
    expect(source).toContain("'context': {");
    expect(sourceViews).toContain('name="action_open_versions"');
    expect(sourceViews).toContain('widget="versions_timeline"');
    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(action(listApi, 'view_employee_version')).toMatchObject({
      type: 'navigate', permission: 'employees.read', navigate_to: '/employees/versions/detail', params: { id: '{row.id}' },
    });
    expect(action(detailApi, 'open_employee_from_version')).toMatchObject({
      type: 'navigate', permission: 'employees.read', navigate_to: '/employees/detail', params: { id: '{state.employee_version_detail.employee_id}' },
    });
    expect(listPage.components[0]).toMatchObject({ row_open_action: 'view_employee_version', row_double_click_action: 'view_employee_version' });
    expect(detailPage.components[0]).toMatchObject({ source: 'employee_version_detail', editable: false });
  });

  test('reads deterministic current, future, and archived records with company and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_version_detail');
    const detail = yaml('api/version-detail.yaml').datasources[0];

    expect(await repository.querySource(detail, { id: 'employee-version-admin-current', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({
      data: { id: 'employee-version-admin-current', employee_id: 'employee-demo-001', employee_name: 'Admin User', date_version: '2026-01-01', contract_state: 'current', status: 'Active' },
    });
    expect(await repository.querySource(detail, { id: 'employee-version-admin-future', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({
      data: { contract_state: 'future', status: 'Active' },
    });
    expect(await repository.querySource(detail, { id: 'employee-version-anh-archived', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({
      data: { employee_id: 'employee-demo-002', contract_state: 'expired', status: 'Archived' },
    });
    expect((await repository.querySource(detail, { id: 'employee-version-admin-current', current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(detail, { id: 'missing-version', current_company_name: 'Core3 Vietnam' }, 0, 1)).data).toEqual({});
    await database.close();
  });

  test('preserves the version snapshot through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-version-detail-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_version_detail_restart');
    const detail = yaml('api/version-detail.yaml').datasources[0];
    expect((await firstRepository.querySource(detail, { id: 'employee-version-admin-current', current_company_name: 'Core3 Vietnam' }, 0, 1)).data).toMatchObject({ wage: 7200, additional_note: 'Current employee record' });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_version_detail_restart');
    expect(await secondRepository.query("SELECT id, employee_id, date_version, wage, active FROM employee_versions WHERE id = 'employee-version-admin-current'"))
      .toEqual([{ id: 'employee-version-admin-current', employee_id: 'employee-demo-001', date_version: '2026-01-01T00:00:00.000Z', wage: 7200, active: true }]);
    await second.close();
    await Bun.file(databasePath).delete();
  });
});
