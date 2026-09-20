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

describe('Employees badge ID generation parity', () => {
  test('maps Odoo Generate source and keeps page/API contracts separate', () => {
    const source = readFileSync(join(odooRoot, 'models/hr_employee.py'), 'utf8');
    const views = readFileSync(join(odooRoot, 'views/hr_employee_views.xml'), 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const generate = action(api, 'generate_employee_barcode');

    expect(source).toContain('def generate_random_barcode');
    expect(source).toContain("employee.barcode = '041'");
    expect(source).toContain("unique (barcode)");
    expect(views).toContain('name="generate_random_barcode"');
    expect(views).toContain('string="Generate"');
    expect(page.page.id).toBe(api.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual({
      id: 'generate_employee_barcode', label: 'Generate Badge ID', variant: 'secondary', permission: 'employees.write',
      show_if: 'state.employee_detail.active === true && !state.employee_detail.barcode',
    });
    expect(generate).toMatchObject({
      type: 'server', permission: 'employees.write', action: 'employees.records.generate_barcode', handler: 'yaml_mutation',
    });
    expect(generate.mutation.concurrency).toEqual({ required: true });
    expect(generate.mutation.before_steps).toBeUndefined();
    expect(generate.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'EMPLOYEES_ACTOR_REQUIRED', 'EMPLOYEES_BARCODE_EMPLOYEE_NOT_FOUND', 'STALE_RECORD',
      'EMPLOYEES_BADGE_ALREADY_ASSIGNED', 'EMPLOYEES_BADGE_INVALID', 'EMPLOYEES_BADGE_EXISTS',
    ]);
  });

  test('generates and persists a deterministic badge ID for an authenticated actor', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_barcode_generate_create');
    const generate = action(yaml('api/employee-detail.yaml'), 'generate_employee_barcode');
    const base = {
      id: 'employee-demo-003', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User',
      current_company_name: 'Core3 Vietnam',
    };

    expect(await repository.executeMutation(generate.mutation, base)).toMatchObject({
      id: base.id, barcode: '041000000003', row_version: 2,
    });
    expect(await repository.query("SELECT barcode, row_version FROM employees WHERE id = 'employee-demo-003'"))
      .toEqual([{ barcode: '041000000003', row_version: 2 }]);
    await database.close();
  });

  test('enforces actor, company, active, stale, and already-assigned guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_barcode_generate_guards');
    const generate = action(yaml('api/employee-detail.yaml'), 'generate_employee_barcode');
    const base = {
      id: 'employee-demo-003', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User',
      current_company_name: 'Core3 Vietnam',
    };

    await expect(repository.executeMutation(generate.mutation, { ...base, current_user_id: null })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(generate.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_BARCODE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(generate.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(generate.mutation, { ...base, id: 'employee-demo-004' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_BARCODE_EMPLOYEE_NOT_FOUND' });

    await repository.executeMutation(generate.mutation, base);
    await expect(repository.executeMutation(generate.mutation, { ...base, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_BADGE_ALREADY_ASSIGNED' });
    expect(await repository.query("SELECT barcode, row_version FROM employees WHERE id = 'employee-demo-003'"))
      .toEqual([{ barcode: '041000000003', row_version: 2 }]);
    await database.close();
  });

  test('replays the migration and preserves the generated badge ID across restart', async () => {
    const databasePath = `/tmp/core3-employees-barcode-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_barcode_generate_restart');
    const generate = action(yaml('api/employee-detail.yaml'), 'generate_employee_barcode');
    await firstRepository.executeMutation(generate.mutation, {
      id: 'employee-demo-003', expected_row_version: 1, current_user_id: 'user-admin', current_company_name: 'Core3 Vietnam',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_barcode_generate_restart');
    expect(await secondRepository.query("SELECT barcode, row_version FROM employees WHERE id = 'employee-demo-003'"))
      .toEqual([{ barcode: '041000000003', row_version: 2 }]);
    expect(await secondRepository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'employees_barcode_unique_idx'"))
      .toEqual([{ index_name: 'employees_barcode_unique_idx' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
