import { describe, expect, test } from 'bun:test';
import { rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const values = {
  name: 'Travel Combo',
  sequence: 30,
  company_name: 'My Company',
  option_list: 'ecommerce-product-mug|0\necommerce-product-lamp|3.25',
};

describe('eCommerce Combo Choices parity', () => {
  test('traces the Odoo menu/action/model and separates page/API contracts', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/combo-choices.yaml');
    const api = yaml('api/combo-choices.yaml');
    expect(manifest.menu.groups[1].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/combo-choices', label: 'Combo Choices', permission: 'ecommerce.read' }),
    ]));
    expect(page.page).toMatchObject({ id: 'ecommerce-combo-choices', route: '/ecommerce/combo-choices' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_product_combos', create_action: 'create_ecommerce_product_combo' });
    expect(api.page).toEqual({ id: 'ecommerce-combo-choices' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_product_combos', 'ecommerce_product_combo_products']);
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'create_ecommerce_product_combo',
      'edit_ecommerce_product_combo',
      'delete_ecommerce_product_combo',
    ]);
  });

  test('seeds durable choices, computes Odoo base price, and declares errors/permissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_combos_contract_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_combos_contract_test', ['schema', 'data']);
    const api = yaml('api/combo-choices.yaml');
    const source = api.datasources[0];
    const rows = await repository.querySource(source, { q: null, fixture_state: null, company_name: 'My Company' }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Workspace Essentials', 'Office Upgrade']);
    expect(rows.data[0]).toMatchObject({ base_price: 18, combo_item_count: 2 });
    expect(rows.data[0].option_names).toContain('Core3 Ceramic Mug|0.00');
    expect((await repository.querySource(source, { q: 'Lamp', fixture_state: null, company_name: 'My Company' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Workspace Essentials', 'Office Upgrade']);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty', company_name: 'My Company' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error', company_name: 'My Company' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_PRODUCT_COMBOS_UNAVAILABLE' });
    expect(source.permission).toBe('ecommerce.read');
    expect(source.error_states.unauthorized).toMatchObject({ status: 401, code: 'ECOMMERCE_PRODUCT_COMBOS_UNAUTHENTICATED' });
    expect(source.error_states.forbidden).toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_COMBOS_FORBIDDEN' });
    database.close();
  });

  test('covers option CRUD, Odoo validation, company scope, stale writes, and cleanup', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_combos_crud_test', ['schema', 'data']);
    const api = yaml('api/combo-choices.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_product_combo');
    const edit = api.actions.find((action: any) => action.id === 'edit_ecommerce_product_combo');
    const remove = api.actions.find((action: any) => action.id === 'delete_ecommerce_product_combo');
    expect(create.permission).toBe('ecommerce.write');
    expect(edit.permission).toBe('ecommerce.write');
    expect(remove.permission).toBe('ecommerce.write');
    const created = await repository.executeMutation(create.mutation, { values, current_company_name: 'My Company' }) as any;
    expect(created).toMatchObject({ name: 'Travel Combo', row_version: 1, company_name: 'My Company' });
    expect(await repository.query('SELECT product_id, extra_price FROM ecommerce_product_combo_items WHERE combo_id = ? ORDER BY sequence', [created.id])).toEqual([
      { product_id: 'ecommerce-product-mug', extra_price: 0 },
      { product_id: 'ecommerce-product-lamp', extra_price: 3.25 },
    ]);
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Empty Combo', option_list: '' }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_COMBO_OPTIONS_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Duplicate Combo', option_list: 'ecommerce-product-mug|0\necommerce-product-mug|1' }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_COMBO_OPTION_DUPLICATE' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Cross Company Combo', company_name: 'Other Company' }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_COMPANY_SCOPE_REQUIRED' });
    const updated = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { ...values, name: 'Travel Combo Updated', option_list: 'ecommerce-product-chair|5' },
      current_company_name: 'My Company',
    }) as any;
    expect(updated).toMatchObject({ id: created.id, name: 'Travel Combo Updated', row_version: 2 });
    expect(await repository.query('SELECT product_id, extra_price FROM ecommerce_product_combo_items WHERE combo_id = ?', [created.id])).toEqual([
      { product_id: 'ecommerce-product-chair', extra_price: 5 },
    ]);
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Stale' }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_combo_items WHERE combo_id = ?', [created.id])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists choices and options across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-combos-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_combos_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/combo-choices.yaml').actions.find((action: any) => action.id === 'create_ecommerce_product_combo');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(create.mutation, { values: { ...values, name: 'Restart Combo' }, current_company_name: 'My Company' }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT name, sequence FROM ecommerce_product_combos WHERE id = ?', [created.id]))
        .toEqual([{ name: 'Restart Combo', sequence: 30 }]);
      expect(await secondRepository.query('SELECT product_id, extra_price FROM ecommerce_product_combo_items WHERE combo_id = ? ORDER BY sequence', [created.id]))
        .toEqual([{ product_id: 'ecommerce-product-mug', extra_price: 0 }, { product_id: 'ecommerce-product-lamp', extra_price: 3.25 }]);
      expect((await secondRepository.query('SELECT COUNT(*) AS count FROM ecommerce_product_combos', []))[0].count).toBe(3);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
