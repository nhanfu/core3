import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/sale-order-detail.yaml').actions.find((candidate: any) => candidate.id === id);
const actor = { view_scope: 'all', current_branch_id: 'branch-hcm', current_user_id: 'user-manager', current_user_name: 'Sales Manager' };

describe('Sales order lock and unlock parity', () => {
  test('maps Odoo manager-only Lock and Unlock actions and exposes the locked field', () => {
    const page = yaml('pages/sale-order-detail.yaml');
    const api = yaml('api/sale-order-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['orders.read', 'orders.write', 'orders.approve', 'orders.manage']));
    expect(form.header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'lock_sale_order', label: 'Lock', permission: 'orders.manage', show_if: "state.sale_order_detail.status === 'Sales Order' && !state.sale_order_detail.locked" }),
      expect.objectContaining({ id: 'unlock_sale_order', label: 'Unlock', permission: 'orders.manage', show_if: 'state.sale_order_detail.locked' }),
    ]));
    expect(form.notebook.tabs[1].groups[0].fields).toContainEqual({ field: 'locked', label: 'Locked', type: 'checkbox', readonly: true });
    expect(api.datasources.find((source: any) => source.id === 'sale_order_detail').query).toContain('COALESCE(o.locked, false) AS locked');
    expect(action('lock_sale_order')).toMatchObject({ type: 'server', action: 'sale.orders.lock', permission: 'orders.manage', operation: 'update' });
    expect(action('unlock_sale_order')).toMatchObject({ type: 'server', action: 'sale.orders.unlock', permission: 'orders.manage', operation: 'update' });
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/sale/models/sale_order.py', 'utf8')).toContain('def action_lock(self):');
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/sale/models/sale_order.py', 'utf8')).toContain('def action_unlock(self):');
  });

  test('locks and unlocks only unchanged confirmed orders, preserving durable audit history', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'sales_order_lock_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'sales_order_lock_schema_migrations', ['schema', 'data']);
    try {
      const lock = action('lock_sale_order');
      const unlock = action('unlock_sale_order');
      expect((await repository.query("SELECT locked, row_version FROM orders WHERE id = 'order-demo-03'"))[0]).toEqual({ locked: false, row_version: 1 });
      await expect(repository.executeMutation(lock.mutation, { id: 'order-demo-03', expected_row_version: 1, ...actor })).resolves.toMatchObject({ id: 'order-demo-03', locked: true });
      expect((await repository.query("SELECT locked, row_version FROM orders WHERE id = 'order-demo-03'"))[0]).toEqual({ locked: true, row_version: 2 });
      await expect(repository.executeMutation(lock.mutation, { id: 'order-demo-03', expected_row_version: 2, ...actor })).rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_LOCK_INVALID' });
      await expect(repository.executeMutation(unlock.mutation, { id: 'order-demo-03', expected_row_version: 2, ...actor })).resolves.toMatchObject({ id: 'order-demo-03', locked: false });
      expect((await repository.query("SELECT locked, row_version FROM orders WHERE id = 'order-demo-03'"))[0]).toEqual({ locked: false, row_version: 3 });
      await expect(repository.executeMutation(unlock.mutation, { id: 'order-demo-03', expected_row_version: 3, ...actor })).rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_UNLOCK_INVALID' });
      expect(await repository.query("SELECT action, actor_name, detail FROM system_activity WHERE resource_id = 'order-demo-03' AND action IN ('sale.orders.lock', 'sale.orders.unlock') ORDER BY created_at, id")).toEqual([
        { action: 'sale.orders.lock', actor_name: 'Sales Manager', detail: 'Locked sales order' },
        { action: 'sale.orders.unlock', actor_name: 'Sales Manager', detail: 'Unlocked sales order' },
      ]);
    } finally {
      await database.close();
    }
  });

  test('rejects stale, out-of-scope, non-confirmed, and missing orders without mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'sales_order_lock_guard_migrations', ['schema', 'data']);
    try {
      const lock = action('lock_sale_order');
      await expect(repository.executeMutation(lock.mutation, { id: 'missing', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 404, code: 'SALE_ORDER_LOCK_NOT_FOUND' });
      await expect(repository.executeMutation(lock.mutation, { id: 'order-demo-01', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_LOCK_INVALID' });
      await expect(repository.executeMutation(lock.mutation, { id: 'order-demo-03', expected_row_version: 1, ...actor, view_scope: 'branch', current_branch_id: 'branch-hn' })).rejects.toMatchObject({ status: 403, code: 'SALE_ORDER_LOCK_SCOPE_FORBIDDEN' });
      await expect(repository.executeMutation(lock.mutation, { id: 'order-demo-03', expected_row_version: 99, ...actor })).rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_LOCK_INVALID' });
      expect(await repository.query("SELECT locked, row_version FROM orders WHERE id = 'order-demo-03'")).toEqual([{ locked: false, row_version: 1 }]);
    } finally {
      await database.close();
    }
  });
});
