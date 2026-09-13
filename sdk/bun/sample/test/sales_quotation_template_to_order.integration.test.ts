import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_template_to_order', ['schema', 'data']);
  return { database, repository };
}

describe('Sales quotation template to order workflow', () => {
  test('declares a permissioned atomic action with template and branch guards', () => {
    const api = yaml('api/sale-quotation-template-detail.yaml');
    const page = yaml('pages/sale-quotation-template-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_sale_order_from_template');
    expect(action).toMatchObject({
      type: 'server_form',
      permission: 'orders.write',
      action: 'sales.quotation_templates.create_order',
      operation: 'create',
    });
    expect(action.mutation).toMatchObject({ table: 'orders', operation: 'insert', scope: { table: 'orders', field: 'branch_id' } });
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SALES_QUOTATION_TEMPLATE_NOT_FOUND', 'STALE_RECORD', 'DUPLICATE_ORDER',
      'SALES_ORDER_CUSTOMER_INVALID', 'SALES_QUOTATION_TEMPLATE_LINE_INVALID', 'SALES_ORDER_ID_EXISTS',
    ]);
    expect(action.mutation.steps).toHaveLength(3);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'create_sale_order_from_template', permission: 'orders.write' }));
  });

  test('creates deterministic draft order and persists every template line atomically', async () => {
    const { database, repository } = await repositoryForTest();
    const api = yaml('api/sale-quotation-template-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_sale_order_from_template');
    const input = {
      template_id: 'sale-quotation-template-office-furnitures',
      template_expected_row_version: 1,
      view_scope: 'branch',
      current_branch_id: 'branch-hcm',
      current_user_id: 'user-admin',
      current_user_name: 'Admin User',
      values: {
        order_number: 'SO/TEMPLATE/001',
        customer_name: 'Công ty TNHH Minh Long',
        customer_legal_name: 'Minh Long Logistics Co., Ltd.',
        order_date: '2026-09-13',
        validity_date: '2026-10-13',
        pricelist_name: 'Public Pricelist',
      },
    };
    const created = await repository.executeMutation(action.mutation, input);
    expect(created).toMatchObject({
      id: 'sale-order-so-template-001',
      order_number: 'SO/TEMPLATE/001',
      customer_name: 'Công ty TNHH Minh Long',
      status: 'Draft',
      branch_id: 'branch-hcm',
      total_amount: 1750,
    });
    const lines = await repository.query('SELECT sequence, product_id, quantity, unit_price, line_total FROM order_lines WHERE order_id = ? ORDER BY sequence', [created.id]);
    expect(lines).toEqual([{ sequence: 10, product_id: 'product-demo-005', quantity: 5, unit_price: 350, line_total: 1750 }]);
    const activity = await repository.query('SELECT action, resource_id FROM system_activity WHERE resource_id = ?', [created.id]);
    expect(activity).toEqual([{ action: 'sales.quotation_templates.create_order', resource_id: created.id }]);
    await database.close();
  }, 30000);

  test('rejects stale, duplicate, invalid, missing, and out-of-scope inputs without partial inserts', async () => {
    const { database, repository } = await repositoryForTest();
    const api = yaml('api/sale-quotation-template-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_sale_order_from_template');
    const base = {
      template_id: 'sale-quotation-template-office-furnitures', template_expected_row_version: 1,
      view_scope: 'branch', current_branch_id: 'branch-hn', current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { order_number: 'SO/TEMPLATE/002', customer_name: 'Công ty TNHH Minh Long', order_date: '2026-09-13' },
    };
    await expect(repository.executeMutation(action.mutation, { ...base, template_expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action.mutation, { ...base, template_id: 'missing-template' })).rejects.toMatchObject({ status: 404, code: 'SALES_QUOTATION_TEMPLATE_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...base, values: { ...base.values, customer_name: 'Unknown Customer' } })).rejects.toMatchObject({ status: 422, code: 'SALES_ORDER_CUSTOMER_INVALID' });

    await repository.executeMutation(action.mutation, { ...base, values: { ...base.values, order_number: 'SO/TEMPLATE/003' } });
    await expect(repository.executeMutation(action.mutation, { ...base, values: { ...base.values, order_number: 'SO/TEMPLATE/003' } })).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_ORDER' });

    const badLine = yaml('api/sale-quotation-template-detail.yaml').actions.find((candidate: any) => candidate.id === 'add_sale_quotation_template_line');
    await repository.executeMutation(badLine.mutation, { values: { template_id: base.template_id, product_name: 'Unavailable Product', quantity: 1 } });
    const before = await repository.query('SELECT COUNT(*) AS count FROM orders WHERE order_number = ?', ['SO/TEMPLATE/004']);
    await expect(repository.executeMutation(action.mutation, { ...base, values: { ...base.values, order_number: 'SO/TEMPLATE/004' } })).rejects.toMatchObject({ status: 422, code: 'SALES_QUOTATION_TEMPLATE_LINE_INVALID' });
    const after = await repository.query('SELECT COUNT(*) AS count FROM orders WHERE order_number = ?', ['SO/TEMPLATE/004']);
    expect(before).toEqual([{ count: 0 }]);
    expect(after).toEqual([{ count: 0 }]);
    await database.close();
  }, 30000);
});
