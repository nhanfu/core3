import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce Product Reference Price visibility parity', () => {
  test('traces the Odoo setting and keeps the policy page/API separate', () => {
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const groups = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/security/res_groups.xml', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const productView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    const productTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const api = yaml('api/product-reference-price-policy.yaml');
    const page = yaml('pages/product-reference-price-policy.yaml');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const variantPage = yaml('pages/product-variant-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(settingsModel).toContain('group_show_uom_price = fields.Boolean');
    expect(settingsModel).toContain('implied_group="website_sale.group_show_uom_price"');
    expect(groups).toContain('id="group_show_uom_price"');
    expect(settingsView).toContain('id="ecom_uom_price_option_setting"');
    expect(settingsView).toContain('name="group_show_uom_price"');
    expect(productView).toContain('groups="website_sale.group_show_uom_price"');
    expect(productTemplate).toContain("'base_unit_price': product_or_template._get_base_unit_price");

    expect(page.page).toMatchObject({ id: 'ecommerce-product-reference-price-policy', route: '/ecommerce/product-reference-price' });
    expect(api.page).toEqual({ id: 'ecommerce-product-reference-price-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_reference_price_policy' });
    expect(action(api, 'edit_ecommerce_product_reference_price_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.reference_price_visibility.update' });
    expect(action(api, 'edit_ecommerce_product_reference_price_policy').mutation.concurrency).toEqual({ required: true });
    expect(variantApi.datasources.find((source: any) => source.id === 'ecommerce_product_variant_detail').query).toContain('show_reference_price');
    expect(detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_variants').query).toContain('show_reference_price');
    expect(variantPage.components[0].header_actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'update_ecommerce_product_variant_base_unit', permission: 'ecommerce.write' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-reference-price', label: 'Product Reference Price', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260922100000-160-ecommerce-product-reference-price-visibility.yaml').version).toBe('0.0.160');
    expect(yaml('migrations/20260922101000-161-ecommerce-product-reference-price-visibility-demo.yaml').version).toBe('0.0.161');
  });

  test('persists visibility, enforces company/boolean/stale guards, gates variant projections, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_product_reference_price_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/product-reference-price-policy.yaml');
    const policy = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_product_reference_price_policy');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const variant = variantApi.datasources.find((source: any) => source.id === 'ecommerce_product_variant_detail');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', show_reference_price: false, reference_price_behavior: 'Hide reference price' }) });
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    expect((await repository.querySource(variant, { id: 'ecommerce-variant-mug-blue', company_name: 'My Company' }, 0, 1)).data).toMatchObject({ show_reference_price: false, base_unit_count: null, base_unit_name: null, base_unit_price: null });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-reference-price-my-company', expected_row_version: 1, values: { show_reference_price: true } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_REFERENCE_PRICE_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-reference-price-my-company', expected_row_version: 1, values: { show_reference_price: 'sometimes' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_REFERENCE_PRICE_INVALID' });
    const enabled = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-reference-price-my-company', expected_row_version: 1, values: { show_reference_price: true } }) as any;
    expect(enabled).toMatchObject({ row_version: 2, show_reference_price: true, reference_price_behavior: 'Show reference price' });
    expect((await repository.querySource(variant, { id: 'ecommerce-variant-mug-blue', company_name: 'My Company' }, 0, 1)).data).toMatchObject({ show_reference_price: true, base_unit_count: 2, base_unit_name: 'piece', base_unit_price: 10.25 });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-reference-price-my-company', expected_row_version: 1, values: { show_reference_price: false } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_REFERENCE_PRICE_STALE' });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-product-reference-price-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-reference-price-my-company', expected_row_version: 1, values: { show_reference_price: true } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, show_reference_price, row_version FROM ecommerce_product_reference_price_policies WHERE id = ?', ['ecommerce-product-reference-price-my-company'])).toEqual([{ company_name: 'My Company', show_reference_price: true, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
