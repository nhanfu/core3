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

describe('eCommerce shop grid gap parity', () => {
  test('traces Odoo grid-gap action and pairs configuration and Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const designPlugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel_plugin.js', 'utf8');
    const designPanel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel.xml', 'utf8');
    const api = yaml('api/shop-grid-gap-policy.yaml');
    const page = yaml('pages/shop-grid-gap-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_gap = fields.Char');
    expect(websiteModel).toContain('Grid-gap on the shop');
    expect(designPlugin).toContain('static id = "setGap"');
    expect(designPlugin).toContain('updateData.shop_gap = gapToSave');
    expect(designPanel).toContain("action=\"'setGap'\"");
    expect(designPanel).toContain('min="0"');
    expect(designPanel).toContain('max="28"');
    expect(designPanel).toContain("unit=\"'px'\"");
    expect(page.page).toMatchObject({ id: 'ecommerce-shop-grid-gap-policy', route: '/ecommerce/shop-grid-gap' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-grid-gap-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_grid_gap_policy' });
    expect(action(api, 'edit_ecommerce_shop_grid_gap_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.grid_gap.update' });
    expect(action(api, 'edit_ecommerce_shop_grid_gap_policy').mutation.concurrency).toEqual({ required: true });
    expect(shopApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_grid_gap', permission: 'ecommerce.read' })]));
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_grid_gap' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-grid-gap', label: 'Shop Grid Gap', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921400000-144-ecommerce-shop-grid-gap.yaml').version).toBe('0.0.144');
    expect(yaml('migrations/20260921401000-145-ecommerce-shop-grid-gap-demo.yaml').version).toBe('0.0.145');
  });

  test('persists grid gap, enforces company/value/stale guards, projects Shop, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_grid_gap_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-grid-gap-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_shop_grid_gap_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', grid_gap: '16px' }) });
    expect((await repository.querySource(options, {}, 0, 20)).data).toEqual([
      { value: '0px', label: '0 px' }, { value: '4px', label: '4 px' }, { value: '8px', label: '8 px' }, { value: '16px', label: '16 px' }, { value: '24px', label: '24 px' }, { value: '28px', label: '28 px' },
    ]);
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-grid-gap-my-company', expected_row_version: 1, values: { grid_gap: '24px' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_GRID_GAP_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-gap-my-company', expected_row_version: 1, values: { grid_gap: '29px' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_GRID_GAP_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-gap-my-company', expected_row_version: 1, values: { grid_gap: '16' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_GRID_GAP_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-gap-my-company', expected_row_version: 1, values: { grid_gap: '24px' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, grid_gap: '24px' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-gap-my-company', expected_row_version: 1, values: { grid_gap: '0px' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_GRID_GAP_STALE' });
    const shop = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_grid_gap');
    expect(await repository.querySource(shop, { company_name: 'My Company' }, 0, 10)).toMatchObject({ data: { grid_gap: '24px' } });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-grid-gap-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-gap-my-company', expected_row_version: 1, values: { grid_gap: '8px' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, grid_gap, row_version FROM ecommerce_shop_grid_gap_policies WHERE id = ?', ['ecommerce-shop-grid-gap-my-company'])).toEqual([{ company_name: 'My Company', grid_gap: '8px', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
