import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

const operationQuery = async (repository: YamlRepository, definition: any, request: Record<string, unknown>) => {
  const bound = bindNamedParams(definition.query, request);
  return repository.query(bound.statement, bound.values);
};

describe('eCommerce product feed parity', () => {
  test('traces the Odoo feed model/controller/menu and pairs page, API, and public operation contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_feed.py', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/product_feed.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_feed_views.xml', 'utf8');
    const menu = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml', 'utf8');
    const security = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/security/res_groups.xml', 'utf8');
    const api = yaml('api/product-feeds.yaml');
    const page = yaml('pages/product-feeds.yaml');
    const operations = yaml('operations.yaml').operations;
    const manifest = yaml('manifest.yaml');

    expect(model).toContain("_name = 'product.feed'");
    expect(model).toContain("target = fields.Selection");
    expect(model).toContain('access_token = fields.Char');
    expect(model).toContain('_render_and_cache_compressed_gmc_feed');
    expect(controller).toContain("'/gmc.xml'");
    expect(controller).toContain('access_token');
    expect(view).toContain('id="product_feed_list"');
    expect(view).toContain('id="product_feed_form"');
    expect(view).toContain('id="action_product_feeds"');
    expect(menu).toContain('action="website_sale.action_product_feeds"');
    expect(security).toContain('id="group_product_feed"');
    expect(page.page.id).toBe('ecommerce-product-feeds');
    expect(api.page).toEqual({ id: 'ecommerce-product-feeds' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_product_feeds', create_action: 'create_ecommerce_product_feed' });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-feeds', permission: 'ecommerce.read' }),
    ]));
    expect(action(api, 'create_ecommerce_product_feed')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.product_feeds.create' });
    expect(action(api, 'edit_ecommerce_product_feed').mutation.concurrency).toEqual({ required: true });
    expect(operations['ecommerce.public.product_feed'].query).toContain('access_token = :access_token');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921180000-100-ecommerce-product-feeds.yaml').version).toBe('0.0.100');
    expect(yaml('migrations/20260921181000-101-ecommerce-product-feeds-demo.yaml').version).toBe('0.0.101');
  });

  test('creates, generates, filters, invalidates, and deletes a feed with scope and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_feeds_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_feeds_test', ['schema', 'data']);
    const api = yaml('api/product-feeds.yaml');
    const source = api.datasources[0];
    const rows = () => repository.querySource(source, { q: null, active: true, company_name: 'My Company', fixture_state: null }, 0, 50);
    expect((await rows()).data).toMatchObject([
      expect.objectContaining({ id: 'ecommerce-feed-gmc-my-company', name: 'GMC 1', target: 'gmc', cache_status: 'Not generated', product_count: 3 }),
    ]);
    const create = action(api, 'create_ecommerce_product_feed');
    const edit = action(api, 'edit_ecommerce_product_feed');
    const generate = action(api, 'generate_ecommerce_product_feed');
    const remove = action(api, 'delete_ecommerce_product_feed');
    const values = { name: 'Office GMC', target: 'gmc', language_code: 'en_US', pricelist_id: null, category_id: 'ecommerce-category-office', company_name: 'My Company', active: true };
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_FEED_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { ...values, name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_FEED_NAME_INVALID' });
    const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', values }) as any;
    expect(created).toMatchObject({ name: 'Office GMC', target: 'gmc', category_id: 'ecommerce-category-office', company_name: 'My Company', row_version: 1 });
    expect(String(created.access_token).length).toBeGreaterThan(10);
    const generated = await repository.executeMutation(generate.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company' }) as any;
    expect(generated).toMatchObject({ row_version: 2, cache_expiry: expect.anything() });
    expect(generated.cache_xml).toContain('<g:title>Ergonomic Office Chair</g:title>');
    expect(generated.cache_xml).toContain('<g:title>Core3 Ceramic Mug</g:title>');
    expect(generated.cache_xml).not.toContain('Desk Lamp');
    expect((await rows()).data.find((row: any) => row.id === created.id)).toMatchObject({ cache_status: 'Generated', product_count: 2 });
    const publicOperation = yaml('operations.yaml').operations['ecommerce.public.product_feed'];
    expect(await operationQuery(repository, publicOperation, { feed_id: created.id, access_token: created.access_token })).toHaveLength(1);
    expect(await operationQuery(repository, publicOperation, { feed_id: created.id, access_token: 'wrong-token' })).toHaveLength(0);
    await expect(repository.executeMutation(generate.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_FEED_STALE' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company', values: { ...values, name: 'Office GMC Updated', category_id: null } }) as any;
    expect(edited).toMatchObject({ name: 'Office GMC Updated', row_version: 3 });
    expect((await operationQuery(repository, publicOperation, { feed_id: created.id, access_token: created.access_token }))).toHaveLength(0);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_FEED_STALE' });
    expect(await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 3, current_company_name: 'My Company' })).toMatchObject({ deleted: true, id: created.id });
    database.close();
  });

  test('preserves feed configuration and generated cache across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-feed-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_feed_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const api = yaml('api/product-feeds.yaml');
      const create = action(api, 'create_ecommerce_product_feed');
      const generate = action(api, 'generate_ecommerce_product_feed');
      const created = await firstRepository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { name: 'Restart GMC', target: 'gmc', language_code: 'en_US', company_name: 'My Company', active: true } }) as any;
      await firstRepository.executeMutation(generate.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company' });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT name, row_version, target, cache_xml IS NOT NULL AS cached FROM ecommerce_product_feeds WHERE id = ?', [created.id])).toEqual([
        expect.objectContaining({ name: 'Restart GMC', row_version: 2, target: 'gmc', cached: true }),
      ]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
