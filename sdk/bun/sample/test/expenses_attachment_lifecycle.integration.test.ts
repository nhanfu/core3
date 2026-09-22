import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('Expenses receipt attachment lifecycle parity', () => {
  test('maps Odoo attachment state guards to the separated page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_expense/models/ir_attachment.py', 'utf8');
    const page = yaml('pages/expense-detail.yaml');
    const api = yaml('api/expense-detail.yaml');
    const form = page.components[0];

    expect(source).toContain("expense.state in {'draft', 'submitted'}");
    expect(source).toContain("You can't delete attachments from an expense once it has been submitted.");
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(form).toMatchObject({
      attachment_source: 'expense_detail_attachments',
      attachment_upload_action: 'upload_expense_attachment',
      attachment_download_action: 'download_expense_attachment',
    });
    expect(form.attachment_actions).toContainEqual(expect.objectContaining({ id: 'remove_expense_attachment', label: 'Remove' }));
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'expense_detail_attachments')?.query).toContain('row_version');
    expect(action(api, 'upload_expense_attachment')).toMatchObject({ type: 'upload', permission: 'expenses.write', kind: 'expense_attachment' });
    expect(action(api, 'remove_expense_attachment')).toMatchObject({ type: 'server', handler: 'line_item', operation: 'delete', permission: 'expenses.write' });
    expect(action(api, 'remove_expense_attachment').mutation.guards.map((guard: any) => guard.code)).toEqual([
      'EXPENSE_ATTACHMENT_ACTOR_REQUIRED', 'EXPENSE_ATTACHMENT_STATE_INVALID', 'EXPENSE_ATTACHMENT_STALE',
    ]);
  });

  test('allows draft/submitted receipt writes, removes atomically, and records the audit event', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_attachment_lifecycle', ['schema', 'data']);
    const api = yaml('api/expense-detail.yaml');
    const upload = action(api, 'upload_expense_attachment');
    const remove = action(api, 'remove_expense_attachment');
    const uploaded = await repository.executeMutation(upload.mutation, {
      attachment_id: 'expense-attachment-submitted-001', id: 'expense-demo-submitted',
      fileName: 'submitted-receipt.pdf', mimeType: 'application/pdf', sizeBytes: 512,
      storageKey: 'expenses/submitted-receipt.pdf', current_user_id: 'user-admin', current_user_name: 'Operations Lead',
    }) as any;
    expect(uploaded).toMatchObject({ id: 'expense-attachment-submitted-001', expense_id: 'expense-demo-submitted', row_version: 1 });
    expect(await repository.query("SELECT row_version, receipt_reference FROM expenses WHERE id = 'expense-demo-submitted'"))
      .toEqual([{ row_version: 2, receipt_reference: 'submitted-receipt.pdf' }]);

    await expect(repository.executeMutation(remove.mutation, {
      id: 'expense-demo-submitted', line_id: 'expense-attachment-submitted-001', expected_row_version: 1,
      parent_expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Operations Lead',
    })).rejects.toMatchObject({ status: 409, code: 'EXPENSE_ATTACHMENT_STATE_INVALID' });

    const removed = await repository.executeMutation(remove.mutation, {
      id: 'expense-demo-submitted', line_id: 'expense-attachment-submitted-001', expected_row_version: 1,
      parent_expected_row_version: 2, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Operations Lead',
    });
    expect(removed).toEqual({ deleted: true, id: 'expense-attachment-submitted-001' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM expense_attachments WHERE id = 'expense-attachment-submitted-001'"))
      .toEqual([{ count: 0 }]);
    expect(await repository.query("SELECT row_version, receipt_reference, receipt_label, receipt_checksum FROM expenses WHERE id = 'expense-demo-submitted'"))
      .toEqual([{ row_version: 3, receipt_reference: null, receipt_label: 'No receipt attached', receipt_checksum: null }]);
    expect(await repository.query("SELECT action, detail FROM expense_activity WHERE id = 'expense-activity-expense-demo-submitted-attachment-remove-expense-attachment-submitted-001'"))
      .toEqual([{ action: 'expenses.attachments.remove', detail: 'Receipt attachment removed' }]);
    await database.close();
  });

  test('rejects actor, stale, and approved-state removal without deleting data', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_attachment_lifecycle_guards', ['schema', 'data']);
    await repository.run("INSERT INTO expense_attachments(id, expense_id, row_version, file_name, mime_type, size_bytes, storage_key, uploaded_by) VALUES ('expense-attachment-approved-001', 'expense-demo-approved', 1, 'approved.pdf', 'application/pdf', 128, 'expenses/approved.pdf', 'user-admin')");
    const remove = action(yaml('api/expense-detail.yaml'), 'remove_expense_attachment');
    const base = { id: 'expense-demo-approved', line_id: 'expense-attachment-approved-001', expected_row_version: 1, parent_expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Operations Lead' };
    await expect(repository.executeMutation(remove.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EXPENSE_ATTACHMENT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(remove.mutation, { ...base, parent_expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'EXPENSE_ATTACHMENT_STATE_INVALID' });
    await expect(repository.executeMutation(remove.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'EXPENSE_ATTACHMENT_STATE_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM expense_attachments WHERE id = 'expense-attachment-approved-001'"))
      .toEqual([{ count: 1 }]);
    await database.close();
  });
});
