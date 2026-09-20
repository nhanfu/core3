import { describe, expect, test } from 'bun:test';
import { rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const values = {
  name: 'Weekend Picks',
  sequence: 12,
  color: '#112233',
  visible_to_customers: true,
  product_ids: ['ecommerce-product-mug', 'ecommerce-product-lamp'],
};

describe('eCommerce Product Tags parity', () => {
  test('traces the Odoo menu/action and keeps the page/API contracts separate', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/product-tags.yaml');
    const api = yaml('api/product-tags.yaml');
    expect(manifest.menu.groups[1].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-tags', label: 'Product Tags', permission: 'ecommerce.read' }),
    ]));
    expect(page.page).toMatchObject({ id: 'ecommerce-product-tags', route: '/ecommerce/product-tags' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_product_tags', create_action: 'create_ecommerce_product_tag' });
    expect(api.page).toEqual({ id: 'ecommerce-product-tags' });
    expect(api.datasources.map((source: any) => source.id)).toEqual([
      'ecommerce_product_tags',
      'ecommerce_product_tag_products',
      'ecommerce_product_tag_variants',
      'ecommerce_product_tag_visibility',
    ]);
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'create_ecommerce_product_tag',
      'edit_ecommerce_product_tag',
      'delete_ecommerce_product_tag',
      'assign_ecommerce_product_tag_variant',
      'remove_ecommerce_product_tag_variant',
    ]);
  });

  test('seeds deterministic assignments and supports search, filters, empty/error states, and permissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_tags_contract_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_tags_contract_test', ['schema', 'data']);
    const api = yaml('api/product-tags.yaml');
    const source = api.datasources[0];
    const rows = await repository.querySource(source, { q: null, visible_to_customers: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Featured', 'New arrival', 'Service']);
    expect(rows.data[0]).toMatchObject({ product_count: 2, product_names: 'Core3 Ceramic Mug, Ergonomic Office Chair' });
    expect(rows.data[0].product_ids).toEqual(['ecommerce-product-chair', 'ecommerce-product-mug']);
    expect((await repository.querySource(source, { q: 'lamp', visible_to_customers: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ name: 'New arrival' });
    expect((await repository.querySource(source, { q: null, visible_to_customers: true, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Featured', 'New arrival']);
    expect((await repository.querySource(source, { q: null, visible_to_customers: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, visible_to_customers: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_PRODUCT_TAGS_UNAVAILABLE' });
    expect(source.permission).toBe('ecommerce.read');
    expect(source.error_states.unauthorized).toMatchObject({ status: 401, code: 'ECOMMERCE_PRODUCT_TAGS_UNAUTHENTICATED' });
    expect(source.error_states.forbidden).toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_TAGS_FORBIDDEN' });
    database.close();
  });

  test('covers assignment CRUD, validation, duplicate names, stale writes, and relation cleanup', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_tags_crud_test', ['schema', 'data']);
    const api = yaml('api/product-tags.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_product_tag');
    const edit = api.actions.find((action: any) => action.id === 'edit_ecommerce_product_tag');
    const remove = api.actions.find((action: any) => action.id === 'delete_ecommerce_product_tag');
    expect(create.permission).toBe('ecommerce.write');
    expect(edit.permission).toBe('ecommerce.write');
    expect(remove.permission).toBe('ecommerce.write');
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: 'Weekend Picks', color: '#112233', visible_to_customers: true, row_version: 1 });
    expect(await repository.query('SELECT product_id FROM ecommerce_product_tag_products WHERE tag_id = ? ORDER BY product_id', [created.id])).toEqual([
      { product_id: 'ecommerce-product-lamp' },
      { product_id: 'ecommerce-product-mug' },
    ]);
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: ' weekend picks ' } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_TAG_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Bad Color', color: 'red' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_TAG_COLOR_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { ...values, name: 'Weekend Deals', product_ids: ['ecommerce-product-chair'] },
    }) as any;
    expect(updated).toMatchObject({ id: created.id, name: 'Weekend Deals', row_version: 2 });
    expect(await repository.query('SELECT product_id FROM ecommerce_product_tag_products WHERE tag_id = ?', [created.id])).toEqual([{ product_id: 'ecommerce-product-chair' }]);
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Stale' } }))
      .rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_tag_products WHERE tag_id = ?', [created.id])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists tags and product assignments across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-tags-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_tags_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/product-tags.yaml').actions.find((action: any) => action.id === 'create_ecommerce_product_tag');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(create.mutation, { values: { ...values, name: 'Restart Tag', product_ids: ['ecommerce-product-chair'] } }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT name, color, visible_to_customers FROM ecommerce_product_tags WHERE id = ?', [created.id]))
        .toEqual([{ name: 'Restart Tag', color: '#112233', visible_to_customers: true }]);
      expect(await secondRepository.query('SELECT product_id FROM ecommerce_product_tag_products WHERE tag_id = ?', [created.id]))
        .toEqual([{ product_id: 'ecommerce-product-chair' }]);
      expect((await secondRepository.query('SELECT COUNT(*) AS count FROM ecommerce_product_tags', []))[0].count).toBe(4);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
