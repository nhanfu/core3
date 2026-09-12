import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS Products New action parity', () => {
  test('registers the Odoo New action and joins page/API contracts', () => {
    const list = yaml('pages/pos-products.yaml');
    const page = yaml('pages/pos-product-new.yaml');
    const api = yaml('api/pos-product-new.yaml');
    expect(list.components[0]).toMatchObject({ create_action: 'new_pos_product', create_label: 'New' });
    expect(list.actions).toContainEqual(expect.objectContaining({ id: 'new_pos_product', permission: 'pos.manage', navigate_to: '/point-of-sale/products/new' }));
    expect(page.page).toMatchObject({ id: 'pos-product-new', route: '/point-of-sale/products/new' });
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('pos-product-new')).toContain('pos_product_new');
    expect(page.components[0].notebook.tabs.map((tab: any) => tab.label)).toEqual(['General Information', 'Point of Sale']);
    expect(api.datasources[0].error_states.forbidden.status).toBe(403);
  });

  test('creates deterministic POS products with manager guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_product_new', ['schema', 'data']);
    const api = yaml('api/pos-product-new.yaml');
    expect(await repository.querySource(api.datasources[0], {}, 0, 1)).toMatchObject({ data: { name: '', category: 'General', price: 1, tax_rate: 10, active: true } });
    const create = api.actions.find((candidate: any) => candidate.id === 'create_pos_product');
    expect(create).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'insert', handler: 'yaml_mutation' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Seasonal tea', barcode: 'POS-TEA', category: 'Drinks', price: 2.75, tax_rate: 10 } });
    expect(created).toMatchObject({ name: 'Seasonal tea', barcode: 'POS-TEA', category: 'Drinks', price: 2.75, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Seasonal tea' } })).rejects.toMatchObject({ status: 409, code: 'POS_PRODUCT_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'POS_PRODUCT_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad price', price: -1 } })).rejects.toMatchObject({ status: 422, code: 'POS_PRODUCT_PRICE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad tax', tax_rate: 101 } })).rejects.toMatchObject({ status: 422, code: 'POS_PRODUCT_TAX_INVALID' });
    database.close();
  });
});
