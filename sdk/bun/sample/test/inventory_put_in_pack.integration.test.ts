import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = () => yaml('api/transfer-detail.yaml').actions.find((candidate: any) => candidate.id === 'put_inventory_transfer_in_pack');

describe('Inventory Put in Pack workflow parity', () => {
  test('maps Odoo action_put_in_pack to the transfer form with a permissioned server form', () => {
    const page = yaml('pages/transfer-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(form.header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'put_inventory_transfer_in_pack', label: 'Put in Pack', permission: 'inventory.write' }),
    ]));
    expect(action()).toMatchObject({
      type: 'server_form', permission: 'inventory.write', action: 'stock.picking.put_in_pack', operation: 'put_in_pack',
    });
    expect(action().fields.map((field: any) => field.field)).toEqual(['package_name', 'package_type_name']);
    expect(action().mutation).toMatchObject({ generated: ['package_id', 'message_id'], concurrency: { required: true } });
    expect(action().mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_TRANSFER_PACK_NOT_ALLOWED', status: 409 }),
      expect.objectContaining({ code: 'INVENTORY_TRANSFER_ALREADY_PACKED', status: 409 }),
      expect.objectContaining({ code: 'INVENTORY_PACKAGE_NAME_REQUIRED', status: 422 }),
    ]));
  });

  test('creates a durable package, contents, source relation, and timeline event', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_put_in_pack_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const putInPack = action();

    const packed = await repository.executeMutation(putInPack.mutation, {
      id: 'delivery-00002', expected_row_version: 1, package_name: 'PACK-QA-0003', package_type_name: 'Box', current_user_name: 'Inventory Manager',
    }) as any;
    expect(packed).toMatchObject({ name: 'PACK-QA-0003', package_type_name: 'Box', location_name: 'Customers', state: 'Customer location', content_count: 1, row_version: 2 });
    expect(await repository.query('SELECT package_id, move_id, relation_type FROM inventory_package_move_lines WHERE package_id = ?', [packed.id])).toEqual([
      expect.objectContaining({ package_id: packed.id, move_id: 'delivery-00002-move-001', relation_type: 'result' }),
    ]);
    expect(await repository.query('SELECT product_name, quantity FROM inventory_package_contents WHERE package_id = ?', [packed.id])).toEqual([
      { product_name: 'Desk Combination', quantity: 5 },
    ]);
    expect((await repository.query('SELECT state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-00002']))[0]).toEqual({ state: 'Ready', row_version: 2 });
    expect((await repository.query("SELECT action, action_label FROM inventory_transfer_messages WHERE picking_id = 'delivery-00002' ORDER BY created_at DESC, id DESC LIMIT 1", []))[0]).toEqual({ action: 'inventory.transfer.packed', action_label: 'Put in Pack' });
    await expect(repository.executeMutation(putInPack.mutation, {
      id: 'delivery-00002', expected_row_version: 2, package_name: 'PACK-QA-0004', package_type_name: 'Box', current_user_name: 'Inventory Manager',
    })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_ALREADY_PACKED' });
    database.close();
  });

  test('enforces permission, stale, duplicate, state, and restart boundaries', async () => {
    const databasePath = `/tmp/core3-inventory-put-in-pack-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_put_in_pack_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const putInPack = action();
      const user: any = { sub: 'inventory-user', permissions: ['inventory.read'] };
      const api = createYamlApi({
        repository: firstRepository,
        authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(), pageSources: new Map(), pages: new Map([['transfer-detail', { actions: [putInPack] }]]),
        catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.write'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(api(new Request('http://inventory.test/api/mutate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mutation: 'stock.picking.put_in_pack', id: 'delivery-00002', expected_row_version: '1', package_name: 'PACK-DENIED' }) }), new URL('http://inventory.test/api/mutate'))).rejects.toMatchObject({ status: 403 });
      await expect(firstRepository.executeMutation(putInPack.mutation, { id: 'delivery-00002', expected_row_version: 99, package_name: 'PACK-STale', current_user_name: 'Inventory Manager' })).rejects.toMatchObject({ status: 409 });
      await expect(firstRepository.executeMutation(putInPack.mutation, { id: 'receipt-00001', expected_row_version: 1, package_name: 'PACK-READY', current_user_name: 'Inventory Manager' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_ALREADY_PACKED' });
      await expect(firstRepository.executeMutation(putInPack.mutation, { id: 'delivery-00002', expected_row_version: 1, package_name: '', current_user_name: 'Inventory Manager' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PACKAGE_NAME_REQUIRED' });
      await expect(firstRepository.executeMutation(putInPack.mutation, { id: 'delivery-00002', expected_row_version: 1, package_name: 'PACK-QA-0003', current_user_name: 'Inventory Manager' })).resolves.toBeDefined();
      const packed = (await firstRepository.query("SELECT id FROM inventory_packages WHERE name = 'PACK-QA-0003'", []))[0].id;
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await secondRepository.query('SELECT name, content_count FROM inventory_packages WHERE id = ?', [packed]))[0]).toEqual({ name: 'PACK-QA-0003', content_count: 1 });
      expect((await secondRepository.query('SELECT COUNT(*) AS count FROM inventory_package_contents WHERE package_id = ?', [packed]))[0].count).toBe(1);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
