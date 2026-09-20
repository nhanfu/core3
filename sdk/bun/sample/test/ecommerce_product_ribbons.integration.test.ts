import { describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const values = {
  name: 'Weekend Offer',
  sequence: 12,
  bg_color: '#112233',
  text_color: '#FFFFFF',
  position: 'right',
  style: 'tag',
  assign: 'manual',
  new_period: 14,
};

describe('eCommerce Product Ribbons parity', () => {
  test('traces the Odoo menu/action and separates the list page from its API', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/product-ribbons.yaml');
    const api = yaml('api/product-ribbons.yaml');
    expect(manifest.menu.groups[1].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-ribbons', label: 'Product Ribbons', permission: 'ecommerce.read' }),
    ]));
    expect(page.page).toMatchObject({ id: 'ecommerce-product-ribbons', route: '/ecommerce/product-ribbons' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_product_ribbons', create_action: 'create_ecommerce_product_ribbon' });
    expect(api.page).toEqual({ id: 'ecommerce-product-ribbons' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_product_ribbons', 'ecommerce_product_ribbon_assignments']);
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'create_ecommerce_product_ribbon',
      'edit_ecommerce_product_ribbon',
      'delete_ecommerce_product_ribbon',
    ]);
  });

  test('seeds Odoo ribbon fixtures, supports search/empty/error states, and declares permissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_ribbons_contract_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_ribbons_contract_test', ['schema', 'data']);
    const api = yaml('api/product-ribbons.yaml');
    const source = api.datasources[0];
    expect((await repository.querySource(source, { q: null, assign: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Sold out', 'Out of stock', 'Sale', 'New!']);
    expect((await repository.querySource(source, { q: 'sale', assign: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ name: 'Sale', bg_color: '#0CA725' });
    expect((await repository.querySource(source, { q: null, assign: 'manual', fixture_state: null }, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(source, { q: null, assign: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, assign: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_PRODUCT_RIBBONS_UNAVAILABLE' });
    expect(source.permission).toBe('ecommerce.read');
    expect(source.error_states.unauthorized).toMatchObject({ status: 401, code: 'ECOMMERCE_PRODUCT_RIBBONS_UNAUTHENTICATED' });
    expect(source.error_states.forbidden).toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_RIBBONS_FORBIDDEN' });
    database.close();
  });

  test('covers create/edit/delete CRUD, automatic-assignment uniqueness, validation, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_ribbons_crud_test', ['schema', 'data']);
    const api = yaml('api/product-ribbons.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_product_ribbon');
    const edit = api.actions.find((action: any) => action.id === 'edit_ecommerce_product_ribbon');
    const remove = api.actions.find((action: any) => action.id === 'delete_ecommerce_product_ribbon');
    expect(create.permission).toBe('ecommerce.write');
    expect(edit.permission).toBe('ecommerce.write');
    expect(remove.permission).toBe('ecommerce.write');
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: 'Weekend Offer', position: 'right', style: 'tag', row_version: 1 });
    const automatic = await repository.executeMutation(create.mutation, { values: { ...values, name: 'Sale Automatic', assign: 'sale' } }) as any;
    expect(automatic).toMatchObject({ name: 'Sale Automatic', assign: 'sale' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Second Sale', assign: 'sale' } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_RIBBON_ASSIGN_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: ' ' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_RIBBON_NAME_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Bad Color', bg_color: 'red' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_RIBBON_COLOR_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Weekend Sale' } }) as any;
    expect(updated).toMatchObject({ id: created.id, name: 'Weekend Sale', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Stale' } }))
      .rejects.toMatchObject({ status: 409 });
    const deleted = await repository.executeMutation(remove.mutation, { id: automatic.id, expected_row_version: 1 });
    expect(deleted).toEqual({ deleted: true });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_ribbons WHERE id = ?', [automatic.id])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists ribbon edits and fixtures across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-ribbons-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_ribbons_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/product-ribbons.yaml').actions.find((action: any) => action.id === 'create_ecommerce_product_ribbon');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(create.mutation, { values: { ...values, name: 'Restart Ribbon' } }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT name, bg_color, position, style FROM ecommerce_product_ribbons WHERE id = ?', [created.id]))
        .toEqual([{ name: 'Restart Ribbon', bg_color: '#112233', position: 'right', style: 'tag' }]);
      expect((await secondRepository.query('SELECT COUNT(*) AS count FROM ecommerce_product_ribbons', []))[0].count).toBe(5);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
