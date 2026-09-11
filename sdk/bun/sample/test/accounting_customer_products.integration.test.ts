import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = () => yaml('api/products.yaml');
const action = (id: string) => api().actions.find((candidate: any) => candidate.id === id);
const migrate = async (name: string) => {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
};

describe('Accounting customer Products Odoo action parity', () => {
  test('keeps the customer product page and API separate and Kanban-first', () => {
    const page = yaml('pages/products.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'accounting-products', route: '/accounting/products' });
    expect(page.page.auth.require).toEqual(['accounting.read']);
    expect(api().page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: 'accounting_products', create_action: 'create_accounting_product', create_label: 'New', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['card', 'kanban', 'list']);
    expect(list.views[0]).toMatchObject({ label: 'Kanban', mobile: true });
    expect(list.views[1]).toMatchObject({ label: 'Kanban', mobile: false, group_by: '' });
    expect(list.views[2]).toMatchObject({ label: 'List', mobile: false });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Product Name', 'Internal Reference', 'Sales Price', 'On Hand', 'Variants', 'Active']);
    expect(discovered.pageDatasources.get(page.page.id)).toContain('accounting_products');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/accounting/products', page: 'accounting-products', module: 'accounting' })]));
  });

  test('formats Odoo card amounts and covers seeded/search/empty/error reads', async () => {
    const source = api().datasources.find((candidate: any) => candidate.id === 'accounting_products');
    expect(source.permission).toBe('accounting.read');
    expect(source.query).toContain("printf('$ %,.2f'");
    expect(source.query).toContain("printf('%,.2f Units'");
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'ACCOUNTING_PRODUCTS_UNAVAILABLE' });
    const { database, repository } = await migrate('accounting_customer_products_states');
    const initial = await repository.querySource(source, { q: null, active: null }, 0, 50);
    expect(initial.data).toHaveLength(8);
    expect(initial.data[0]).toMatchObject({ name: 'Acoustic Bloc Screens', price_display: '$ 295.00', on_hand_display: '16.00 Units' });
    expect((await repository.querySource(source, { q: 'cabinet', active: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Cabinet with Doors']);
    expect((await repository.querySource(source, { q: 'missing', active: null }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_PRODUCTS_UNAVAILABLE' });
    database.close();
  });

  test('enforces write permission, duplicate/name/value validation, and deterministic IDs', async () => {
    const { database, repository } = await migrate('accounting_customer_products_crud');
    const create = action('create_accounting_product');
    expect(create.permission).toBe('accounting.write');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'QA Product', default_code: '[QA_001]', product_type: 'Goods', price: 19.5, cost: 8, on_hand: 4, variant_count: 1 } });
    expect(created).toMatchObject({ id: 'accounting-product-qa-product', name: 'QA Product', price: 19.5, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'qa product' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_PRODUCT_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_PRODUCT_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Product', price: -1 } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_PRODUCT_VALUES_INVALID' });
    database.close();
  });
});
