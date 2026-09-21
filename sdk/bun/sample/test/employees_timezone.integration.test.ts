import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
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

describe('Employees timezone parity', () => {
  test('maps Odoo tz to a separate employee Settings page/API workflow', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const settings = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'settings');
    const edit = action(api, 'edit_employee_timezone');

    expect(model).toContain('tz = fields.Selection(tracking=True)');
    expect(views).toContain('<field name="tz" required="id"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('timezone');
    expect(settings.groups[0].fields).toContainEqual({ field: 'timezone', label: 'Timezone' });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_timezone', permission: 'employees.write' }));
    expect(edit).toMatchObject({ permission: 'employees.write', handler: 'yaml_mutation', operation: 'update' });
    expect(edit.mutation.fields).toEqual(['timezone']);
    expect(edit.mutation.guards.some((guard: any) => guard.code === 'EMPLOYEES_TIMEZONE_INVALID')).toBe(true);
    expect(edit.fields[0]).toMatchObject({ field: 'timezone', label: 'Timezone', type: 'select', required: true });
  });

  test('creates and edits an employee timezone with durable guarded persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_timezone_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_timezone');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-TIMEZONE-001', name: 'Timezone Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', timezone: 'UTC',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Timezone Test', timezone: 'UTC', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { timezone: 'Europe/London' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, timezone: 'Europe/London', row_version: 2 });
    expect(await repository.query(`SELECT timezone, row_version FROM employees WHERE id = '${created.id}'`))
      .toEqual([{ timezone: 'Europe/London', row_version: 2 }]);
    await database.close();
  });

  test('rejects missing actor, stale, cross-company, and unsupported timezone changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_timezone_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_timezone');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { timezone: 'Asia/Tokyo' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_TIMEZONE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { timezone: 'Mars/Olympus' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_TIMEZONE_INVALID' });
    expect(await repository.query("SELECT timezone, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ timezone: 'Asia/Ho_Chi_Minh', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic employee timezones through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-timezone-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_timezone_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_timezone');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { timezone: 'America/Los_Angeles' },
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_timezone_restart');
    expect(await secondRepository.query("SELECT timezone, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ timezone: 'America/Los_Angeles', row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
