import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/sale-order-detail.yaml');
const api = yaml('api/sale-order-detail.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'update_sale_order_prices');
const actor = { view_scope: 'all', current_branch_id: 'branch-hcm', current_user_id: 'user-sales', current_user_name: 'Sales User' };

async function openRepository() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'sales_order_update_prices_migrations', ['schema', 'data']);
  return { database, repository };
}

async function executeSql(database: DuckDbDatabase, sql: string, params: any[] = []) {
  const connection = database.connect();
  try {
    await connection.run(sql, params);
  } finally {
    connection.close();
  }
}

describe('Sales order Update Prices parity', () => {
  test('maps Odoo action_update_prices to the dedicated Sales order page/API contract', () => {
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/sale/models/sale_order.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/sale/views/sale_order_views.xml', 'utf8');

    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'update_sale_order_prices', label: 'Update Prices', permission: 'orders.write' }));
    expect(api.page).toEqual(page.page && { id: 'sale-order-detail' });
    expect(action).toMatchObject({ type: 'server', action: 'sale.orders.update_prices', permission: 'orders.write', operation: 'update_prices' });
    expect(action.mutation.concurrency).toEqual({ required: true });
    expect(source).toContain('def action_update_prices(self):');
    expect(source).toContain('self._recompute_prices()');
    expect(view).toContain('name="action_update_prices"');
    expect(view).toContain('string="Update Prices"');
  });

  test('recomputes pricelist prices, resets discounts, persists totals, and audits the workflow', async () => {
    const { database, repository } = await openRepository();
    try {
      await executeSql(database, 'UPDATE orders SET pricelist_name = ?, row_version = 1 WHERE id = ?', ['Wholesale Pricelist', 'order-demo-01']);
      await executeSql(database,
        "UPDATE order_lines SET product_id = 'product-demo-002', quantity = 10, unit_price = 999, discount = 15, tax_rate = 10, price_subtotal = 8491.5, price_tax = 849.15, price_total = 9340.65, line_total = 9340.65, row_version = 1 WHERE id = 'order-line-demo-01'",
      );

      const result = await repository.executeMutation(action.mutation, { id: 'order-demo-01', expected_row_version: 1, ...actor });
      expect(result).toMatchObject({ id: 'order-demo-01', row_version: 2 });
      expect(await repository.query("SELECT unit_price, discount, price_subtotal, price_tax, price_total, line_total, row_version FROM order_lines WHERE id = 'order-line-demo-01'"))
        .toEqual([{ unit_price: 218.75, discount: 0, price_subtotal: 2187.5, price_tax: 218.75, price_total: 2406.25, line_total: 2406.25, row_version: 2 }]);
      expect(await repository.query("SELECT total_amount FROM orders WHERE id = 'order-demo-01'"))
        .toEqual([{ total_amount: 2406.25 }]);
      expect(await repository.query("SELECT action, actor_name, detail FROM system_activity WHERE action = 'sale.orders.update_prices' AND resource_id = 'order-demo-01'"))
        .toEqual([{ action: 'sale.orders.update_prices', actor_name: 'Sales User', detail: 'Recomputed product prices from Wholesale Pricelist' }]);
    } finally {
      await database.close();
    }
  }, 30000);

  test('rejects missing, out-of-scope, confirmed, stale, inactive-pricelist, and anonymous updates', async () => {
    const { database, repository } = await openRepository();
    try {
      await expect(repository.executeMutation(action.mutation, { id: 'missing-order', expected_row_version: 1, ...actor }))
        .rejects.toMatchObject({ status: 404, code: 'SALE_ORDER_PRICE_UPDATE_NOT_FOUND' });
      await expect(repository.executeMutation(action.mutation, { id: 'order-demo-01', expected_row_version: 1, ...actor, view_scope: 'branch', current_branch_id: 'branch-hn' }))
        .rejects.toMatchObject({ status: 403, code: 'SALE_ORDER_PRICE_UPDATE_SCOPE_FORBIDDEN' });
      await expect(repository.executeMutation(action.mutation, { id: 'order-demo-03', expected_row_version: 1, ...actor }))
        .rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_PRICE_UPDATE_NOT_ALLOWED' });
      await executeSql(database, 'UPDATE orders SET pricelist_name = ? WHERE id = ?', ['Wholesale Pricelist', 'order-demo-01']);
      await expect(repository.executeMutation(action.mutation, { id: 'order-demo-01', expected_row_version: 99, ...actor }))
        .rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_PRICE_UPDATE_NOT_ALLOWED' });
      await executeSql(database, 'UPDATE orders SET pricelist_name = ? WHERE id = ?', ['Missing Pricelist', 'order-demo-01']);
      await expect(repository.executeMutation(action.mutation, { id: 'order-demo-01', expected_row_version: 1, ...actor }))
        .rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_PRICE_UPDATE_NOT_ALLOWED' });
      await executeSql(database, 'UPDATE orders SET pricelist_name = ? WHERE id = ?', ['Wholesale Pricelist', 'order-demo-01']);
      await expect(repository.executeMutation(action.mutation, { id: 'order-demo-01', expected_row_version: 1, ...actor, current_user_name: '' }))
        .rejects.toMatchObject({ status: 403, code: 'SALE_ORDER_PRICE_UPDATE_ACTOR_REQUIRED' });
      expect(await repository.query("SELECT row_version FROM orders WHERE id = 'order-demo-01'"))
        .toEqual([{ row_version: 1 }]);
    } finally {
      await database.close();
    }
  }, 30000);
});
