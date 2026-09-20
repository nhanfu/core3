import { describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce reorder parity', () => {
  test('joins the order detail lines and source-backed reorder action', () => {
    const page = yaml('pages/order-detail.yaml');
    const api = yaml('api/order-detail.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-order-detail', route: '/ecommerce/orders/detail' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_order_detail' });
    expect(page.components[0].notebook.tabs[0]).toMatchObject({ id: 'order_lines', label: 'Order Lines' });
    expect(api.page).toEqual({ id: 'ecommerce-order-detail' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_order_detail', 'ecommerce_order_lines']);
    const action = api.actions.find((candidate: any) => candidate.id === 'reorder_ecommerce_order');
    expect(action).toMatchObject({ type: 'server', permission: 'ecommerce.write', action: 'ecommerce.orders.reorder' });
    expect(action.params).toEqual({ id: '{state.ecommerce_order_detail.id}', expected_row_version: '{state.ecommerce_order_detail.row_version}' });
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'ECOMMERCE_ORDER_NOT_FOUND',
      'ECOMMERCE_ORDER_REORDER_FORBIDDEN',
      'ECOMMERCE_ORDER_REORDER_STALE',
      'ECOMMERCE_ORDER_NOT_REORDERABLE',
    ]);
  });

  test('reorders active source lines into the owned open cart and preserves Odoo repeat semantics', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_reorder_test', ['schema', 'data']);
    const api = yaml('api/order-detail.yaml');
    const lines = api.datasources.find((source: any) => source.id === 'ecommerce_order_lines');
    const action = api.actions.find((candidate: any) => candidate.id === 'reorder_ecommerce_order');

    expect((await repository.querySource(lines, { id: 'ecommerce-order-001', customer_scope: 'own', current_user_email: 'buyer@acme.example' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ product_id: 'ecommerce-product-mug', quantity: 1 }),
        expect.objectContaining({ product_id: 'ecommerce-product-chair', quantity: 1 }),
      ]));
    const cart = await repository.executeMutation(action.mutation, {
      id: 'ecommerce-order-001',
      expected_row_version: 1,
      customer_scope: 'own',
      current_user_email: 'buyer@acme.example',
      current_company_name: 'My Company',
    }) as any;
    expect(cart).toMatchObject({ id: 'ecommerce-cart-open-001', customer_id: 'ecommerce-customer-001', state: 'Open', row_version: 2 });
    expect(await repository.query('SELECT product_id, quantity FROM ecommerce_cart_lines WHERE cart_id = ? ORDER BY product_id', ['ecommerce-cart-open-001']))
      .toEqual([
        { product_id: 'ecommerce-product-chair', quantity: 2 },
        { product_id: 'ecommerce-product-mug', quantity: 3 },
      ]);

    const repeated = await repository.executeMutation(action.mutation, {
      id: 'ecommerce-order-001',
      expected_row_version: 1,
      customer_scope: 'own',
      current_user_email: 'buyer@acme.example',
      current_company_name: 'My Company',
    }) as any;
    expect(repeated).toMatchObject({ id: 'ecommerce-cart-open-001', row_version: 3 });
    expect(await repository.query('SELECT product_id, quantity FROM ecommerce_cart_lines WHERE cart_id = ? ORDER BY product_id', ['ecommerce-cart-open-001']))
      .toEqual([
        { product_id: 'ecommerce-product-chair', quantity: 3 },
        { product_id: 'ecommerce-product-mug', quantity: 4 },
      ]);
    database.close();
  });

  test('guards ownership, stale source orders, missing lines, and preserves the cart on rejection', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_reorder_guards_test', ['schema', 'data']);
    const action = yaml('api/order-detail.yaml').actions.find((candidate: any) => candidate.id === 'reorder_ecommerce_order');
    const request = { id: 'ecommerce-order-001', expected_row_version: 1, customer_scope: 'own', current_company_name: 'My Company' };
    await expect(repository.executeMutation(action.mutation, { ...request, current_user_email: 'other@example.com' }))
      .rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_ORDER_REORDER_FORBIDDEN' });
    await expect(repository.executeMutation(action.mutation, { ...request, current_user_email: 'buyer@acme.example', current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_ORDER_REORDER_FORBIDDEN' });
    await expect(repository.executeMutation(action.mutation, { ...request, current_user_email: 'buyer@acme.example', expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ORDER_REORDER_STALE' });
    await expect(repository.executeMutation(action.mutation, { ...request, id: 'ecommerce-order-missing', current_user_email: 'buyer@acme.example' }))
      .rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_ORDER_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { id: 'ecommerce-order-003', expected_row_version: 1, customer_scope: 'all', current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ORDER_NOT_REORDERABLE' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_cart_lines WHERE cart_id = ?', ['ecommerce-cart-open-001']))
      .toEqual([{ count: 2 }]);
    database.close();
  });

  test('persists the selected customer cart and its reorder lines across restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-reorder-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_reorder_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const action = yaml('api/order-detail.yaml').actions.find((candidate: any) => candidate.id === 'reorder_ecommerce_order');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(action.mutation, {
        id: 'ecommerce-order-002',
        expected_row_version: 1,
        customer_scope: 'own',
        current_user_email: 'hello@workspace.example',
        current_company_name: 'My Company',
      }) as any;
      expect(created).toMatchObject({ id: 'ecommerce-cart-ecommerce-customer-002', row_version: 2 });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT product_id, quantity FROM ecommerce_cart_lines WHERE cart_id = ?', ['ecommerce-cart-ecommerce-customer-002']))
        .toEqual([{ product_id: 'ecommerce-product-lamp', quantity: 1 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
