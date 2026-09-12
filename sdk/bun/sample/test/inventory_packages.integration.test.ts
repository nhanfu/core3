import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/inventory');
const parsed = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Inventory Packages Odoo action parity', () => {
  test('keeps the Products menu, page/API ownership, and source view order aligned', () => {
    const page = parsed('pages/packages.yaml');
    const detail = parsed('pages/package-detail.yaml');
    const api = parsed('api/packages.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'packages', route: '/packages' });
    expect(detail.page).toMatchObject({ id: 'package-detail', route: '/packages/detail' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].default_filters).toEqual({ internal: 'internal', main_packages: 'main' });
    expect(discovered.pageDatasources.get('packages')).toContain('inventory_packages');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/packages', page: 'packages', module: 'inventory' }),
      expect.objectContaining({ path: '/packages/detail', page: 'package-detail', module: 'inventory' }),
    ]));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(page.components[0].form_view).toMatchObject({ side_panel: false });
    expect(page.components[0].empty_state).toMatchObject({
      title: 'Create a new package',
      illustration: 'package',
    });
    expect(page.components[0].empty_state.description).toContain('usually created via transfers');
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Package Name', 'Container', 'Package Type', 'Location', 'Company']);
    expect(parsed('manifest.yaml').menu.groups.find((group: any) => group.id === 'products').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/packages', label: 'Packages', permission: 'inventory.tracking' }),
    ]));
  });

  test('seeds deterministic internal, customer, and empty packages with filters and errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'inventory_packages_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'inventory_packages_test_migrations', ['schema', 'data']);
    const source = parsed('api/packages.yaml').datasources[0];
    const params = { q: null, internal: 'internal', main_packages: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.name)).toEqual(['PACK0000001', 'PACK0000002', 'PACK0000004']);
    expect((await repository.querySource(source, { ...params, q: 'PACK0000003', internal: null }, 0, 50)).data[0]).toMatchObject({ location_name: 'Customers/Wood Corner' });
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_PACKAGES_UNAVAILABLE' });
    database.close();
  });

  test('keeps package form actions permissioned and guarded', () => {
    const api = parsed('api/package-detail.yaml');
    expect(parsed('pages/packages.yaml').page.auth.require).toEqual(['inventory.tracking']);
    expect(parsed('pages/package-detail.yaml').page.auth.require).toEqual(['inventory.tracking']);
    expect(api.datasources.every((source: any) => source.permission === 'inventory.tracking')).toBe(true);
    expect(api.actions.find((action: any) => action.id === 'edit_inventory_package').mutation.concurrency.required).toBe(true);
    expect(api.actions.find((action: any) => action.id === 'edit_inventory_package').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'INVENTORY_PACKAGE_EXISTS' }),
      expect.objectContaining({ status: 422, code: 'INVENTORY_PACKAGE_NAME_REQUIRED' }),
    ]));
    expect(api.actions.find((action: any) => action.id === 'unpack_inventory_package').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404, code: 'INVENTORY_PACKAGE_NOT_FOUND' }),
    ]));
  });
});
