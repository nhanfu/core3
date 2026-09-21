import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import { bindNamedParams } from '@core3/server/database/sql';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce product page image ratio parity', () => {
  test('traces Odoo desktop/mobile settings and pairs configuration and product detail contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-page-image-ratio-policy.yaml');
    const page = yaml('pages/product-page-image-ratio-policy.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('product_page_image_ratio = fields.Selection');
    expect(websiteModel).toContain("('1_1', \"Default (1/1)\")");
    expect(websiteModel).toContain('product_page_image_ratio_mobile = fields.Selection');
    expect(templates).toContain('website.product_page_image_ratio');
    expect(templates).toContain('website.product_page_image_ratio_mobile');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-page-image-ratio-policy', route: '/ecommerce/product-page-image-ratio' });
    expect(api.page).toEqual({ id: 'ecommerce-product-page-image-ratio-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_page_image_ratio_policy' });
    expect(action(api, 'edit_ecommerce_product_page_image_ratio_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.page_image_ratio.update' });
    expect(action(api, 'edit_ecommerce_product_page_image_ratio_policy').mutation.concurrency).toEqual({ required: true });
    expect(detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_image_ratio')).toBeTruthy();
    expect(detailPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_product_page_image_ratio' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-page-image-ratio', label: 'Product Page Image Ratios', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921290000-122-ecommerce-product-page-image-ratio.yaml').version).toBe('0.0.122');
    expect(yaml('migrations/20260921291000-123-ecommerce-product-page-image-ratio-demo.yaml').version).toBe('0.0.123');
  });

  test('enforces company, value, optimistic concurrency, product projection, replay, and restart persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_image_ratio_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/product-page-image-ratio-policy.yaml');
    const edit = action(api, 'edit_ecommerce_product_page_image_ratio_policy');
    const policy = api.datasources[0];
    const options = api.datasources[1];

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({
      data: expect.objectContaining({ company_name: 'My Company', desktop_ratio: '1_1', mobile_ratio: 'auto', desktop_ratio_label: 'Default (1/1)', mobile_ratio_label: 'Auto' }),
    });
    expect((await repository.querySource(options, {}, 0, 20)).data).toEqual([
      { value: 'auto', label: 'Auto' }, { value: '21_9', label: 'Wider (21/9)' }, { value: '16_9', label: 'Wide (16/9)' },
      { value: '4_3', label: 'Landscape (4/3)' }, { value: '6_5', label: 'Horizontal (6/5)' }, { value: '1_1', label: 'Default (1/1)' },
      { value: '4_5', label: 'Portrait (4/5)' }, { value: '2_3', label: 'Vertical (2/3)' },
    ]);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-page-image-ratio-my-company', expected_row_version: 1, values: { desktop_ratio: '16_9', mobile_ratio: '1_1' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_RATIO_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-ratio-my-company', expected_row_version: 1, values: { desktop_ratio: 'square', mobile_ratio: 'auto' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_RATIO_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-ratio-my-company', expected_row_version: 1, values: { desktop_ratio: '16_9', mobile_ratio: '4_5' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, desktop_ratio: '16_9', mobile_ratio: '4_5' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-ratio-my-company', expected_row_version: 1, values: { desktop_ratio: '1_1', mobile_ratio: 'auto' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_RATIO_STALE' });

    const detailApi = yaml('api/product-detail.yaml');
    const detailRatio = detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_image_ratio');
    const bound = bindNamedParams(detailRatio.query, { id: 'ecommerce-product-mug', company_name: 'My Company' });
    expect(await repository.query(bound.statement, bound.values)).toEqual([{ id: 'ecommerce-product-page-image-ratio-my-company', row_version: 2, company_name: 'My Company', desktop_ratio: '16_9', mobile_ratio: '4_5', desktop_ratio_label: 'Wide (16/9)', mobile_ratio_label: 'Portrait (4/5)' }]);
    database.close();

    const databasePath = `/tmp/core3-ecommerce-image-ratio-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-ratio-my-company', expected_row_version: 1, values: { desktop_ratio: '2_3', mobile_ratio: '1_1' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, desktop_ratio, mobile_ratio, row_version FROM ecommerce_product_page_image_ratio_policies WHERE id = ?', ['ecommerce-product-page-image-ratio-my-company'])).toEqual([{ company_name: 'My Company', desktop_ratio: '2_3', mobile_ratio: '1_1', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
