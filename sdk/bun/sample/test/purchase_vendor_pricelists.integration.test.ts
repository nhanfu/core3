import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Purchase Vendor Pricelists parity', () => {
  test('binds the Odoo configuration route through page-id API ownership', () => {
    const page = yaml('pages/vendor-pricelists.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const api = yaml('api/vendor-pricelists.yaml');
    const source = api.datasources.find((datasource: any) => datasource.id === 'purchase_vendor_pricelists');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'purchase-vendor-pricelists', route: '/purchase/vendor-pricelists', auth: { require: ['purchase.read'] } });
    expect(api.page.id).toBe('purchase-vendor-pricelists');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('purchase-vendor-pricelists')).toContain('purchase_vendor_pricelists');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ mobile: true, card: { title: 'vendor_name', subtitle: 'product_name' } });
    expect(list.columns.map((column: any) => column.field)).toEqual(['vendor_name', 'product_name', 'company_name', 'uom', 'unit_price_display', 'lead_time_days']);
    expect(source.permission).toBe('purchase.read');
    const configuration = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/purchase/vendor-pricelists', label: 'Vendor Pricelists' })]));
  });

  test('returns 27 Odoo-shaped supplier records and validates create boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_vendor_pricelists_test_schema_migrations', ['schema', 'data']);

    const source = yaml('api/vendor-pricelists.yaml').datasources.find((datasource: any) => datasource.id === 'purchase_vendor_pricelists');
    const params = { q: null, active: null, fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data).toHaveLength(27);
    expect(rows.data[0]).toMatchObject({ vendor_name: 'Acme Corporation', product_name: '[FURN_0789] Individual Workplace', unit_price_display: '$ 876.00', lead_time_days: 3 });
    expect(rows.data.some((row: any) => row.vendor_name === 'Wood Corner' && row.product_name === 'Acoustic Bloc Screens')).toBe(true);
    expect((await repository.querySource(source, { ...params, q: 'Office Chair Black' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { ...params, active: true }, 0, 50)).data).toHaveLength(27);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const action = yaml('pages/vendor-pricelists.yaml').actions.find((candidate: any) => candidate.id === 'create_purchase_vendor_pricelist');
    expect(action).toMatchObject({ permission: 'purchase.write', operation: 'create' });
    expect(action.mutation.guards[0]).toMatchObject({ status: 422, code: 'SUPPLIER_INFO_VALUES_INVALID' });
  });
});
