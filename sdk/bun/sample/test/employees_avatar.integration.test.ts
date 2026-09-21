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

describe('Employees avatar parity', () => {
  test('maps Odoo image_1920 widget to separate page/API upload and download contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const upload = action(api, 'upload_employee_avatar');
    const remove = action(api, 'remove_employee_avatar');

    expect(sourceModel).toContain('image_1920');
    expect(sourceView).toContain('<field name="image_1920" widget="image"');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ avatar_field: 'image_url', avatar_initials_field: 'name' });
    expect(api.datasources.find((entry: any) => entry.id === 'employee_avatar')?.query).toContain('employee_avatar_assets');
    expect(upload).toMatchObject({ type: 'upload', handler: 'attachment_metadata', permission: 'employees.write', kind: 'employee_avatar' });
    expect(upload.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
      expect.objectContaining({ code: 'EMPLOYEES_AVATAR_INVALID' }),
    ]));
    expect(remove).toMatchObject({ type: 'server', permission: 'employees.write', operation: 'delete' });
    expect(yaml('storage.yaml').attachments.employee_avatar.download).toMatchObject({ route: '/api/employees/avatars', permission: 'employees.read' });
  });

  test('uploads and removes an employee avatar with durable company-scoped persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_avatar_crud');
    const api = yaml('api/employee-detail.yaml');
    const upload = action(api, 'upload_employee_avatar');
    const remove = action(api, 'remove_employee_avatar');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const avatar = api.datasources.find((entry: any) => entry.id === 'employee_avatar');
    expect(await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { row_version: 1, image_url: '/api/employees/avatars/employee-avatar-demo-001' } });
    expect(await repository.querySource(avatar, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { file_name: 'employee-demo-001.svg' } });

    const uploaded = await repository.executeMutation(upload.mutation, {
      attachment_id: 'employee-avatar-crud-001', employee_id: 'employee-demo-001', expected_row_version: 1,
      fileName: 'updated-avatar.png', mimeType: 'image/png', sizeBytes: 128, storageKey: 'avatars/updated-avatar.png',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(uploaded).toMatchObject({ id: 'employee-avatar-crud-001', employee_id: 'employee-demo-001', file_name: 'updated-avatar.png' });
    expect(await repository.query("SELECT image_url, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ image_url: '/api/employees/avatars/employee-avatar-crud-001', row_version: 2 }]);

    expect(await repository.executeMutation(remove.mutation, {
      id: 'employee-demo-001', expected_row_version: 2, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    })).toEqual({ deleted: true, id: 'employee-demo-001' });
    expect(await repository.query("SELECT image_url, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ image_url: null, row_version: 3 }]);
    expect(await repository.query("SELECT active FROM employee_avatar_assets WHERE id = 'employee-avatar-crud-001'"))
      .toEqual([{ active: false }]);
    await database.close();
  });

  test('rejects missing actor, stale, cross-company, invalid, and missing employee avatar writes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_avatar_guards');
    const upload = action(yaml('api/employee-detail.yaml'), 'upload_employee_avatar');
    const base = {
      attachment_id: 'employee-avatar-guard-001', employee_id: 'employee-demo-001', expected_row_version: 1,
      fileName: 'guard.png', mimeType: 'image/png', sizeBytes: 128, storageKey: 'avatars/guard.png',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };
    await expect(repository.executeMutation(upload.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(upload.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(upload.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_AVATAR_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(upload.mutation, { ...base, mimeType: 'text/plain' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_AVATAR_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...base, employee_id: 'missing-employee' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_AVATAR_EMPLOYEE_NOT_FOUND' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_avatar_assets WHERE id = 'employee-avatar-guard-001'"))
      .toEqual([{ count: 0 }]);
    expect(await repository.query("SELECT image_url, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ image_url: '/api/employees/avatars/employee-avatar-demo-001', row_version: 1 }]);
    await database.close();
  });

  test('preserves uploaded avatar metadata and image projection through file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-avatar-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_avatar_restart');
    const upload = action(yaml('api/employee-detail.yaml'), 'upload_employee_avatar');
    await firstRepository.executeMutation(upload.mutation, {
      attachment_id: 'employee-avatar-restart-001', employee_id: 'employee-demo-002', expected_row_version: 1,
      fileName: 'restart-avatar.webp', mimeType: 'image/webp', sizeBytes: 256, storageKey: 'avatars/restart-avatar.webp',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_avatar_restart');
    expect(await secondRepository.query("SELECT image_url, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ image_url: '/api/employees/avatars/employee-avatar-restart-001', row_version: 2 }]);
    expect(await secondRepository.query("SELECT file_name, storage_key, uploaded_by FROM employee_avatar_assets WHERE id = 'employee-avatar-restart-001'"))
      .toEqual([{ file_name: 'restart-avatar.webp', storage_key: 'avatars/restart-avatar.webp', uploaded_by: 'user-hr-manager' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
