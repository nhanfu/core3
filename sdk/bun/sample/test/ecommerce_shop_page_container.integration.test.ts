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

describe('eCommerce shop page container parity', () => {
  test('traces Odoo shop container values and pairs configuration and Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/shop-page-container-policy.yaml');
    const page = yaml('pages/shop-page-container-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_page_container = fields.Selection');
    expect(websiteModel).toContain("('regular', \"Regular\")");
    expect(websiteModel).toContain("('fluid', \"Full-width\")");
    expect(templates).toContain('website.shop_page_container == \'fluid\'');
    expect(page.page).toMatchObject({ id: 'ecommerce-shop-page-container-policy', route: '/ecommerce/shop-page-container' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-page-container-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_page_container_policy' });
    expect(action(api, 'edit_ecommerce_shop_page_container_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.page_container.update' });
    expect(action(api, 'edit_ecommerce_shop_page_container_policy').mutation.concurrency).toEqual({ required: true });
    expect(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query).toContain('shop_page_container');
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_page_container' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-page-container', label: 'Shop Page Container', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921370000-138-ecommerce-shop-page-container.yaml').version).toBe('0.0.138');
    expect(yaml('migrations/20260921371000-139-ecommerce-shop-page-container-demo.yaml').version).toBe('0.0.139');
  });

  test('persists shop container, enforces company/value/stale guards, projects Shop, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_container_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-page-container-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_shop_page_container_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', page_container: 'regular', page_container_label: 'Regular' }) });
    expect((await repository.querySource(options, {}, 0, 10)).data).toEqual([
      { value: 'regular', label: 'Regular' }, { value: 'fluid', label: 'Full-width' },
    ]);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-page-container-my-company', expected_row_version: 1, values: { page_container: 'fluid' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PAGE_CONTAINER_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-container-my-company', expected_row_version: 1, values: { page_container: 'wide' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_PAGE_CONTAINER_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-container-my-company', expected_row_version: 1, values: { page_container: 'fluid' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, page_container: 'fluid', page_container_label: 'Full-width' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-container-my-company', expected_row_version: 1, values: { page_container: 'regular' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PAGE_CONTAINER_STALE' });

    const shopApi = yaml('api/shop.yaml');
    const bound = bindNamedParams(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query, { company_name: 'My Company', q: null, fixture_state: null });
    expect((await repository.query(bound.statement, bound.values)).every((row: any) => row.shop_page_container === 'fluid')).toBe(true);
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-container-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-container-my-company', expected_row_version: 1, values: { page_container: 'fluid' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, page_container, row_version FROM ecommerce_shop_page_container_policies WHERE id = ?', ['ecommerce-shop-page-container-my-company'])).toEqual([{ company_name: 'My Company', page_container: 'fluid', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
