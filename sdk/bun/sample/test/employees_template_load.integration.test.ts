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

describe('Employees contract template loading parity', () => {
  test('maps the Odoo wizard and keeps page/API contracts separate', () => {
    const source = readFileSync(join(odooRoot, 'wizard/hr_contract_template_wizard.py'), 'utf8');
    const views = readFileSync(join(odooRoot, 'views/hr_employee_views.xml'), 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const load = action(api, 'load_employee_contract_template');

    expect(source).toContain("_name = 'hr.version.wizard'");
    expect(source).toContain('def action_load_template');
    expect(source).toContain("_get_whitelist_fields_from_template");
    expect(views).toContain('name="%(hr_version_wizard_action)d" type="action" string="Load a Template"');
    expect(page.page.id).toBe(api.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual({
      id: 'load_employee_contract_template', label: 'Load a Template', variant: 'secondary', permission: 'employees.write', show_if: 'state.employee_detail.active === true',
    });
    expect(load).toMatchObject({
      type: 'server_form', permission: 'employees.write', handler: 'yaml_mutation',
      action: 'employees.records.load_contract_template', prefill: 'state.employee_contract_template_wizard',
    });
    expect(load.mutation.concurrency).toEqual({ required: true });
    expect(load.mutation.steps).toHaveLength(2);
    expect(load.fields[0]).toMatchObject({ field: 'template_id', type: 'select', options_source: 'employee_contract_templates_for_employee' });
    expect(page.page.id).toBe('employee-detail');
    expect(api.datasources.map((source: any) => source.id)).toContain('employee_contract_template_wizard');
  });

  test('loads an eligible template into the employee and current version durably', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_template_load_create');
    const api = yaml('api/employee-detail.yaml');
    const wizard = api.datasources.find((source: any) => source.id === 'employee_contract_template_wizard');
    const templates = api.datasources.find((source: any) => source.id === 'employee_contract_templates_for_employee');
    const load = action(api, 'load_employee_contract_template');
    const base = {
      id: 'employee-demo-001', employee_id: 'employee-demo-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_name: 'HR Manager',
      template_id: 'contract-template-engineering-vietnam',
    };

    expect(await repository.querySource(wizard, { id: base.id, current_company_name: base.current_company_name }, 0, 1)).toMatchObject({
      data: { id: base.id, row_version: 1, employee_name: 'Admin User', active: true },
    });
    expect((await repository.querySource(templates, { employee_id: base.employee_id, current_company_name: base.current_company_name }, 0, 20)).data)
      .toContainEqual({ value: 'contract-template-engineering-vietnam', label: 'Engineering Vietnam' });

    expect(await repository.executeMutation(load.mutation, base)).toMatchObject({ id: base.employee_id, contract_template_name: 'Engineering Vietnam', job_position_name: 'Engineering Manager', wage: 4200 });
    expect(await repository.query("SELECT row_version, job_position_name, department_name, employment_type, wage, working_schedule, contract_template_id, contract_template_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2, job_position_name: 'Engineering Manager', department_name: 'Engineering', employment_type: 'Permanent', wage: 4200, working_schedule: 'Standard 40 hours/week', contract_template_id: 'contract-template-engineering-vietnam', contract_template_name: 'Engineering Vietnam' }]);
    expect(await repository.query("SELECT row_version, job_name, department_name, contract_type_name, wage, schedule_name, contract_template_id, contract_template_name FROM employee_versions WHERE id = 'employee-version-admin-current'"))
      .toEqual([{ row_version: 2, job_name: 'Engineering Manager', department_name: 'Engineering', contract_type_name: 'Permanent', wage: 4200, schedule_name: 'Standard 40 hours/week', contract_template_id: 'contract-template-engineering-vietnam', contract_template_name: 'Engineering Vietnam' }]);
    await database.close();
  });

  test('enforces actor, company, active, stale, and template eligibility guards atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_template_load_guards');
    const load = action(yaml('api/employee-detail.yaml'), 'load_employee_contract_template');
    const base = {
      id: 'employee-demo-001', employee_id: 'employee-demo-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', template_id: 'contract-template-engineering-vietnam',
    };

    await expect(repository.executeMutation(load.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_TEMPLATE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(load.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(load.mutation, { ...base, employee_id: 'employee-demo-004', id: 'employee-demo-004' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_TEMPLATE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(load.mutation, { ...base, template_id: 'contract-template-developer-usa' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_TEMPLATE_NOT_ELIGIBLE' });
    expect(await repository.query("SELECT row_version, contract_template_id FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 1, contract_template_id: null }]);
    await database.close();
  });

  test('preserves the applied template through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-template-load-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_template_load_restart');
    const load = action(yaml('api/employee-detail.yaml'), 'load_employee_contract_template');
    await firstRepository.executeMutation(load.mutation, {
      id: 'employee-demo-001', employee_id: 'employee-demo-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', template_id: 'contract-template-engineering-vietnam',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_template_load_restart');
    expect(await secondRepository.query("SELECT row_version, contract_template_name, job_position_name, wage FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2, contract_template_name: 'Engineering Vietnam', job_position_name: 'Engineering Manager', wage: 4200 }]);
    expect(await secondRepository.query("SELECT row_version, contract_template_name, job_name, wage FROM employee_versions WHERE id = 'employee-version-admin-current'"))
      .toEqual([{ row_version: 2, contract_template_name: 'Engineering Vietnam', job_name: 'Engineering Manager', wage: 4200 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
