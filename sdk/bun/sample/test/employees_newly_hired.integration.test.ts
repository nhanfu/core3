import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees Newly Hired filter parity', () => {
  test('maps Odoo computed newly_hired search behavior to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'employees');
    expect(sourceModel).toContain("newly_hired = fields.Boolean('Newly Hired', compute='_compute_newly_hired', search='_search_newly_hired')");
    expect(sourceModel).toContain("new_hire_date = fields.Datetime.now() - timedelta(days=90)");
    expect(sourceView).toContain('name="newly_hired" string="Newly Hired"');
    expect(page.page.id).toBe('employees');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].filters).toContainEqual({ field: 'newly_hired', label: 'Hiring', options: [{ id: 'true', label: 'Newly Hired' }] });
    expect(source.query).toContain('AS newly_hired');
    expect(source.query).toContain(':newly_hired');
  });

  test('returns only the deterministic newly hired projection in the current company', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_newly_hired_filter');
    const source = yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');
    const defaults = { q: null, active: null, state: null, department_name: null, coach_name: null, newly_hired: 'true', current_company_name: 'Core3 Vietnam' };
    const filtered = await repository.querySource(source, defaults, 0, 50);
    expect(filtered.data.map((row: any) => row.id)).toEqual(['employee-demo-003']);
    expect(filtered.data[0]).toMatchObject({ newly_hired: true, company_name: 'Core3 Vietnam' });
    const all = await repository.querySource(source, { ...defaults, newly_hired: null }, 0, 50);
    expect(all.data.filter((row: any) => row.newly_hired).map((row: any) => row.id)).toEqual(['employee-demo-003']);
    await database.close();
  });

  test('enforces read permission and deterministic empty results', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_newly_hired_filter_guards');
    const source = yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');
    expect(source.permission).toBe('employees.read');
    const empty = await repository.querySource(source, { q: null, active: null, state: null, department_name: null, coach_name: null, newly_hired: 'true', current_company_name: 'Other Company' }, 0, 50);
    expect(empty.data).toEqual([]);
    await database.close();
  });

  test('preserves the creation-time projection through migration replay and restart', { timeout: 15000 }, async () => {
    const databasePath = `/tmp/core3-employees-newly-hired-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_newly_hired_restart');
    expect(await firstRepository.query("SELECT CAST(created_at AS VARCHAR) AS created_at FROM employees WHERE id = 'employee-demo-003'"))
      .toEqual([{ created_at: '2026-01-05 09:00:00' }]);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_newly_hired_restart');
    const source = yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');
    const rows = await secondRepository.querySource(source, { q: null, active: null, state: null, department_name: null, coach_name: null, newly_hired: 'true', current_company_name: 'Core3 Vietnam' }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['employee-demo-003']);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
