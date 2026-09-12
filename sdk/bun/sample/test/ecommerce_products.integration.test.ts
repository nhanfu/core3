import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = yaml('api/products.yaml');

describe('eCommerce Products parity', () => {
  test('joins Odoo Products layout and API by page.id and preserves menu trace', () => {
    const page = yaml('pages/products.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'ecommerce-products', route: '/ecommerce/products', auth: { require: ['ecommerce.read'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('ecommerce-products')).toEqual(expect.arrayContaining(['ecommerce_products', 'ecommerce_product_published']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/ecommerce/products', page: 'ecommerce-products', module: 'ecommerce' })]));
    expect(manifest.menu.groups.map((group: any) => group.label)).toEqual(['Orders', 'Products']);
    expect(manifest.menu.groups[1].items.map((item: any) => item.label)).toEqual(['Products', 'Pricelists', 'Categories']);
    expect(manifest.menu.groups[1].items[0]).toMatchObject({ path: '/ecommerce/products', permission: 'ecommerce.read' });
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['Kanban', 'List']);
  });

  test('serves realistic, searchable, empty, unavailable, and validated CRUD fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_products_test_schema_migrations', ['schema', 'data']);
    const source = api.datasources.find((candidate: any) => candidate.id === 'ecommerce_products');
    const params = { q: null, published: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.name)).toEqual(['Core3 Ceramic Mug', 'Ergonomic Office Chair', 'Workspace Setup Service', 'Desk Lamp']);
    expect((await repository.querySource(source, { ...params, q: 'office' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Ergonomic Office Chair', 'Desk Lamp']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_PRODUCTS_UNAVAILABLE' });
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_product');
    expect(create.permission).toBe('ecommerce.write');
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 400, message: 'name is required' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'QA Travel Bottle', internal_reference: 'QA-BOTTLE-001', sales_price: 25 } });
    expect(created).toMatchObject({ name: 'QA Travel Bottle', internal_reference: 'QA-BOTTLE-001', active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Duplicate', internal_reference: 'QA-BOTTLE-001' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_REFERENCE_EXISTS' });
    database.close();
  });
});
