import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
describe('Employees Employee Records bounded parity', () => {
  test('maps Odoo action, fields, modes, filters, and permission', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_version_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/hr/security/ir.model.access.csv', 'utf8');
    expect(source).toContain('id="action_hr_version"'); expect(source).toContain('<field name="path">versions</field>'); expect(source).toContain('<field name="view_mode">list,graph,pivot</field>');
    expect(source).toContain('name="running_contract"'); expect(source).toContain('name="expired_contracts"'); expect(source).toContain('name="future_contracts"'); expect(source).toContain('<field name="name">hr.version.list</field>');
    expect(access).toContain('access_hr_version_user,hr.version.user,model_hr_version,group_hr_user,1,1,1,1');
    const page = yaml('pages/versions.yaml'); const api = yaml('api/versions.yaml');
    expect(page.page).toMatchObject({ id: 'employee-versions', route: '/employees/versions' }); expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'graph', 'pivot']); expect(api.page.id).toBe(page.page.id); expect(page.components[0].datasources).toBeUndefined(); expect(api.datasources[0].permission).toBe('employees.read');
  });
  test('seeds deterministic relation-backed records and report states idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:'); const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_versions_acceptance', ['schema', 'data']); await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_versions_acceptance', ['schema', 'data']);
    const source = yaml('api/versions.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, active: null, contract_state: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['employee-version-admin-future', 'employee-version-admin-current', 'employee-version-anh-expired', 'employee-version-anh-archived']);
    expect((await repository.querySource(source, { q: null, active: null, contract_state: 'future', fixture_state: null }, 0, 50)).data).toMatchObject([{ employee_name: 'Admin User', contract_state: 'future' }]); expect((await repository.querySource(source, { q: null, active: 'true', contract_state: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]); await expect(repository.querySource(source, { q: null, active: null, contract_state: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_VERSIONS_UNAVAILABLE' }); await database.close();
  });
});
