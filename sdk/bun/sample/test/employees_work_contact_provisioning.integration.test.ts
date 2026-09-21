import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const employeesRoot = join(sampleRoot, 'services/employees');
const baseRoot = join(sampleRoot, 'services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(baseRoot, 'migrations'), undefined, `${name}_base`, ['schema', 'data']);
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, `${name}_employees`, ['schema', 'data']);
}

describe('Employees work-contact provisioning parity', () => {
  test('maps Odoo work-contact inverse provisioning to separate API and page contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const create = action(api, 'create_employee_work_contact');

    expect(sourceModel).toContain('def _create_work_contacts(self):');
    expect(sourceModel).toContain("'email': employee.work_email");
    expect(sourceModel).toContain("'phone': employee.work_phone");
    expect(sourceView).toContain('name="work_email"');
    expect(sourceView).toContain('name="work_phone"');
    expect(api.page.id).toBe(page.page.id);
    expect(create).toMatchObject({ type: 'server', permission: 'employees.write', handler: 'yaml_mutation', operation: 'create_work_contact' });
    expect(create.mutation.concurrency).toEqual({ required: true });
    expect(create.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'EMPLOYEES_WORK_CONTACT_EXISTS' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
    ]));
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'create_employee_work_contact', label: 'Create Work Contact' }));
  });

  test('creates a durable company-scoped work contact from employee work details', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_contact_provisioning_crud');
    const create = action(yaml('api/employee-detail.yaml'), 'create_employee_work_contact');

    const created = await repository.executeMutation(create.mutation, {
      id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;

    expect(created).toMatchObject({
      id: 'employee-work-contact-employee-demo-002-1',
      name: 'Nguyen Minh Anh',
      email: 'anh.nguyen@core3.local',
      phone: '+84 901 000 002',
      is_company: false,
      source: 'employee_provisioned',
      source_employee_id: 'employee-demo-002',
      employee_row_version: 2,
    });
    expect(await repository.query("SELECT work_contact_id, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ work_contact_id: 'employee-work-contact-employee-demo-002-1', row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, stale, cross-company, and duplicate provisioning atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_contact_provisioning_guards');
    const create = action(yaml('api/employee-detail.yaml'), 'create_employee_work_contact');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };

    await expect(repository.executeMutation(create.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(create.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORK_CONTACT_EMPLOYEE_NOT_FOUND' });
    await repository.executeMutation(create.mutation, base);
    await expect(repository.executeMutation(create.mutation, { ...base, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_WORK_CONTACT_EXISTS' });
    expect(await repository.query("SELECT work_contact_id, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ work_contact_id: 'employee-work-contact-employee-demo-002-1', row_version: 2 }]);
    await database.close();
  });

  test('preserves provisioned contact provenance through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-work-contact-provisioning-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_work_contact_provisioning_restart');
    const create = action(yaml('api/employee-detail.yaml'), 'create_employee_work_contact');
    await firstRepository.executeMutation(create.mutation, {
      id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_work_contact_provisioning_restart');
    expect(await secondRepository.query("SELECT id, source, source_employee_id, email, phone FROM base_contacts WHERE id = 'employee-work-contact-employee-demo-002-1'"))
      .toEqual([{ id: 'employee-work-contact-employee-demo-002-1', source: 'employee_provisioned', source_employee_id: 'employee-demo-002', email: 'anh.nguyen@core3.local', phone: '+84 901 000 002' }]);
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM base_contacts WHERE id = 'employee-work-contact-employee-demo-002-1'"))
      .toEqual([{ count: 1 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
