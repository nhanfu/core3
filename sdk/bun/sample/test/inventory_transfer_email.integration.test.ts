import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const receiptPage = yaml('pages/receipts.yaml');
const receiptApi = yaml('api/transfers.yaml');
const deliveryPage = yaml('pages/deliveries.yaml');
const deliveryApi = yaml('api/deliveries.yaml');
const receiptAction = receiptApi.actions.find((candidate: any) => candidate.id === 'send_inventory_receipt_email');
const deliveryAction = deliveryApi.actions.find((candidate: any) => candidate.id === 'send_inventory_delivery_email');
const detailApi = yaml('api/transfer-detail.yaml');
const source = (id: string) => detailApi.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  id: 'delivery-email-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator',
  recipient_email: 'customer@example.com', subject: 'Delivery update', body: 'Your transfer is ready for review.',
};

describe('Inventory transfer email parity', () => {
  test('maps Odoo list/kanban Send email to separate Receipts/Deliveries API actions', () => {
    expect(receiptPage.datasources).toBeUndefined();
    expect(deliveryPage.datasources).toBeUndefined();
    expect(receiptApi.page.id).toBe('receipts');
    expect(deliveryApi.page.id).toBe('deliveries');
    expect(receiptPage.components[0].actions).toContainEqual(expect.objectContaining({ id: 'send_inventory_receipt_email', label: 'Send email', permission: 'inventory.write' }));
    expect(deliveryPage.components[0].actions).toContainEqual(expect.objectContaining({ id: 'send_inventory_delivery_email', label: 'Send email', permission: 'inventory.write' }));
    expect(receiptAction).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.picking.action_lead_mass_mail', operation: 'queue_email', handler: 'yaml_mutation' });
    expect(deliveryAction).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.picking.action_lead_mass_mail', operation: 'queue_email', handler: 'yaml_mutation' });
    expect(source('inventory_transfer_email_runs').query).toContain('inventory_transfer_email_runs');
  });

  test('queues a durable delivery email, updates the source row, and records the actor timeline', async () => {
    const db = await repository('inventory_transfer_email_create_test');
    const result = await db.executeMutation(deliveryAction.mutation, values) as any;
    expect(result).toMatchObject({ id: 'transfer-email-delivery-email-0001-1', recipient_email: 'customer@example.com', subject: 'Delivery update', queued_by: 'Inventory Operator', state: 'Queued', row_version: 1 });
    expect(await db.query('SELECT row_version FROM inventory_pickings WHERE id = ?', ['delivery-email-0001'])).toEqual([{ row_version: 2 }]);
    expect((await db.querySource(source('inventory_transfer_email_runs'), { id: 'delivery-email-0001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ recipient_email: 'customer@example.com', state: 'Queued', queued_by: 'Inventory Operator' });
    expect((await db.querySource(source('inventory_transfer_timeline'), { id: 'delivery-email-0001', fixture_state: null }, 0, 10)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'inventory.transfer.email_queued', action_label: 'Email queued', actor_name: 'Inventory Operator' }),
    ]));
    await migrateDatabase(db, serviceRoot + '/migrations', undefined, 'inventory_transfer_email_create_test', ['schema', 'data']);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_email_runs')).toEqual([{ count: 1 }]);
  });

  test('enforces company, actor, row-version, state, content, and email guards without partial outbox state', async () => {
    const db = await repository('inventory_transfer_email_guards_test');
    await expect(db.executeMutation(deliveryAction.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(deliveryAction.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTOR_REQUIRED' });
    await expect(db.executeMutation(deliveryAction.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_EMAIL_NOT_ALLOWED' });
    await expect(db.executeMutation(deliveryAction.mutation, { ...values, recipient_email: 'not-an-email' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_EMAIL_INVALID' });
    await expect(db.executeMutation(deliveryAction.mutation, { ...values, subject: '' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_EMAIL_CONTENT_INVALID' });
    await db.run("UPDATE inventory_pickings SET state = 'Cancelled' WHERE id = ?", ['delivery-email-0001']);
    await expect(db.executeMutation(deliveryAction.mutation, values)).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_EMAIL_NOT_ALLOWED' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_email_runs')).toEqual([{ count: 0 }]);
  });

  test('preserves queued email history across restart and enforces the write permission boundary', async () => {
    const databasePath = `/tmp/core3-inventory-email-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_transfer_email_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(receiptAction.mutation, { ...values, id: 'receipt-00001', expected_row_version: 1, current_company_name: 'My Company', current_user_name: 'Restart Operator' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT recipient_email, queued_by, state FROM inventory_transfer_email_runs WHERE picking_id = ?', ['receipt-00001'])).toEqual([{ recipient_email: 'customer@example.com', queued_by: 'Restart Operator', state: 'Queued' }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_email_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(deliveryApi.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['deliveries', deliveryApi.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['deliveries', { ...deliveryPage, actions: deliveryApi.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-email-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.action_lead_mass_mail', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { ...values, current_company_name: 'Core3 Demo Company' } }) }), new URL('http://inventory.test/api/actions/stock.picking.action_lead_mass_mail'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
