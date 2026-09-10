import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = () => yaml('api/vendor-products.yaml');
const action = (id: string) => api().actions.find((candidate: any) => candidate.id === id);
const migrate = async (name: string) => {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
};

describe('Accounting Vendor Products Odoo action parity', () => {
  test('joins the vendor product layout and API by page.id', () => {
    const page = yaml('pages/vendor-products.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'accounting-vendor-products', route: '/accounting/vendor-products' });
    expect(page.page.auth.require).toEqual(['accounting.read']);
    expect(api().page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: 'accounting_vendor_products', create_action: 'create_accounting_vendor_product', create_label: 'New', empty_state: { title: 'No products found' } });
    expect(list.views.map((view: any) => view.id)).toEqual(['card', 'kanban', 'list']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Kanban', mobile: true });
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({ label: 'Kanban', mobile: false, group_by: '' });
    expect(list.views.find((view: any) => view.id === 'list')).toMatchObject({ label: 'List', mobile: false });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Product Name', 'Internal Reference', 'Cost', 'Purchase Taxes', 'On Hand', 'Forecasted', 'Unit', '']);
    expect(discovered.pageDatasources.get(page.page.id)).toContain('accounting_vendor_products');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/accounting/vendor-products', page: 'accounting-vendor-products', module: 'accounting' })]));
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'invoicing').items).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/accounting/vendor-products', label: 'Products', permission: 'accounting.read' })]));
  });

  test('matches the Odoo Kanban/List collection contract and resilient reads', async () => {
    const source = api().datasources.find((candidate: any) => candidate.id === 'accounting_vendor_products');
    expect(source.permission).toBe('accounting.read');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'ACCOUNTING_VENDOR_PRODUCTS_UNAVAILABLE' });
    expect(source.query).toContain("COALESCE(:fixture_state, '') IN ('empty', 'not_found')");

    const { database, repository } = await migrate('accounting_vendor_products_states');
    const initial = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(initial.data).toHaveLength(10);
    expect(initial.data.map((row: any) => row.name)).toEqual(['Bolt', 'Cabinet with Doors', 'Communication', 'Flour', 'Furniture Assembly', 'Gifts', 'Meals', 'Mileage', 'Office Chair', 'Office Lamp']);
    expect((await repository.querySource(source, { q: 'office', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Office Chair', 'Office Lamp']);
    expect((await repository.querySource(source, { q: 'missing', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_VENDOR_PRODUCTS_UNAVAILABLE' });
    database.close();
  });

  test('enforces write permissions and CRUD validation, archive, missing, and stale guards', async () => {
    const { database, repository } = await migrate('accounting_vendor_products_crud');
    for (const id of ['create_accounting_vendor_product', 'edit_accounting_vendor_product', 'archive_accounting_vendor_product', 'restore_accounting_vendor_product', 'delete_accounting_vendor_product']) {
      expect(action(id).permission, id).toBe('accounting.write');
    }

    const create = action('create_accounting_vendor_product');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'QA Vendor Product', default_code: '[QA_001]', product_type: 'Goods', cost: 19.5, purchase_taxes: 'Tax 15%', unit: 'Units' } });
    expect(created).toMatchObject({ name: 'QA Vendor Product', default_code: '[QA_001]', cost: 19.5, active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'qa vendor product' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_VENDOR_PRODUCT_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_VENDOR_PRODUCT_NAME_REQUIRED' });

    const edit = action('edit_accounting_vendor_product');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'QA Vendor Product Updated', cost: 20 } });
    expect(edited).toMatchObject({ id: created.id, name: 'QA Vendor Product Updated', cost: 20, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-vendor-product', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_VENDOR_PRODUCT_NOT_FOUND' });

    await repository.executeMutation(action('archive_accounting_vendor_product').mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(api().datasources[0], { q: 'QA Vendor Product Updated', active: 'false', fixture_state: null }, 0, 50)).data).toMatchObject([{ active: false }]);
    await repository.executeMutation(action('restore_accounting_vendor_product').mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    await repository.executeMutation(action('delete_accounting_vendor_product').mutation, { id: created.id, expected_row_version: 4 });
    expect((await repository.querySource(api().datasources[0], { q: 'QA Vendor Product Updated', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(action('delete_accounting_vendor_product').mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_VENDOR_PRODUCT_NOT_FOUND' });
    database.close();
  });
});
