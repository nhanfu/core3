import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/sale-order-detail.yaml');
const page = yaml('pages/sale-order-detail.yaml');
const discount = api.actions.find((candidate: any) => candidate.id === 'apply_sale_order_discount');

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'sales_order_discount_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'sales_order_discount_test_migrations', ['schema', 'data']);
  return { database, repository };
}

const actor = {
  view_scope: 'all',
  current_branch_id: 'branch-hcm',
  current_user_id: 'user-admin',
  current_user_name: 'Admin User',
};

const values = (discountType: string, percentage = 10, amount = 0) => ({
  discount_type: discountType,
  discount_percentage: percentage,
  discount_amount: amount,
});

describe('Sales order discount wizard parity slice', () => {
  test('declares the Odoo wizard surface on the dedicated Sales order contract', () => {
    const lines = page.components.find((component: any) => component.type === 'LineItemGrid');
    expect(lines.actions).toContainEqual(expect.objectContaining({ id: 'apply_sale_order_discount', label: 'Discount', permission: 'orders.write' }));
    expect(discount).toMatchObject({ type: 'server_form', title: 'Discount', submit_label: 'Apply', cancel_label: 'Discard', permission: 'orders.write' });
    expect(discount.fields.find((field: any) => field.field === 'discount_type')).toMatchObject({ type: 'radio' });
    expect(discount.fields.find((field: any) => field.field === 'discount_type').options.map((option: any) => option.label))
      .toEqual(['On All Order Lines', 'Global Discount', 'Fixed Amount']);
    expect(discount.mutation.guards.map((guard: any) => guard.status)).toEqual([403, 409, 422, 422, 409]);
  });

  test('applies a percentage to every accountable line, recomputes totals, audits, and reopens after replay', async () => {
    const { database, repository } = await repositoryForTest();
    const initial = (await repository.query('SELECT row_version, total_amount FROM orders WHERE id = ?', ['order-demo-01']))[0];
    const before = (await repository.query("SELECT price_total FROM order_lines WHERE order_id = 'order-demo-01' AND display_type IS NULL"))[0];

    const result = await repository.executeMutation(discount.mutation, { id: 'order-demo-01', expected_row_version: initial.row_version, ...actor, values: values('sol_discount', 10) }) as any;
    const afterLine = (await repository.query("SELECT discount, price_total, price_subtotal FROM order_lines WHERE order_id = 'order-demo-01' AND display_type IS NULL"))[0];
    const afterOrder = (await repository.query('SELECT row_version, total_amount FROM orders WHERE id = ?', ['order-demo-01']))[0];

    expect(result.id).toBe('order-demo-01');
    expect(Number(afterLine.discount)).toBe(10);
    expect(Number(afterLine.price_total)).toBeCloseTo(Number(before.price_total) * 0.9, 2);
    expect(Number(afterOrder.total_amount)).toBeCloseTo(Number(afterLine.price_total), 2);
    expect(Number(afterOrder.row_version)).toBe(Number(initial.row_version) + 1);
    expect(await repository.query("SELECT action, detail FROM system_activity WHERE action = 'sales.orders.discount.apply' AND resource_id = 'order-demo-01'"))
      .toHaveLength(1);

    await expect(repository.executeMutation(discount.mutation, { id: 'order-demo-01', expected_row_version: initial.row_version, ...actor, values: values('sol_discount', 5) }))
      .rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_DISCOUNT_STALE' });
    await database.close();
  }, 30000);

  test('supports global and fixed discount lines while preserving atomic state guards', async () => {
    const globalCase = await repositoryForTest();
    const globalInitial = (await globalCase.repository.query('SELECT row_version, total_amount FROM orders WHERE id = ?', ['order-demo-01']))[0];
    await globalCase.repository.executeMutation(discount.mutation, { id: 'order-demo-01', expected_row_version: globalInitial.row_version, ...actor, values: values('so_discount', 10) });
    const globalLine = (await globalCase.repository.query("SELECT product_id, description, unit_price, price_total FROM order_lines WHERE order_id = 'order-demo-01' AND product_id = 'product-demo-discount'"))[0];
    expect(globalLine).toMatchObject({ product_id: 'product-demo-discount', description: 'Discount 10%' });
    expect(Number(globalLine.price_total)).toBeLessThan(0);
    await globalCase.database.close();

    const fixedCase = await repositoryForTest();
    const fixedInitial = (await fixedCase.repository.query('SELECT row_version FROM orders WHERE id = ?', ['order-demo-01']))[0];
    await fixedCase.repository.executeMutation(discount.mutation, { id: 'order-demo-01', expected_row_version: fixedInitial.row_version, ...actor, values: values('amount', 0, 125) });
    const fixedLine = (await fixedCase.repository.query("SELECT unit_price, price_total FROM order_lines WHERE order_id = 'order-demo-01' AND product_id = 'product-demo-discount'"))[0];
    expect(Number(fixedLine.unit_price)).toBe(-125);
    expect(Number(fixedLine.price_total)).toBe(-125);
    await expect(fixedCase.repository.executeMutation(discount.mutation, { id: 'order-demo-01', expected_row_version: fixedInitial.row_version + 1, ...actor, values: values('amount', 0, 25) }))
      .rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_DISCOUNT_ALREADY_APPLIED' });
    await expect(fixedCase.repository.executeMutation(discount.mutation, { id: 'order-demo-03', expected_row_version: 1, ...actor, values: values('sol_discount', 10) }))
      .rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_DISCOUNT_STALE' });
    await fixedCase.database.close();
  }, 30000);
});
