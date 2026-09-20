import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
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
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.name)).toEqual(['PACK/RELOCATE/0005', 'PACK0000001', 'PACK0000002', 'PACK0000004']);
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

  test('preserves package create, edit, and unpack lifecycle across a database restart', async () => {
    const databasePath = `/tmp/core3-inventory-package-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_package_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const actions = parsed('api/packages.yaml').actions.concat(parsed('api/package-detail.yaml').actions);
    const action = (id: string) => actions.find((entry: any) => entry.id === id);
    const create = action('create_inventory_package');
    const edit = action('edit_inventory_package');
    const unpack = action('unpack_inventory_package');

    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(create.mutation, {
        values: {
          name: 'PACK-RESTART-0001',
          package_type_name: 'Box',
          location_name: 'WH/Stock/Shelf 1',
          company_name: 'My Company (San Francisco)',
          pack_date: '2026-01-15',
        },
      }) as any;
      expect(created).toMatchObject({ name: 'PACK-RESTART-0001', state: 'Empty', content_count: 0, row_version: 1 });
      const edited = await firstRepository.executeMutation(edit.mutation, {
        id: created.id,
        expected_row_version: created.row_version,
        values: { name: 'PACK-RESTART-0001-EDITED', package_type_name: 'Pallet', location_name: 'WH/Stock' },
      }) as any;
      expect(edited).toMatchObject({ id: created.id, name: 'PACK-RESTART-0001-EDITED', package_type_name: 'Pallet', row_version: 2 });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const detail = parsed('api/package-detail.yaml').datasources[0];
      expect((await secondRepository.querySource(detail, { id: created.id, fixture_state: null }, 0, 1)).data).toMatchObject({
        id: created.id,
        name: 'PACK-RESTART-0001-EDITED',
        package_type_name: 'Pallet',
        location_name: 'WH/Stock',
        state: 'Empty',
        row_version: 2,
      });
      await expect(secondRepository.executeMutation(edit.mutation, {
        id: created.id,
        expected_row_version: 1,
        values: { name: 'PACK-STALE', package_type_name: 'Box', location_name: 'WH/Stock' },
      })).rejects.toMatchObject({ status: 409 });
      await expect(secondRepository.executeMutation(unpack.mutation, {
        id: created.id,
        expected_row_version: 2,
        values: unpack.params.values,
      })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_PACKAGE_NOT_FOUND' });
      const unpacked = await secondRepository.executeMutation(unpack.mutation, {
        id: 'package-main-0001',
        expected_row_version: 1,
        values: unpack.params.values,
      }) as any;
      expect(unpacked).toMatchObject({ id: 'package-main-0001', state: 'Empty', content_count: 0 });
      second.close();

      const third = await DuckDbDatabase.open(databasePath);
      const thirdRepository = new YamlRepository(third);
      await migrateDatabase(thirdRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await thirdRepository.querySource(detail, { id: created.id, fixture_state: null }, 0, 1)).data).toMatchObject({
        id: created.id,
        name: 'PACK-RESTART-0001-EDITED',
        state: 'Empty',
        content_count: 0,
        row_version: 2,
      });
      expect((await thirdRepository.querySource(detail, { id: 'package-main-0001', fixture_state: null }, 0, 1)).data).toMatchObject({
        id: 'package-main-0001',
        state: 'Empty',
        content_count: 0,
        row_version: 2,
      });
      third.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
