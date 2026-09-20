import { describe, expect, test } from 'bun:test';
import { rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const values = {
  name: 'Finish',
  active: true,
  create_variant: 'always',
  display_type: 'select',
  sequence: 12,
  visibility: 'visible',
  preview_variants: 'hidden',
  is_thumbnail_visible: false,
  value_list: 'Matte|0|#112233\nGloss|4.50|#445566',
};

describe('eCommerce Product Attributes parity', () => {
  test('traces the Odoo menu/action/model and separates page/API contracts', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/product-attributes.yaml');
    const api = yaml('api/product-attributes.yaml');
    expect(manifest.menu.groups[1].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-attributes', label: 'Attributes', permission: 'ecommerce.read' }),
    ]));
    expect(page.page).toMatchObject({ id: 'ecommerce-product-attributes', route: '/ecommerce/product-attributes' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_product_attributes', create_action: 'create_ecommerce_product_attribute' });
    expect(api.page).toEqual({ id: 'ecommerce-product-attributes' });
    expect(api.datasources.map((source: any) => source.id)).toEqual([
      'ecommerce_product_attributes',
      'ecommerce_product_attribute_create_variants',
      'ecommerce_product_attribute_display_types',
      'ecommerce_product_attribute_visibility',
      'ecommerce_product_attribute_preview_variants',
    ]);
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'create_ecommerce_product_attribute',
      'edit_ecommerce_product_attribute',
      'delete_ecommerce_product_attribute',
    ]);
  });

  test('seeds deterministic attributes and values with search, filters, empty/error states, and permissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_attributes_contract_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_attributes_contract_test', ['schema', 'data']);
    const api = yaml('api/product-attributes.yaml');
    const source = api.datasources[0];
    const rows = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Color', 'Size', 'Material']);
    expect(rows.data[0]).toMatchObject({ display_type: 'color', create_variant: 'always', value_count: 2 });
    expect(rows.data[0].value_list).toContain('Red|0.00|#D9534F');
    expect((await repository.querySource(source, { q: 'Large', active: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ name: 'Size' });
    expect((await repository.querySource(source, { q: null, active: true, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Color', 'Size', 'Material']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_PRODUCT_ATTRIBUTES_UNAVAILABLE' });
    expect(source.permission).toBe('ecommerce.read');
    expect(source.error_states.unauthorized).toMatchObject({ status: 401, code: 'ECOMMERCE_PRODUCT_ATTRIBUTES_UNAUTHENTICATED' });
    expect(source.error_states.forbidden).toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_ATTRIBUTES_FORBIDDEN' });
    database.close();
  });

  test('covers attribute/value CRUD, Odoo option guards, stale writes, and cleanup', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_attributes_crud_test', ['schema', 'data']);
    const api = yaml('api/product-attributes.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_product_attribute');
    const edit = api.actions.find((action: any) => action.id === 'edit_ecommerce_product_attribute');
    const remove = api.actions.find((action: any) => action.id === 'delete_ecommerce_product_attribute');
    expect(create.permission).toBe('ecommerce.write');
    expect(edit.permission).toBe('ecommerce.write');
    expect(remove.permission).toBe('ecommerce.write');
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: 'Finish', display_type: 'select', row_version: 1 });
    expect(await repository.query('SELECT name, default_extra_price, html_color FROM ecommerce_product_attribute_values WHERE attribute_id = ? ORDER BY sequence', [created.id])).toEqual([
      { name: 'Matte', default_extra_price: 0, html_color: '#112233' },
      { name: 'Gloss', default_extra_price: 4.5, html_color: '#445566' },
    ]);
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: ' finish ' } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_ATTRIBUTE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Bad Multi', display_type: 'multi', create_variant: 'always' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_ATTRIBUTE_MULTI_VARIANT_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Bad Preview', create_variant: 'dynamic', preview_variants: 'visible' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_ATTRIBUTE_PREVIEW_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { ...values, name: 'Finish Updated', value_list: 'Satin|3|#778899' },
    }) as any;
    expect(updated).toMatchObject({ id: created.id, name: 'Finish Updated', row_version: 2 });
    expect(await repository.query('SELECT name, html_color FROM ecommerce_product_attribute_values WHERE attribute_id = ?', [created.id])).toEqual([{ name: 'Satin', html_color: '#778899' }]);
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Stale' } }))
      .rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_attribute_values WHERE attribute_id = ?', [created.id])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists attributes and values across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-attributes-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_attributes_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/product-attributes.yaml').actions.find((action: any) => action.id === 'create_ecommerce_product_attribute');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(create.mutation, { values: { ...values, name: 'Restart Attribute' } }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT name, display_type FROM ecommerce_product_attributes WHERE id = ?', [created.id]))
        .toEqual([{ name: 'Restart Attribute', display_type: 'select' }]);
      expect(await secondRepository.query('SELECT name FROM ecommerce_product_attribute_values WHERE attribute_id = ? ORDER BY sequence', [created.id]))
        .toEqual([{ name: 'Matte' }, { name: 'Gloss' }]);
      expect((await secondRepository.query('SELECT COUNT(*) AS count FROM ecommerce_product_attributes', []))[0].count).toBe(4);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
