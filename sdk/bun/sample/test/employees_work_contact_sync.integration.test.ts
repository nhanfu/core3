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

describe('Employees work-contact synchronization parity', () => {
  test('maps Odoo work-contact inverse details to paired page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const sync = action(api, 'sync_employee_work_contact');

    expect(sourceModel).toContain('def _inverse_work_contact_details(self):');
    expect(sourceModel).toContain("'email': employee.work_email");
    expect(sourceModel).toContain("'phone': employee.work_phone");
    expect(sourceView).toContain('name="work_email"');
    expect(sourceView).toContain('name="work_phone"');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('work_contact_row_version');
    expect(sync).toMatchObject({ type: 'server_form', permission: 'employees.write', action: 'employees.records.work_contact.sync' });
    expect(sync.fields).toEqual([
      expect.objectContaining({ field: 'work_email', type: 'text' }),
      expect.objectContaining({ field: 'work_phone', type: 'text' }),
    ]);
    expect(sync.mutation.fields).toEqual(['work_email', 'work_phone']);
    expect(sync.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'EMPLOYEES_WORK_CONTACT_NOT_FOUND' }),
      expect.objectContaining({ code: 'EMPLOYEES_WORK_CONTACT_STALE' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
    ]));
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'sync_employee_work_contact', label: 'Sync Work Contact' }));
  });

  test('synchronizes durable employee work details to the linked contact', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_contact_sync_crud');
    const api = yaml('api/employee-detail.yaml');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const sync = action(api, 'sync_employee_work_contact');

    expect(await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { work_contact_id: 'employee-contact-demo-001', work_contact_row_version: 1, row_version: 1 } });
    const result = await repository.executeMutation(sync.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, expected_contact_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { work_email: 'synced.admin@core3.local', work_phone: '+84 901 555 202' },
    }) as any;

    expect(result).toMatchObject({
      employee_id: 'employee-demo-001', contact_id: 'employee-contact-demo-001',
      previous_email: 'admin.work@core3.local', previous_phone: '+84 901 555 101',
      email: 'synced.admin@core3.local', phone: '+84 901 555 202',
      actor_id: 'user-admin', actor_name: 'Admin User', employee_row_version: 2, contact_row_version: 2,
    });
    expect(await repository.query("SELECT work_email, work_phone, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_email: 'synced.admin@core3.local', work_phone: '+84 901 555 202', row_version: 2 }]);
    expect(await repository.query("SELECT email, phone, row_version FROM base_contacts WHERE id = 'employee-contact-demo-001'"))
      .toEqual([{ email: 'synced.admin@core3.local', phone: '+84 901 555 202', row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, employee/contact scope, and stale boundaries atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_contact_sync_guards');
    const sync = action(yaml('api/employee-detail.yaml'), 'sync_employee_work_contact');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, expected_contact_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { work_email: 'guard.admin@core3.local', work_phone: '+84 901 555 303' },
    };

    await expect(repository.executeMutation(sync.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(sync.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(sync.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORK_CONTACT_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(sync.mutation, { ...base, id: 'employee-demo-002' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORK_CONTACT_NOT_FOUND' });
    await repository.run("UPDATE base_contacts SET row_version = 2 WHERE id = 'employee-contact-demo-001'");
    await expect(repository.executeMutation(sync.mutation, base)).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_WORK_CONTACT_STALE' });
    expect(await repository.query("SELECT work_email, work_phone, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_email: 'admin@tms.local', work_phone: null, row_version: 1 }]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_work_contact_sync_events"))
      .toEqual([{ count: 0 }]);
    await database.close();
  });

  test('preserves synchronized contact details and audit event through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-work-contact-sync-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_work_contact_sync_restart');
    const sync = action(yaml('api/employee-detail.yaml'), 'sync_employee_work_contact');
    await firstRepository.executeMutation(sync.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, expected_contact_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { work_email: 'restart.admin@core3.local', work_phone: '+84 901 555 404' },
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_work_contact_sync_restart');
    expect(await secondRepository.query("SELECT email, phone, row_version FROM base_contacts WHERE id = 'employee-contact-demo-001'"))
      .toEqual([{ email: 'restart.admin@core3.local', phone: '+84 901 555 404', row_version: 2 }]);
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_work_contact_sync_events WHERE employee_id = 'employee-demo-001'"))
      .toEqual([{ count: 1 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
