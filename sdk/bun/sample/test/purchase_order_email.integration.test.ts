import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `purchase_order_email_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

const message = {
  purchase_order_id: 'po-demo-001',
  expected_row_version: 1,
  recipient_name: 'Lotus Industrial Supply',
  recipient_email: 'sales@lotus.example',
  subject: 'Main Company (San Francisco) Order (Ref PO/2026/0001)',
  body_html: '<p>Dear Lotus Industrial Supply</p><p>Here is in attachment a request for quotation <strong>PO/2026/0001</strong>.</p>',
  attachment_name: 'Request for Quotation - PO/2026/0001.pdf',
  current_user_id: 'user-purchase',
  current_user_name: 'Purchase User',
};

describe('Purchase RFQ email composer parity', () => {
  test('maps Odoo action_rfq_send to a page-id-bound mail composer', () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const send = action(api, 'send_purchase_order_detail');
    const history = api.datasources.find((candidate: any) => candidate.id === 'purchase_order_email_history');
    const source = api.datasources.find((candidate: any) => candidate.id === 'purchase_order_detail');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('purchase-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'send_purchase_order_detail', label: 'Send RFQ', permission: 'purchase.write' }));
    expect(send).toMatchObject({
      type: 'server_form',
      modal_style: 'mail_composer',
      title: 'Compose Email',
      submit_label: 'Send',
      cancel_label: 'Discard',
      action: 'purchase.orders.email.send_rfq',
      permission: 'purchase.write',
      handler: 'yaml_mutation',
      operation: 'create',
    });
    expect(send.mutation).toMatchObject({ operation: 'insert', table: 'purchase_order_emails' });
    expect(send.mutation.fields).toEqual(expect.arrayContaining(['recipient_name', 'recipient_email', 'subject', 'body_html', 'attachment_name']));
    expect(send.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'PURCHASE_ORDER_EMAIL_NOT_FOUND',
      'PURCHASE_ORDER_RFQ_SEND_STALE_OR_INVALID',
      'PURCHASE_ORDER_VENDOR_EMAIL_INVALID',
      'PURCHASE_ORDER_EMAIL_CONTENT_INVALID',
      'PURCHASE_ORDER_EMAIL_ACTOR_REQUIRED',
    ]);
    expect(source.query).toContain('AS recipient_email');
    expect(source.query).toContain('AS body_html');
    expect(history.query).toContain('FROM purchase_order_emails');
    expect(form.message_source).toBe('purchase_order_email_history');
  });

  test('persists a rendered RFQ email, transitions Draft to Sent, and exposes history', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/purchase-detail.yaml');
      const send = action(api, 'send_purchase_order_detail');
      const created = await repository.executeMutation(send.mutation, message) as any;
      expect(created).toMatchObject({
        id: 'purchase-email-po-demo-001-1',
        purchase_order_id: 'po-demo-001',
        recipient_email: 'sales@lotus.example',
        template_label: 'Request for Quotation',
        state: 'Sent',
        sent_by: 'Purchase User',
      });
      expect(await repository.query("SELECT state, row_version FROM purchase_orders WHERE id = 'po-demo-001'")).toEqual([{ state: 'Sent', row_version: 2 }]);
      const detail = await repository.querySource(api.datasources.find((source: any) => source.id === 'purchase_order_detail'), { id: 'po-demo-001', fixture_state: null }, 0, 1);
      expect(detail.data).toMatchObject({ state: 'Sent', row_version: 2, recipient_email: 'sales@lotus.example', attachment_name: 'Request for Quotation - PO/2026/0001.pdf' });
      const history = await repository.querySource(api.datasources.find((source: any) => source.id === 'purchase_order_email_history'), { id: 'po-demo-001', fixture_state: null }, 0, 10);
      expect(history.data).toMatchObject([{ action: 'purchase.orders.email.message', action_label: 'Sent Request for Quotation', actor_name: 'Purchase User', recipient_email: 'sales@lotus.example' }]);
    } finally {
      await database.close();
    }
  });

  test('rejects stale, invalid content, missing actor, and vendor-email failures atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      const send = action(yaml('api/purchase-detail.yaml'), 'send_purchase_order_detail');
      await expect(repository.executeMutation(send.mutation, { ...message, purchase_order_id: 'missing-order' })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_ORDER_EMAIL_NOT_FOUND' });
      await expect(repository.executeMutation(send.mutation, { ...message, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_RFQ_SEND_STALE_OR_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, recipient_email: 'invalid' })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_VENDOR_EMAIL_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, subject: ' ' })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_EMAIL_CONTENT_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'PURCHASE_ORDER_EMAIL_ACTOR_REQUIRED' });
      await repository.query("UPDATE purchase_vendors SET email = NULL WHERE id = 'vendor-demo-001'");
      await expect(repository.executeMutation(send.mutation, message)).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_VENDOR_EMAIL_INVALID' });
      expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_order_emails WHERE purchase_order_id = 'po-demo-001'")).toEqual([{ count: 0 }]);
      expect(await repository.query("SELECT state, row_version FROM purchase_orders WHERE id = 'po-demo-001'")).toEqual([{ state: 'Draft', row_version: 1 }]);
    } finally {
      await database.close();
    }
  });

  test('keeps sent email history through file-backed restart and migration replay', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-purchase-order-email-'));
    const databasePath = join(tempDir, 'purchase.duckdb');
    const migrationName = `purchase_order_email_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      await first.repository.executeMutation(action(yaml('api/purchase-detail.yaml'), 'send_purchase_order_detail').mutation, message);
      await first.database.close();

      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query("SELECT purchase_order_id, recipient_email, state FROM purchase_order_emails WHERE purchase_order_id = 'po-demo-001'")).toEqual([
        { purchase_order_id: 'po-demo-001', recipient_email: 'sales@lotus.example', state: 'Sent' },
      ]);
      await migrateDatabase(second.repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query("SELECT COUNT(*) AS count FROM purchase_order_emails WHERE purchase_order_id = 'po-demo-001'")).toEqual([{ count: 1 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
