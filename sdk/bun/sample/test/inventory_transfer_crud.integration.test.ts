import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`api/${file}`).actions.find((candidate: any) => candidate.id === id);

describe('Inventory transfer create and delete persistence', () => {
  test('declares receipt creation and draft deletion with inventory write boundaries', () => {
    const create = action('transfers.yaml', 'create_inventory_receipt');
    const remove = action('transfer-detail.yaml', 'delete_inventory_transfer');

    expect(create).toMatchObject({ type: 'server_form', permission: 'inventory.write', operation: 'create' });
    expect(create.mutation).toMatchObject({
      operation: 'insert',
      table: 'inventory_pickings',
      fields: expect.arrayContaining(['operation_type_id', 'name', 'scheduled_date']),
      defaults: expect.objectContaining({ state: 'Draft', row_version: 1 }),
    });
    expect(remove).toMatchObject({ type: 'server', permission: 'inventory.write', operation: 'delete' });
    expect(remove.mutation).toMatchObject({ operation: 'delete', table: 'inventory_pickings', concurrency: { required: true } });
    expect(remove.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'INVENTORY_TRANSFER_DELETE_NOT_ALLOWED' }),
    ]));
    expect(yaml('pages/receipts.yaml').components[0].create_action).toBe('create_inventory_receipt');
    expect(yaml('pages/transfer-detail.yaml').components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delete_inventory_transfer', permission: 'inventory.write' }),
    ]));
  });

  test('persists a new draft receipt and deletes it with its move history', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_transfer_crud_test', ['schema', 'data']);

    const created = await repository.executeMutation(action('transfers.yaml', 'create_inventory_receipt').mutation, {
      name: 'WH/IN/QA-00001', contact_name: 'QA Partner', scheduled_date: '2026-01-21', source_document: 'PO/QA-00001',
    }) as any;
    expect(created).toMatchObject({ id: 'receipt-wh-in-qa-00001', name: 'WH/IN/QA-00001', state: 'Draft', row_version: 1 });

    await repository.run('INSERT INTO inventory_picking_moves(id, picking_id, product_name, quantity, done_quantity) VALUES (?, ?, ?, ?, ?)', [
      'qa-move-00001', created.id, 'QA Product', 2, 0,
    ]);
    await repository.executeMutation(action('transfer-detail.yaml', 'delete_inventory_transfer').mutation, { id: created.id, expected_row_version: 1 });
    expect((await repository.querySource(yaml('api/transfer-detail.yaml').datasources[0], { id: created.id, fixture_state: null }, 0, 1)).data).toEqual({});
    expect(await repository.query('SELECT * FROM inventory_picking_moves WHERE picking_id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('rejects duplicate, stale, and non-draft deletion attempts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_transfer_crud_guards_test', ['schema', 'data']);
    const create = action('transfers.yaml', 'create_inventory_receipt').mutation;
    await repository.executeMutation(create, { name: 'WH/IN/QA-00002', scheduled_date: '2026-01-22' });
    await expect(repository.executeMutation(create, { name: 'WH/IN/QA-00002', scheduled_date: '2026-01-22' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_RECEIPT_EXISTS' });
    const remove = action('transfer-detail.yaml', 'delete_inventory_transfer').mutation;
    await expect(repository.executeMutation(remove, { id: 'receipt-00003', expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_DELETE_NOT_ALLOWED' });
    await expect(repository.executeMutation(remove, { id: 'receipt-00001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_DELETE_NOT_ALLOWED' });
    database.close();
  });
});
