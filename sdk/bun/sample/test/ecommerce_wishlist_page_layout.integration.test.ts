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

describe('eCommerce Wishlist Page layout parity', () => {
  test('traces Odoo Wishlist Page layout and pairs API/page/Wishlist contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/models/website.py', 'utf8');
    const plugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/static/src/website_builder/wishlist_page_option_plugin.js', 'utf8');
    const option = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/static/src/website_builder/wishlist_page_option.xml', 'utf8');
    const designPanel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/static/src/website_builder/products_design_panel.xml', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/views/website_sale_wishlist_template.xml', 'utf8');
    const styles = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/static/src/scss/website_sale_wishlist.scss', 'utf8');
    const api = yaml('api/wishlist-page-layout-policy.yaml');
    const page = yaml('pages/wishlist-page-layout-policy.yaml');
    const wishlistApi = yaml('api/wishlist.yaml');
    const wishlistPage = yaml('pages/wishlist.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain("wishlist_grid_columns = fields.Integer");
    expect(websiteModel).toContain('default=5');
    expect(websiteModel).toContain('wishlist_mobile_columns = fields.Integer');
    expect(websiteModel).toContain('default=2');
    expect(websiteModel).toContain("wishlist_gap = fields.Char");
    expect(websiteModel).toContain('default="16px"');
    expect(plugin).toContain('WishlistGridColumnsAction');
    expect(plugin).toContain('WishlistMobileColumnsAction');
    expect(plugin).toContain('WishlistSetGapAction');
    expect(option).toContain('action="\'wishlistGridColumns\'"');
    expect(option).toContain('actionValue="6"');
    expect(option).toContain('action="\'wishlistMobileColumns\'"');
    expect(option).toContain('actionValue="1"');
    expect(designPanel).toContain('action="\'wishlistSetGap\'"');
    expect(template).toContain('data-wishlist-grid-columns');
    expect(template).toContain('data-wishlist-mobile-columns');
    expect(template).toContain('--o-wsale-wishlist-grid-gap');
    expect(styles).toContain('data-wishlist-mobile-columns="1"');
    expect(styles).toContain('data-wishlist-mobile-columns="2"');
    expect(styles).toContain('@for $i from 2 through 6');

    expect(page.page).toMatchObject({ id: 'ecommerce-wishlist-page-layout-policy', route: '/ecommerce/wishlist-page-layout' });
    expect(api.page).toEqual({ id: 'ecommerce-wishlist-page-layout-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_wishlist_page_layout_policy' });
    expect(action(api, 'edit_ecommerce_wishlist_page_layout_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.wishlist.page_layout.update' });
    expect(action(api, 'edit_ecommerce_wishlist_page_layout_policy').mutation.concurrency).toEqual({ required: true });
    expect(wishlistApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_wishlist_page_layout', permission: 'ecommerce.read', single: true })]));
    expect(wishlistPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_wishlist_page_layout' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/wishlist-page-layout', label: 'Wishlist Page Layout', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260922130000-166-ecommerce-wishlist-page-layout.yaml').version).toBe('0.0.166');
    expect(yaml('migrations/20260922131000-167-ecommerce-wishlist-page-layout-demo.yaml').version).toBe('0.0.167');
  });

  test('persists layout, enforces company/value/stale guards, projects Wishlist state, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_wishlist_page_layout_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/wishlist-page-layout-policy.yaml');
    const policy = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_wishlist_page_layout_policy');
    const wishlistApi = yaml('api/wishlist.yaml');
    const projection = wishlistApi.datasources.find((source: any) => source.id === 'ecommerce_wishlist_page_layout');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', wishlist_grid_columns: 5, wishlist_mobile_columns: 2, wishlist_gap: '16px' }) });
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-wishlist-page-layout-my-company', expected_row_version: 1, values: { wishlist_grid_columns: 4, wishlist_mobile_columns: 1, wishlist_gap: '8px' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_WISHLIST_LAYOUT_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-wishlist-page-layout-my-company', expected_row_version: 1, values: { wishlist_grid_columns: 7, wishlist_mobile_columns: 2, wishlist_gap: '8px' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_WISHLIST_LAYOUT_DESKTOP_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-wishlist-page-layout-my-company', expected_row_version: 1, values: { wishlist_grid_columns: 4, wishlist_mobile_columns: 3, wishlist_gap: '8px' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_WISHLIST_LAYOUT_MOBILE_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-wishlist-page-layout-my-company', expected_row_version: 1, values: { wishlist_grid_columns: 4, wishlist_mobile_columns: 1, wishlist_gap: '29px' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_WISHLIST_LAYOUT_GAP_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-wishlist-page-layout-my-company', expected_row_version: 1, values: { wishlist_grid_columns: 4, wishlist_mobile_columns: 1, wishlist_gap: '8px' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, wishlist_grid_columns: 4, wishlist_mobile_columns: 1, wishlist_gap: '8px' });
    expect(await repository.querySource(projection, { company_name: 'My Company' }, 0, 1)).toMatchObject({ data: { wishlist_grid_columns: 4, wishlist_mobile_columns: 1, wishlist_gap: '8px' } });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-wishlist-page-layout-my-company', expected_row_version: 1, values: { wishlist_grid_columns: 5, wishlist_mobile_columns: 2, wishlist_gap: '16px' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_WISHLIST_LAYOUT_STALE' });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-wishlist-page-layout-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-wishlist-page-layout-my-company', expected_row_version: 1, values: { wishlist_grid_columns: 6, wishlist_mobile_columns: 2, wishlist_gap: '24px' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, wishlist_grid_columns, wishlist_mobile_columns, wishlist_gap, row_version FROM ecommerce_wishlist_page_layout_policies WHERE id = ?', ['ecommerce-wishlist-page-layout-my-company'])).toEqual([{ company_name: 'My Company', wishlist_grid_columns: 6, wishlist_mobile_columns: 2, wishlist_gap: '24px', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
