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

describe('Employees attachments parity', () => {
  test('maps Odoo mail attachments to separate page/API upload, list, download, and remove contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];

    expect(sourceModel).toContain("_inherit = ['mail.thread.main.attachment'");
    expect(sourceView).toContain('<chatter reload_on_follower="True"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({
      attachment_source: 'employee_attachments',
      attachment_panel_open: true,
      attachment_upload_action: 'upload_employee_attachment',
      attachment_download_action: 'download_employee_attachment',
    });
    expect(api.datasources.find((entry: any) => entry.id === 'employee_attachments')?.query).toContain('FROM employee_attachments');
    expect(action(api, 'upload_employee_attachment')).toMatchObject({ type: 'upload', handler: 'attachment_metadata', permission: 'employees.write', kind: 'employee_attachment' });
    expect(action(api, 'download_employee_attachment')).toMatchObject({ type: 'download', permission: 'employees.read', kind: 'employee_attachment' });
    expect(action(api, 'remove_employee_attachment')).toMatchObject({ type: 'server', handler: 'line_item', operation: 'delete', permission: 'employees.write' });
    expect(yaml('storage.yaml').attachments.employee_attachment.download).toMatchObject({ route: '/api/employees/attachments', permission: 'employees.read' });
  });

  test('uploads and removes an employee attachment with durable company-scoped persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_attachments_crud');
    const api = yaml('api/employee-detail.yaml');
    const upload = action(api, 'upload_employee_attachment');
    const remove = action(api, 'remove_employee_attachment');
    const attachments = api.datasources.find((entry: any) => entry.id === 'employee_attachments');
    expect((await repository.querySource(attachments, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual([expect.objectContaining({ id: 'employee-attachment-demo-001', file_name: 'employment-handbook.txt', row_version: 1 })]);

    const uploaded = await repository.executeMutation(upload.mutation, {
      attachment_id: 'employee-attachment-crud-001', employee_id: 'employee-demo-001', expected_row_version: 1,
      fileName: 'offer-letter.pdf', mimeType: 'application/pdf', sizeBytes: 256, storageKey: 'employees/offer-letter.pdf',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(uploaded).toMatchObject({ id: 'employee-attachment-crud-001', employee_id: 'employee-demo-001', file_name: 'offer-letter.pdf' });
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2 }]);

    expect(await repository.executeMutation(remove.mutation, {
      id: 'employee-demo-001', line_id: 'employee-attachment-crud-001', expected_row_version: 1,
      parent_expected_row_version: 2, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    })).toEqual({ deleted: true, id: 'employee-attachment-crud-001' });
    expect(await repository.query("SELECT active, row_version FROM employee_attachments WHERE id = 'employee-attachment-crud-001'"))
      .toEqual([{ active: false, row_version: 2 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 3 }]);
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid, duplicate, and missing employee attachment writes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_attachments_guards');
    const api = yaml('api/employee-detail.yaml');
    const upload = action(api, 'upload_employee_attachment');
    const remove = action(api, 'remove_employee_attachment');
    const base = {
      attachment_id: 'employee-attachment-guard-001', employee_id: 'employee-demo-001', expected_row_version: 1,
      fileName: 'guard.pdf', mimeType: 'application/pdf', sizeBytes: 128, storageKey: 'employees/guard.pdf',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };
    await expect(repository.executeMutation(upload.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(upload.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(upload.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_ATTACHMENT_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(upload.mutation, { ...base, fileName: '', sizeBytes: 0 })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_ATTACHMENT_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...base, fileName: 'employment-handbook.txt' })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_ATTACHMENT_DUPLICATE' });
    await expect(repository.executeMutation(upload.mutation, { ...base, employee_id: 'missing-employee' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_ATTACHMENT_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, {
      id: 'employee-demo-001', line_id: 'employee-attachment-demo-001', expected_row_version: 99,
      parent_expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_ATTACHMENT_STALE' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_attachments WHERE id = 'employee-attachment-guard-001'"))
      .toEqual([{ count: 0 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 1 }]);
    await database.close();
  });

  test('preserves employee attachment metadata through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-attachments-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_attachments_restart');
    const upload = action(yaml('api/employee-detail.yaml'), 'upload_employee_attachment');
    await firstRepository.executeMutation(upload.mutation, {
      attachment_id: 'employee-attachment-restart-001', employee_id: 'employee-demo-002', expected_row_version: 1,
      fileName: 'restart-proof.pdf', mimeType: 'application/pdf', sizeBytes: 512, storageKey: 'employees/restart-proof.pdf',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_attachments_restart');
    expect(await secondRepository.query("SELECT file_name, storage_key, uploaded_by, row_version FROM employee_attachments WHERE id = 'employee-attachment-restart-001'"))
      .toEqual([{ file_name: 'restart-proof.pdf', storage_key: 'employees/restart-proof.pdf', uploaded_by: 'user-hr-manager', row_version: 1 }]);
    expect(await secondRepository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
