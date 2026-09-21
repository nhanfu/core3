import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const source = () => yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

const defaults = {
  q: null,
  active: null,
  state: null,
  department_name: null,
  coach_name: null,
  my_team: null,
  my_department: null,
  newly_hired: null,
  in_contract: null,
  out_of_contract: null,
  current_company_name: 'Core3 Vietnam',
  current_user_id: 'user-admin',
};

describe('Employees contract-status filters', () => {
  test('maps Odoo manager contract filters to the matching page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const list = api.datasources.find((entry: any) => entry.id === 'employees');

    expect(sourceView).toContain('<filter string="In Contract" name="in_contract"');
    expect(sourceView).toContain('<filter string="Out of Contract" name="out_of_contract"');
    expect(sourceView).toContain('groups="hr.group_hr_manager"');
    expect(sourceModel).toContain('is_in_contract = fields.Boolean(compute=\'_compute_is_in_contract\'');
    expect(sourceModel).toContain('return self.date_start <= date and (not self.date_end or self.date_end >= date)');
    expect(page.page.id).toBe(api.page.id);
    expect(page.components[0].filters).toContainEqual({ field: 'in_contract', label: 'In Contract', options: [{ id: 'true', label: 'In Contract' }] });
    expect(page.components[0].filters).toContainEqual({ field: 'out_of_contract', label: 'Out of Contract', options: [{ id: 'true', label: 'Out of Contract' }] });
    expect(list.permission).toBe('employees.read');
    expect(list.query).toContain('AS in_contract');
    expect(list.query).toContain('AS out_of_contract');
    expect(list.query).toContain(':in_contract');
    expect(list.query).toContain(':out_of_contract');
  });

  test('returns only current-company employees in or out of contract at the seeded date', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_contract_filters');

    const inContract = await repository.querySource(source(), { ...defaults, in_contract: 'true' }, 0, 50);
    expect(inContract.data.map((row: any) => row.id)).toEqual(['employee-demo-001', 'employee-demo-003']);
    expect(inContract.data.every((row: any) => row.in_contract === true && row.out_of_contract === false)).toBe(true);

    const outOfContract = await repository.querySource(source(), { ...defaults, out_of_contract: 'true' }, 0, 50);
    expect(outOfContract.data.map((row: any) => row.id)).toEqual(['employee-demo-002']);
    expect(outOfContract.data.every((row: any) => row.out_of_contract === true && row.in_contract === false)).toBe(true);

    const archivedOutOfContract = await repository.querySource(source(), { ...defaults, active: 'false', out_of_contract: 'true' }, 0, 50);
    expect(archivedOutOfContract.data.map((row: any) => row.id)).toEqual(['employee-demo-004']);

    const foreignCompany = await repository.querySource(source(), { ...defaults, current_company_name: 'Other Company', in_contract: 'true' }, 0, 50);
    expect(foreignCompany.data).toEqual([]);
    await database.close();
  });

  test('preserves contract filter projections through migration replay and file-backed restart', { timeout: 15000 }, async () => {
    const databasePath = `/tmp/core3-employees-contract-filters-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_contract_filters_restart');
    expect(await firstRepository.query("SELECT COUNT(*) AS count FROM duckdb_indexes() WHERE index_name = 'employees_contract_filter_idx'")).toEqual([{ count: 1 }]);
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_contract_filters_restart');
    const rows = await secondRepository.querySource(source(), { ...defaults, out_of_contract: 'true' }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['employee-demo-002']);
    expect(await secondRepository.query("SELECT contract_end FROM employees WHERE id = 'employee-demo-002'")).toEqual([{ contract_end: '2025-12-31T00:00:00.000Z' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
