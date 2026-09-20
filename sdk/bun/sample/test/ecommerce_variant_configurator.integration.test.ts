import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce variant configurator parity', () => {
  test('keeps the product page/API split and exposes a permissioned variant add action', () => {
    const page = yaml('pages/product-detail.yaml');
    const api = yaml('api/product-detail.yaml');
    const add = action(api, 'add_ecommerce_product_variant_to_cart');
    expect(page.page.id).toBe('ecommerce-product-detail');
    expect(api.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(page.components[1].source).toBe('ecommerce_product_variants');
    expect(page.components[1].actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'add_ecommerce_product_variant_to_cart' })]));
    expect(add).toMatchObject({ type: 'server', permission: 'ecommerce.write', action: 'ecommerce.cart.add_variant' });
    expect(add.mutation.steps[1].query).toContain('ecommerce_product_variants');
    expect(add.mutation.steps[2].query).toContain('row_version = row_version + 1');
  });

  test('adds authenticated and anonymous variants idempotently with company and active guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_variant_configurator', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_variant_configurator', ['schema', 'data']);
    const detailApi = yaml('api/product-detail.yaml');
    const add = action(detailApi, 'add_ecommerce_product_variant_to_cart');
    const base = { product_id: 'ecommerce-product-mug', variant_id: 'ecommerce-variant-mug-blue', current_company_name: 'My Company', customer_scope: 'all' };
    const first = await repository.executeMutation(add.mutation, { ...base, values: {}, current_user_email: '' }) as any;
    const second = await repository.executeMutation(add.mutation, { ...base, values: {}, current_user_email: '' }) as any;
    expect(first).toMatchObject({ variant_id: 'ecommerce-variant-mug-blue', variant_name: 'Core3 Ceramic Mug (Blue)', unit_price: 20.5, quantity: 1 });
    expect(second).toMatchObject({ variant_id: 'ecommerce-variant-mug-blue', quantity: 2, row_version: 2 });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_cart_lines WHERE cart_id = ? AND variant_id = ?', ['ecommerce-cart-open-001', 'ecommerce-variant-mug-blue']))[0].count).toBe(1);
    await expect(repository.executeMutation(add.mutation, { ...base, variant_id: 'ecommerce-variant-chair-black', values: {}, current_user_email: '' })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_UNAVAILABLE' });
    await expect(repository.executeMutation(add.mutation, { ...base, current_company_name: 'Other Company', values: {}, current_user_email: '' })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_UNAVAILABLE' });
    database.close();
  });

  test('anonymous public add carries the selected variant and survives restart', async () => {
    const path = `/tmp/core3-ecommerce-variant-cart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_variant_cart_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const shopApi = yaml('api/shop.yaml');
      const add = action(shopApi, 'anonymous_shop_add_to_cart');
      await repository.executeMutation(add.mutation, { cart_id: 'ecommerce-cart-anon-variant-001', line_id: 'ecommerce-cart-anon-variant-001-ecommerce-variant-mug-blue', product_id: 'ecommerce-product-mug', variant_id: 'ecommerce-variant-mug-blue' });
      await repository.executeMutation(add.mutation, { cart_id: 'ecommerce-cart-anon-variant-001', line_id: 'ecommerce-cart-anon-variant-001-ecommerce-variant-mug-blue', product_id: 'ecommerce-product-mug', variant_id: 'ecommerce-variant-mug-blue' });
      expect(await repository.query('SELECT variant_id, variant_name, quantity, unit_price FROM ecommerce_cart_lines WHERE cart_id = ?', ['ecommerce-cart-anon-variant-001'])).toEqual([{ variant_id: 'ecommerce-variant-mug-blue', variant_name: 'Core3 Ceramic Mug (Blue)', quantity: 2, unit_price: 20.5 }]);
      first.close();
      const second = await DuckDbDatabase.open(path);
      const restarted = new YamlRepository(second);
      await migrateDatabase(restarted, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT variant_id, quantity FROM ecommerce_cart_lines WHERE cart_id = ?', ['ecommerce-cart-anon-variant-001'])).toEqual([{ variant_id: 'ecommerce-variant-mug-blue', quantity: 2 }]);
      second.close();
    } finally {
      try { const { unlinkSync } = await import('node:fs'); unlinkSync(path); } catch { /* already removed by DuckDB */ }
    }
  });
});
