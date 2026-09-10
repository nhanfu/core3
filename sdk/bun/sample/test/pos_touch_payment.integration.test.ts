import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS touch payment contract', () => {
  test('keeps touch tender methods and open-ticket line data service-owned', () => {
    const api = yaml('api/pos-touch.yaml');
    const methods = api.datasources.find((source: any) => source.id === 'pos_touch_payment_methods');
    const orders = api.datasources.find((source: any) => source.id === 'pos_touch_open_orders');

    expect(methods).toMatchObject({ permission: 'pos.read', single: false });
    expect(methods.query).toContain('FROM pos_payment_methods');
    expect(methods.query).toContain('active = true');
    expect(orders.query).toContain('line_product_id');
    expect(orders.query).toContain("o.state = 'New'");
  });

  test('keeps add-product and payment guards on named server mutations', () => {
    const page = yaml('pages/pos-touch.yaml');
    const add = page.actions.find((action: any) => action.action === 'pos.touch.add_product');
    const pay = page.actions.find((action: any) => action.action === 'pos.touch.payment');

    expect(add).toMatchObject({ type: 'server', permission: 'pos.write', handler: 'yaml_mutation' });
    expect(add.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, message: 'Select an open ticket before adding products' }),
      expect.objectContaining({ status: 404, message: 'Product not found or inactive' }),
    ]));
    expect(pay).toMatchObject({ type: 'server', permission: 'pos.write', handler: 'yaml_mutation' });
    expect(pay.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 400, message: 'Payment exceeds the remaining balance' }),
      expect.objectContaining({ status: 422, message: 'Payment method is not available in this register' }),
    ]));
  });

  test('provides a deterministic open touch ticket fixture', () => {
    const migration = yaml('migrations/20260910180000-014-pos-touch-payment.yaml');
    expect(migration.version).toBe('0.0.14');
    expect(migration.type.postgres.up).toContain('pos-order-touch-demo-001');
    expect(migration.type.postgres.up).toContain('pos-line-touch-demo-001');
  });
});
