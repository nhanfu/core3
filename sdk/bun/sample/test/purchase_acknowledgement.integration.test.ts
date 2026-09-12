import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Purchase Acknowledge action parity', () => {
  test('binds the exact Odoo action to the existing detail page and API', () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const action = api.actions.find((item: any) => item.id === 'acknowledge_purchase_order_detail');

    expect(page.page.id).toBe('purchase-detail');
    expect(api.page.id).toBe('purchase-detail');
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'acknowledge_purchase_order_detail', label: 'Acknowledge', permission: 'purchase.write' }));
    expect(action).toMatchObject({ type: 'server', permission: 'purchase.write', action: 'purchase.orders.acknowledge', operation: 'update' });
    expect(action.mutation.guards[0].status).toBe(409);
    expect(action.mutation.concurrency).toEqual({ required: true });
  });

  test('acknowledges a confirmed deterministic order and rejects stale, locked, and invalid states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'purchase_acknowledgement_test_schema_migrations', ['schema', 'data']);
    const action = yaml('api/purchase-detail.yaml').actions.find((item: any) => item.id === 'acknowledge_purchase_order_detail');

    const before = (await repository.query("SELECT id, state, acknowledged, acknowledged_at, row_version FROM purchase_orders WHERE id = 'po-demo-005'"))[0] as any;
    expect(before).toMatchObject({ id: 'po-demo-005', state: 'Confirmed', acknowledged: false, acknowledged_at: null, row_version: 1 });
    const updated = await repository.executeMutation(action.mutation, { id: 'po-demo-005', expected_row_version: 1 }) as any;
    expect(updated).toMatchObject({ id: 'po-demo-005', acknowledged: true, acknowledged_at: '2026-01-15T00:00:00.000Z', row_version: 2 });
    await expect(repository.executeMutation(action.mutation, { id: 'po-demo-005', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_ACKNOWLEDGE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { id: 'po-demo-006', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_ACKNOWLEDGE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { id: 'po-demo-002', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_ACKNOWLEDGE_INVALID' });
  });
});
