import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = yaml('api/pricelists.yaml');

describe('eCommerce Pricelists parity', () => {
  test('keeps the Odoo action trace, page/API join, view order, and responsive mode', () => {
    const page = yaml('pages/pricelists.yaml');
    const detail = yaml('pages/pricelist-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'ecommerce-pricelists', route: '/ecommerce/pricelists', auth: { require: ['ecommerce.read'] } });
    expect(detail.page).toMatchObject({ id: 'ecommerce-pricelist-detail', route: '/ecommerce/pricelists/detail' });
    expect(discovered.pageDatasources.get('ecommerce-pricelists')).toEqual(expect.arrayContaining(['ecommerce_pricelists', 'ecommerce_pricelist_active']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/ecommerce/pricelists', page: 'ecommerce-pricelists', module: 'ecommerce' })]));
    expect(manifest.menu.groups[1].items.map((item: any) => item.label)).toEqual(['Products', 'Pricelists', 'Categories']);
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Kanban']);
    expect(page.components[0].views[1].mobile).toBe(true);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Sequence', 'Name', 'Country Groups', 'Currency', 'Company']);
    expect(detail.components[0].notebook.tabs[0].label).toBe('Sales Prices');
  });

  test('serves ordered fixtures, states, validation, and write permissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_pricelists_test_schema_migrations', ['schema', 'data']);
    const source = api.datasources.find((candidate: any) => candidate.id === 'ecommerce_pricelists');
    const params = { q: null, active: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.name)).toEqual(['Public Pricelist', 'Retail Customers', 'Europe Seasonal', 'Legacy Wholesale']);
    expect((await repository.querySource(source, { ...params, q: 'Europe' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Europe Seasonal']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_PRICELISTS_UNAVAILABLE' });
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_pricelist');
    const archive = api.actions.find((action: any) => action.id === 'archive_ecommerce_pricelist');
    expect(create.permission).toBe('ecommerce.write');
    expect(archive.permission).toBe('ecommerce.write');
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 400, message: 'name is required' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'QA Partner Prices', country_groups: 'Canada' } });
    expect(created).toMatchObject({ name: 'QA Partner Prices', currency: 'USD', active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'QA Partner Prices' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRICELIST_NAME_EXISTS' });
    await repository.executeMutation(archive.mutation, { values: { id: 'ecommerce-pricelist-retail' } });
    await expect(repository.executeMutation(archive.mutation, { values: { id: 'ecommerce-pricelist-retail' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRICELIST_ALREADY_ARCHIVED' });
    database.close();
  });
});
