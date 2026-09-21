import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `purchase_order_send_po_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

const message = {
  purchase_order_id: 'po-demo-005',
  expected_row_version: 1,
  recipient_name: 'Northwind Components',
  recipient_email: 'orders@northwind.example',
  subject: 'Main Company (San Francisco) Order (Ref PO/2026/0005)',
  body_html: '<p>Dear Northwind Components</p><p>Here is in attachment a purchase order <strong>PO/2026/0005</strong> amounting in <strong>USD 1,350.00</strong>.</p><p><a href="/purchase/detail?id=po-demo-005">Acknowledge</a></p>',
  attachment_name: 'Purchase Order - PO/2026/0005.pdf',
  current_user_id: 'user-purchase',
  current_user_name: 'Purchase User',
};

describe('Purchase confirmed-order Send PO composer parity', () => {
  test('maps Odoo action_rfq_send with send_rfq=false to a distinct page-id-bound composer', () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const send = action(api, 'send_confirmed_purchase_order_detail');
    const source = api.datasources.find((candidate: any) => candidate.id === 'purchase_order_po_email_detail');
    const history = api.datasources.find((candidate: any) => candidate.id === 'purchase_order_email_history');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('purchase-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'send_confirmed_purchase_order_detail', label: 'Send PO', permission: 'purchase.write' }));
    expect(send).toMatchObject({
      type: 'server_form',
      modal_style: 'mail_composer',
      title: 'Compose Email',
      submit_label: 'Send',
      cancel_label: 'Discard',
      action: 'purchase.orders.email.send_po',
      permission: 'purchase.write',
      prefill_source: 'purchase_order_po_email_detail',
      handler: 'yaml_mutation',
      operation: 'create',
    });
    expect(send.mutation).toMatchObject({ operation: 'insert', table: 'purchase_order_emails' });
    expect(send.mutation.defaults).toEqual({ state: 'Sent', template_label: 'Purchase Order' });
    expect(send.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'PURCHASE_ORDER_PO_EMAIL_NOT_FOUND',
      'PURCHASE_ORDER_PO_SEND_STALE_OR_INVALID',
      'PURCHASE_ORDER_PO_VENDOR_EMAIL_INVALID',
      'PURCHASE_ORDER_PO_EMAIL_CONTENT_INVALID',
      'PURCHASE_ORDER_PO_EMAIL_ACTOR_REQUIRED',
    ]);
    expect(source.query).toContain("state IN ('Confirmed', 'Received')");
    expect(source.query).toContain('Acknowledge');
    expect(source.query).toContain('Purchase Order - ');
    expect(history.query).toContain('FROM purchase_order_emails');
  });

  test('persists a Purchase Order email for Confirmed without changing workflow state', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/purchase-detail.yaml');
      const send = action(api, 'send_confirmed_purchase_order_detail');
      const prefill = await repository.querySource(api.datasources.find((source: any) => source.id === 'purchase_order_po_email_detail'), { id: message.purchase_order_id, fixture_state: null }, 0, 1);
      expect(prefill.data).toMatchObject({
        state: 'Confirmed',
        recipient_email: message.recipient_email,
        attachment_name: message.attachment_name,
      });
      const created = await repository.executeMutation(send.mutation, message) as any;
      expect(created).toMatchObject({
        id: 'purchase-email-po-demo-005-1',
        purchase_order_id: 'po-demo-005',
        recipient_email: message.recipient_email,
        template_label: 'Purchase Order',
        state: 'Sent',
        sent_by: 'Purchase User',
      });
      expect(await repository.query("SELECT state, row_version FROM purchase_orders WHERE id = 'po-demo-005'")).toEqual([{ state: 'Confirmed', row_version: 1 }]);
      const history = await repository.querySource(api.datasources.find((source: any) => source.id === 'purchase_order_email_history'), { id: 'po-demo-005', fixture_state: null }, 0, 10);
      expect(history.data).toMatchObject([{ action_label: 'Sent Purchase Order', actor_name: 'Purchase User', recipient_email: message.recipient_email }]);
    } finally {
      await database.close();
    }
  });

  test('allows Received and rejects RFQ, stale, invalid, and anonymous sends atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      const send = action(yaml('api/purchase-detail.yaml'), 'send_confirmed_purchase_order_detail');
      const receivedMessage = { ...message, purchase_order_id: 'po-demo-006', recipient_name: 'Saigon Office Goods', recipient_email: 'hello@saigon-office.example', subject: 'Main Company (San Francisco) Order (Ref PO/2026/0006)', attachment_name: 'Purchase Order - PO/2026/0006.pdf' };
      await repository.executeMutation(send.mutation, receivedMessage);
      expect(await repository.query("SELECT state, row_version FROM purchase_orders WHERE id = 'po-demo-006'")).toEqual([{ state: 'Received', row_version: 1 }]);
      await expect(repository.executeMutation(send.mutation, { ...message, purchase_order_id: 'po-demo-001' })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_PO_SEND_STALE_OR_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_PO_SEND_STALE_OR_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, recipient_email: 'invalid' })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_PO_VENDOR_EMAIL_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, subject: ' ' })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_PO_EMAIL_CONTENT_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'PURCHASE_ORDER_PO_EMAIL_ACTOR_REQUIRED' });
      expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_order_emails WHERE purchase_order_id = 'po-demo-001'")).toEqual([{ count: 0 }]);
    } finally {
      await database.close();
    }
  });

  test('keeps confirmed email history through file-backed restart and migration replay', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-purchase-send-po-'));
    const databasePath = join(tempDir, 'purchase.duckdb');
    const migrationName = `purchase_order_send_po_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      await first.repository.executeMutation(action(yaml('api/purchase-detail.yaml'), 'send_confirmed_purchase_order_detail').mutation, message);
      await first.database.close();

      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query("SELECT purchase_order_id, template_label, state FROM purchase_order_emails WHERE purchase_order_id = 'po-demo-005'")).toEqual([
        { purchase_order_id: 'po-demo-005', template_label: 'Purchase Order', state: 'Sent' },
      ]);
      await migrateDatabase(second.repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query("SELECT COUNT(*) AS count FROM purchase_order_emails WHERE purchase_order_id = 'po-demo-005'")).toEqual([{ count: 1 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
