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

describe('Employees Load Sample Data parity', () => {
  test('maps Odoo empty-state server action and keeps page/API contracts separate', () => {
    const views = readFileSync(join(odooRoot, 'views/hr_employee_views.xml'), 'utf8');
    const model = readFileSync(join(odooRoot, 'models/hr_employee.py'), 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const load = action(api, 'load_sample_employee_data');

    expect(views).toContain('action_hr_employee_load_demo_data');
    expect(views).toContain('Load sample data.');
    expect(model).toContain('def _load_demo_data(self):');
    expect(model).toContain("filename='data/scenarios/hr_scenario.xml'");
    expect(page.page.id).toBe(api.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual({
      id: 'load_sample_employee_data', label: 'Load Sample Data', permission: 'employees.write', variant: 'secondary',
    });
    expect(page.components[0].empty_state).toMatchObject({ title: 'Ready to start your experience?', description: 'Load sample data to explore Employees' });
    expect(api.datasources.find((source: any) => source.id === 'employee_sample_load_runs')).toMatchObject({ permission: 'employees.read' });
    expect(load).toMatchObject({ type: 'server', permission: 'employees.write', action: 'employees.records.load_sample_data', handler: 'yaml_mutation', operation: 'create' });
    expect(load.mutation.steps).toHaveLength(4);
  });

  test('loads deterministic employees only for an authenticated empty company and is idempotency guarded', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_sample_load_create');
    const load = action(yaml('api/employees.yaml'), 'load_sample_employee_data');
    const base = { current_user_id: 'user-sample-admin', current_user_name: 'Sample Admin', current_company_name: 'Core3 Sample Company' };

    await expect(repository.executeMutation(load.mutation, { ...base, current_user_id: null })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_SAMPLE_DATA_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(load.mutation, { ...base, current_company_name: null })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_SAMPLE_DATA_COMPANY_REQUIRED' });
    expect(await repository.executeMutation(load.mutation, base)).toMatchObject({
      id: 'employee-sample-core3-sample-company-load', company_name: 'Core3 Sample Company', requested_by: 'Sample Admin', employee_count: 3, row_version: 1,
    });
    expect(await repository.query("SELECT employee_number, name, department_name, company_name, active FROM employees WHERE company_name = 'Core3 Sample Company' ORDER BY employee_number")).toEqual([
      { employee_number: 'SAMPLE-CORE3-SAMPLE-COMPANY-001', name: 'Michael Williams', department_name: 'Management - Core3 Sample Company', company_name: 'Core3 Sample Company', active: true },
      { employee_number: 'SAMPLE-CORE3-SAMPLE-COMPANY-002', name: 'Emma Granger', department_name: 'Research & Development - Core3 Sample Company', company_name: 'Core3 Sample Company', active: true },
      { employee_number: 'SAMPLE-CORE3-SAMPLE-COMPANY-003', name: 'Simon Jones', department_name: 'Research & Development - Core3 Sample Company', company_name: 'Core3 Sample Company', active: true },
    ]);
    await expect(repository.executeMutation(load.mutation, base)).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_SAMPLE_DATA_ALREADY_LOADED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_sample_load_runs WHERE company_name = 'Core3 Sample Company'")).toEqual([{ count: 1 }]);
    expect(await repository.executeMutation(load.mutation, { ...base, current_company_name: 'Core3 Other Sample Company' })).toMatchObject({
      id: 'employee-sample-core3-other-sample-company-load', company_name: 'Core3 Other Sample Company', employee_count: 3,
    });
    expect(await repository.query("SELECT DISTINCT d.company_name FROM employees e JOIN employee_departments d ON d.id = e.department_id WHERE e.company_name = 'Core3 Other Sample Company'")).toEqual([{ company_name: 'Core3 Other Sample Company' }]);
    await database.close();
  });

  test('preserves the sample load and audit row through migration replay and DuckDB restart', async () => {
    const databasePath = `/tmp/core3-employees-sample-load-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_sample_load_restart');
    const load = action(yaml('api/employees.yaml'), 'load_sample_employee_data');
    await firstRepository.executeMutation(load.mutation, { current_user_id: 'user-sample-admin', current_user_name: 'Sample Admin', current_company_name: 'Core3 Restart Company' });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_sample_load_restart');
    const history = yaml('api/employees.yaml').datasources.find((source: any) => source.id === 'employee_sample_load_runs');
    expect((await secondRepository.querySource(history, { current_company_name: 'Core3 Restart Company' }, 0, 20)).data).toMatchObject([
      { id: 'employee-sample-core3-restart-company-load', company_name: 'Core3 Restart Company', requested_by: 'Sample Admin', employee_count: 3, row_version: 1 },
    ]);
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employees WHERE company_name = 'Core3 Restart Company' AND active = true")).toEqual([{ count: 3 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
