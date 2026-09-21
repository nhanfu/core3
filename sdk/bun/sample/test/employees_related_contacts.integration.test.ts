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

describe('Employees related contacts parity', () => {
  test('maps Odoo related contacts smart button to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const open = action(api, 'open_employee_related_contacts');
    const edit = action(api, 'edit_employee_work_contact');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const contacts = api.datasources.find((entry: any) => entry.id === 'employee_related_contacts');

    expect(sourceModel).toContain('def action_related_contacts(self):');
    expect(sourceModel).toContain('return self.work_contact_id | self.user_id.partner_id');
    expect(sourceView).toContain('name="action_related_contacts"');
    expect(sourceView).toContain('<span class="o_stat_text">Contacts</span>');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('related_contacts_count');
    expect(contacts.query).toContain('base_contacts');
    expect(form.stat_buttons).toContainEqual(expect.objectContaining({ id: 'open_employee_related_contacts', value_field: 'related_contacts_count' }));
    expect(open).toMatchObject({ type: 'navigate', permission: 'employees.read', navigate_to: '/contacts/detail' });
    expect(edit).toMatchObject({ type: 'server_form', permission: 'employees.write' });
    expect(edit.mutation.fields).toEqual(['work_contact_id']);
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
      expect.objectContaining({ code: 'EMPLOYEES_WORK_CONTACT_INVALID' }),
    ]));
  });

  test('assigns, reads, and clears a durable company-scoped work contact', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_related_contacts_crud');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_work_contact');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const contacts = api.datasources.find((entry: any) => entry.id === 'employee_related_contacts');

    expect(await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { work_contact_id: 'employee-contact-demo-001', work_contact_name: 'Admin User Work Contact', related_contacts_count: 1, row_version: 1 } });
    expect((await repository.querySource(contacts, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data).toMatchObject([{ id: 'employee-contact-demo-001', name: 'Admin User Work Contact' }]);
    const cleared = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { work_contact_id: null },
    }) as any;
    expect(cleared).toMatchObject({ id: 'employee-demo-001', work_contact_id: null, row_version: 2 });
    const assigned = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 2, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { work_contact_id: 'employee-contact-demo-001' },
    }) as any;
    expect(assigned).toMatchObject({ id: 'employee-demo-001', work_contact_id: 'employee-contact-demo-001', row_version: 3 });
    await database.close();
  });

  test('rejects actor, stale, cross-company, and invalid work-contact writes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_related_contacts_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_work_contact');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { work_contact_id: null },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORK_CONTACT_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { work_contact_id: 'contact-demo' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_WORK_CONTACT_INVALID' });
    expect(await repository.query("SELECT work_contact_id, row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ work_contact_id: 'employee-contact-demo-001', row_version: 1 }]);
    await database.close();
  });

  test('preserves the work-contact relation through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-related-contacts-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_related_contacts_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_work_contact');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { work_contact_id: 'employee-contact-demo-001' },
    });
    expect(await firstRepository.query("SELECT work_contact_id, row_version FROM employees WHERE id = 'employee-demo-002'")).toEqual([{ work_contact_id: 'employee-contact-demo-001', row_version: 2 }]);
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_related_contacts_restart');
    expect(await secondRepository.query("SELECT work_contact_id, row_version FROM employees WHERE id = 'employee-demo-002'")).toEqual([{ work_contact_id: 'employee-contact-demo-001', row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
