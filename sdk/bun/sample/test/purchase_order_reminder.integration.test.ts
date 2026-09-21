import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any) => api.actions.find((candidate: any) => candidate.id === 'preview_purchase_reminder_detail');

async function openRepository(databasePath = ':memory:', migrationName = `purchase_order_reminder_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

const request = {
  id: 'po-demo-005',
  expected_row_version: 1,
  current_user_id: 'user-purchase',
  current_user_name: 'Purchase User',
  current_user_email: 'purchase.user@example.test',
};

describe('Purchase receipt reminder preview parity', () => {
  test('binds the source action, reminder fields, and page/API contract', () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const reminder = action(api);
    const detail = api.datasources.find((source: any) => source.id === 'purchase_order_detail');
    const history = api.datasources.find((source: any) => source.id === 'purchase_order_email_history');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('purchase-detail');
    expect(api.page.id).toBe('purchase-detail');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('purchase-detail')).toContain('purchase_order_detail');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'preview_purchase_reminder_detail', label: 'Send Reminder', permission: 'purchase.write' }));
    expect(form.groups[1].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'receipt_reminder_email', label: 'Ask confirmation', type: 'checkbox' }),
      expect.objectContaining({ field: 'reminder_date_before_receipt', label: 'Days before receipt', type: 'number' }),
    ]));
    expect(reminder).toMatchObject({ type: 'server', permission: 'purchase.write', action: 'purchase.orders.send_reminder_preview', operation: 'create' });
    expect(reminder.mutation).toMatchObject({ operation: 'insert', table: 'purchase_order_reminder_previews' });
    expect(reminder.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'PURCHASE_ORDER_REMINDER_NOT_FOUND',
      'PURCHASE_ORDER_REMINDER_INVALID',
      'PURCHASE_ORDER_REMINDER_ACTOR_REQUIRED',
    ]);
    expect(detail.query).toContain('receipt_reminder_email');
    expect(detail.query).toContain('reminder_date_before_receipt');
    expect(history.query).toContain('purchase_order_reminder_previews');
  });

  test('records a reminder preview without changing the order state and exposes history', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/purchase-detail.yaml');
      const created = await repository.executeMutation(action(api).mutation, request) as any;
      expect(created).toMatchObject({
        id: 'purchase-reminder-po-demo-005-1',
        purchase_order_id: 'po-demo-005',
        recipient_email: request.current_user_email,
        template_label: 'Purchase: Vendor Reminder',
        sent_by: 'Purchase User',
      });
      expect(await repository.query("SELECT state, row_version, receipt_reminder_email, reminder_date_before_receipt FROM purchase_orders WHERE id = 'po-demo-005'"))
        .toEqual([{ state: 'Confirmed', row_version: 1, receipt_reminder_email: true, reminder_date_before_receipt: 3 }]);
      const history = await repository.querySource(api.datasources.find((source: any) => source.id === 'purchase_order_email_history'), { id: 'po-demo-005', fixture_state: null }, 0, 10);
      expect(history.data).toMatchObject([{ action: 'purchase.orders.reminder.preview', action_label: 'Sent Purchase: Vendor Reminder', recipient_email: request.current_user_email }]);
    } finally {
      await database.close();
    }
  });

  test('rejects disabled, stale, missing, and invalid-actor previews atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      const reminder = action(yaml('api/purchase-detail.yaml'));
      await expect(repository.executeMutation(reminder.mutation, { ...request, id: 'po-demo-001' })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_REMINDER_INVALID' });
      await expect(repository.executeMutation(reminder.mutation, { ...request, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_REMINDER_INVALID' });
      await expect(repository.executeMutation(reminder.mutation, { ...request, id: 'missing-order' })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_ORDER_REMINDER_NOT_FOUND' });
      await expect(repository.executeMutation(reminder.mutation, { ...request, current_user_email: 'invalid' })).rejects.toMatchObject({ status: 403, code: 'PURCHASE_ORDER_REMINDER_ACTOR_REQUIRED' });
      expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_order_reminder_previews WHERE purchase_order_id = 'po-demo-005'"))
        .toEqual([{ count: 0 }]);
    } finally {
      await database.close();
    }
  });

  test('keeps reminder history through file-backed restart and migration replay', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-purchase-reminder-'));
    const databasePath = join(tempDir, 'purchase.duckdb');
    const migrationName = `purchase_order_reminder_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      await first.repository.executeMutation(action(yaml('api/purchase-detail.yaml')).mutation, request);
      await first.database.close();

      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query("SELECT purchase_order_id, recipient_email, template_label FROM purchase_order_reminder_previews WHERE purchase_order_id = 'po-demo-005'"))
        .toEqual([{ purchase_order_id: 'po-demo-005', recipient_email: request.current_user_email, template_label: 'Purchase: Vendor Reminder' }]);
      await migrateDatabase(second.repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query("SELECT COUNT(*) AS count FROM purchase_order_reminder_previews WHERE purchase_order_id = 'po-demo-005'"))
        .toEqual([{ count: 1 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
