import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Employees Register Departure wizard parity', () => {
  test('maps the Odoo wizard into the existing page/API contract', () => {
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const departure = action(api, 'register_employee_departure');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(form.header_actions).toContainEqual({
      id: 'register_employee_departure', label: 'Register Departure', variant: 'danger', permission: 'employees.write', show_if: 'state.employee_detail.active === true',
    });
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((source: any) => source.id === 'employee_departure_wizard')).toMatchObject({ single: true, permission: 'employees.read' });
    expect(api.datasources.find((source: any) => source.id === 'employee_departure_wizard_reasons').query).toContain('departure-reason-resigned');
    expect(departure).toMatchObject({
      type: 'server_form', permission: 'employees.write', handler: 'yaml_mutation',
      action: 'employees.records.register_departure', prefill: 'state.employee_departure_wizard',
    });
    expect(departure.fields.map((field: any) => field.label)).toEqual([
      'Departure Reason', 'Contract End Date', 'Set Contract End Date', 'Remove Related User', 'Detailed Reason',
    ]);
    expect(departure.mutation.boolean_fields).toEqual(['set_date_end', 'remove_related_user']);
    expect(departure.mutation.steps[0].query).toContain("state = 'Terminated'");
    expect(departure.mutation.steps[0].query).toContain('clear_related_user');
  });

  test('registers a durable departure with Odoo side effects and company-scoped reasons', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departure_wizard_mutations', ['schema', 'data']);

    const api = yaml('api/employee-detail.yaml');
    const wizard = api.datasources.find((source: any) => source.id === 'employee_departure_wizard');
    const reasons = api.datasources.find((source: any) => source.id === 'employee_departure_wizard_reasons');
    const departure = action(api, 'register_employee_departure');

    const prefill = await repository.querySource(wizard, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1);
    expect(prefill.data).toMatchObject({
      id: 'employee-demo-001', employee_name: 'Admin User', company_name: 'Core3 Vietnam',
      contract_start: '2025-01-15', is_user_employee: true, departure_date: '2026-01-15',
      set_date_end: true, remove_related_user: false,
    });
    expect((await repository.querySource(reasons, { current_company_name: 'Core3 Vietnam' }, 0, 50)).data.map((row: any) => row.label))
      .toEqual(['Fired', 'Resigned', 'Retired']);

    const registered = await repository.executeMutation(departure.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: {
        departure_reason_name: 'Resigned', departure_date: '2026-01-15',
        set_date_end: true, remove_related_user: true, departure_description: 'Role transition after contract completion.',
      },
    });
    expect(registered).toMatchObject({
      id: 'employee-demo-001', active: false, state: 'Terminated', row_version: 2,
      departure_reason_name: 'Resigned', departure_description: 'Role transition after contract completion.',
      departure_date: '2026-01-15T00:00:00.000Z', termination_date: '2026-01-15T00:00:00.000Z', contract_end: '2026-01-15T00:00:00.000Z',
      auth_user_id: null, user_name: null,
    });
    expect((await repository.querySource(wizard, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(api.datasources[0], { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).data)
      .toMatchObject({ active: false, state: 'Terminated', departure_reason_name: 'Resigned', contract_end: '2026-01-15' });
    await database.close();
  });

  test('rejects invalid, stale, missing, and cross-company departures without changing the employee', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departure_wizard_guards', ['schema', 'data']);
    const departure = action(yaml('api/employee-detail.yaml'), 'register_employee_departure');
    const base = {
      id: 'employee-demo-001', current_company_name: 'Core3 Vietnam',
      values: { departure_reason_name: 'Resigned', departure_date: '2026-01-15', set_date_end: true, remove_related_user: false },
    };

    await expect(repository.executeMutation(departure.mutation, { ...base, expected_row_version: 1, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTURE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(departure.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(departure.mutation, { ...base, expected_row_version: 1, values: { ...base.values, departure_reason_name: 'Not a reason' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_DEPARTURE_REASON_INVALID' });
    await expect(repository.executeMutation(departure.mutation, { ...base, expected_row_version: 1, values: { ...base.values, departure_date: '2025-01-14' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_DEPARTURE_DATE_INVALID' });
    await expect(repository.executeMutation(departure.mutation, { ...base, expected_row_version: 1, values: { ...base.values, departure_date: 'not-a-date' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_DEPARTURE_DATE_INVALID' });
    expect((await repository.querySource(yaml('api/employee-detail.yaml').datasources[0], { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).data)
      .toMatchObject({ active: true, state: 'Active', row_version: 1, contract_end: null });
    await database.close();
  });

  test('persists the departure through migration replay and preserves optional side effects', async () => {
    const databasePath = `/tmp/core3-employees-departure-${crypto.randomUUID()}.duckdb`;
    const migrationName = `employees_departure_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const api = yaml('api/employee-detail.yaml');
    const departure = action(api, 'register_employee_departure');

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const registered = await firstRepository.executeMutation(departure.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { departure_reason_name: 'Retired', departure_date: '2026-01-15', set_date_end: false, remove_related_user: false, departure_description: null },
    });
    expect(registered).toMatchObject({ active: false, state: 'Terminated', row_version: 2, contract_end: null, auth_user_id: 'user-admin', user_name: 'Admin User' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const afterRestart = await secondRepository.querySource(api.datasources[0], { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1);
    expect(afterRestart.data).toMatchObject({ active: false, state: 'Terminated', row_version: 2, departure_reason_name: 'Retired', departure_date: '2026-01-15', contract_end: null, auth_user_id: 'user-admin' });
    await expect(secondRepository.executeMutation(departure.mutation, {
      id: 'employee-demo-001', expected_row_version: 2, current_company_name: 'Core3 Vietnam',
      values: { departure_reason_name: 'Retired', departure_date: '2026-01-15', set_date_end: true, remove_related_user: false },
    })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTURE_EMPLOYEE_NOT_FOUND' });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
