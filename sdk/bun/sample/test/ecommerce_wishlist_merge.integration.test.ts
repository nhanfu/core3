import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrations = join(root, 'migrations');

const mergeValues = {
  session_wishlist_id: 'ecommerce-wishlist-anon-merge-demo',
  customer_wishlist_id: 'ecommerce-wishlist-customer-001',
  customer_id: 'ecommerce-customer-001',
  customer_name: 'Acme Corporation',
  customer_email: 'hello@workspace.example',
  company_name: 'My Company',
  expected_session_row_version: 1,
  website_id: 'core3-main-website',
  currency: 'USD',
};

describe('eCommerce wishlist session merge parity', () => {
  test('traces the Odoo login hook and keeps the merge API separate from the wishlist page', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/models/product_wishlist.py', 'utf8');
    const users = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/models/res_users.py', 'utf8');
    const page = yaml('pages/wishlist.yaml');
    const api = yaml('api/wishlist.yaml');
    const merge = action(api, 'merge_ecommerce_wishlist_session');

    expect(model).toContain('def _check_wishlist_from_session(self)');
    expect(model).toContain('duplicated_wishes.unlink()');
    expect(model).toContain("request.session.pop('wishlist_ids')");
    expect(users).toContain('_check_wishlist_from_session()');
    expect(page.page).toMatchObject({ id: 'ecommerce-wishlist' });
    expect(api.page).toEqual({ id: 'ecommerce-wishlist' });
    expect(merge).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.wishlist.merge_session', operation: 'update' });
    expect(merge.mutation.required).toEqual(['session_wishlist_id', 'customer_wishlist_id', 'customer_id', 'company_name', 'expected_session_row_version']);
    expect(merge.mutation.steps).toHaveLength(5);
  });

  test('merges unique session items, removes duplicates, validates scope, and replays idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_wishlist_merge_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_wishlist_merge_test', ['schema', 'data']);
    const merge = action(yaml('api/wishlist.yaml'), 'merge_ecommerce_wishlist_session');

    await expect(repository.executeMutation(merge.mutation, { current_company_name: 'Other Company', values: mergeValues }))
      .rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_WISHLIST_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(merge.mutation, { current_company_name: 'My Company', values: { ...mergeValues, expected_session_row_version: 2 } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_WISHLIST_MERGE_STALE' });

    const merged = await repository.executeMutation(merge.mutation, { current_company_name: 'My Company', values: mergeValues }) as any;
    expect(merged).toMatchObject({ id: mergeValues.customer_wishlist_id, owner_type: 'customer', customer_id: mergeValues.customer_id, item_count: 2, row_version: 2 });
    expect(await repository.query('SELECT product_id, COUNT(*) AS count FROM ecommerce_wishlist_items WHERE wishlist_id = ? GROUP BY product_id ORDER BY product_id', [mergeValues.customer_wishlist_id]))
      .toEqual([
        { product_id: 'ecommerce-product-lamp', count: 1 },
        { product_id: 'ecommerce-product-mug', count: 1 },
      ]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_wishlists WHERE id = ?', [mergeValues.session_wishlist_id])).toEqual([{ count: 0 }]);

    const replay = await repository.executeMutation(merge.mutation, { current_company_name: 'My Company', values: mergeValues }) as any;
    expect(replay).toMatchObject({ id: mergeValues.customer_wishlist_id, item_count: 2, row_version: 2 });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_wishlist_items WHERE wishlist_id = ?', [mergeValues.customer_wishlist_id])).toEqual([{ count: 2 }]);
    database.close();
  });

  test('preserves the merged customer wishlist across DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-wishlist-merge-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_wishlist_merge_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const merge = action(yaml('api/wishlist.yaml'), 'merge_ecommerce_wishlist_session');
      await repository.executeMutation(merge.mutation, { current_company_name: 'My Company', values: mergeValues });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(second);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT row_version, owner_type, customer_id FROM ecommerce_wishlists WHERE id = ?', [mergeValues.customer_wishlist_id]))
        .toEqual([{ row_version: 2, owner_type: 'customer', customer_id: 'ecommerce-customer-001' }]);
      expect(await restarted.query('SELECT product_id FROM ecommerce_wishlist_items WHERE wishlist_id = ? ORDER BY product_id', [mergeValues.customer_wishlist_id]))
        .toEqual([{ product_id: 'ecommerce-product-lamp' }, { product_id: 'ecommerce-product-mug' }]);
      expect(await restarted.query('SELECT COUNT(*) AS count FROM ecommerce_wishlists WHERE id = ?', [mergeValues.session_wishlist_id])).toEqual([{ count: 0 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
