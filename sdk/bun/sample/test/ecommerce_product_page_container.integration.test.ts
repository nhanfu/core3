import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce product page container parity', () => {
  test('traces Odoo container values and pairs configuration and Product Detail contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-page-container-policy.yaml');
    const page = yaml('pages/product-page-container-policy.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('product_page_container = fields.Selection');
    expect(websiteModel).toContain("('unset', \"Unset\")");
    expect(websiteModel).toContain("('regular', \"Regular\")");
    expect(websiteModel).toContain("('fluid', \"Full-width\")");
    expect(templates).toContain('website._get_product_page_container()');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-page-container-policy', route: '/ecommerce/product-page-container' });
    expect(api.page).toEqual({ id: 'ecommerce-product-page-container-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_page_container_policy' });
    expect(action(api, 'edit_ecommerce_product_page_container_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.page_container.update' });
    expect(action(api, 'edit_ecommerce_product_page_container_policy').mutation.concurrency).toEqual({ required: true });
    expect(detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_container')).toBeTruthy();
    expect(detailPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_product_page_container' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-page-container', label: 'Product Page Container', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921360000-136-ecommerce-product-page-container.yaml').version).toBe('0.0.136');
    expect(yaml('migrations/20260921361000-137-ecommerce-product-page-container-demo.yaml').version).toBe('0.0.137');
  });

  test('persists page container, enforces company/value/stale guards, projects Product Detail, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_page_container_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/product-page-container-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_product_page_container_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', page_container: 'unset', page_container_label: 'Unset' }) });
    expect((await repository.querySource(options, {}, 0, 10)).data).toEqual([
      { value: 'unset', label: 'Unset' }, { value: 'regular', label: 'Regular' }, { value: 'fluid', label: 'Full-width' },
    ]);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-page-container-my-company', expected_row_version: 1, values: { page_container: 'fluid' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_CONTAINER_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-container-my-company', expected_row_version: 1, values: { page_container: 'wide' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_PAGE_CONTAINER_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-container-my-company', expected_row_version: 1, values: { page_container: 'fluid' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, page_container: 'fluid', page_container_label: 'Full-width' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-container-my-company', expected_row_version: 1, values: { page_container: 'regular' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_CONTAINER_STALE' });

    const detailApi = yaml('api/product-detail.yaml');
    const detailContainer = detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_container');
    const bound = bindNamedParams(detailContainer.query, { id: 'ecommerce-product-mug', company_name: 'My Company' });
    expect(await repository.query(bound.statement, bound.values)).toEqual([{ id: 'ecommerce-product-page-container-my-company', row_version: 2, company_name: 'My Company', page_container: 'fluid', page_container_label: 'Full-width' }]);
    database.close();

    const databasePath = `/tmp/core3-ecommerce-page-container-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-container-my-company', expected_row_version: 1, values: { page_container: 'regular' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, page_container, row_version FROM ecommerce_product_page_container_policies WHERE id = ?', ['ecommerce-product-page-container-my-company'])).toEqual([{ company_name: 'My Company', page_container: 'regular', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
