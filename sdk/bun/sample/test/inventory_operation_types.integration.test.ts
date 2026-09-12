import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/inventory');
const parsed = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const operation = (id: string) => [parsed('api/operation-types.yaml'), parsed('api/operation-type-detail.yaml')].flatMap((api: any) => api.actions ?? []).find((item: any) => item.id === id);

describe('Inventory Operations Types Odoo action parity', () => {
  test('keeps the Configuration menu, page/API ownership, and Odoo views aligned', () => {
    const page = parsed('pages/operation-types.yaml');
    const detail = parsed('pages/operation-type-detail.yaml');
    const api = parsed('api/operation-types.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'operation-types', route: '/operation-types' });
    expect(detail.page).toMatchObject({ id: 'operation-type-detail', route: '/operation-types/detail' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('operation-types')).toContain('inventory_operation_types');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/operation-types', page: 'operation-types', module: 'inventory' }),
      expect.objectContaining({ path: '/operation-types/detail', page: 'operation-type-detail', module: 'inventory' }),
    ]));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Sequence', 'Operation Type', 'Warehouse', 'Company', 'Active']);
    expect(parsed('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/operation-types', label: 'Operations Types', permission: 'inventory.manage' }),
    ]));
    expect(detail.components[0].groups.map((group: any) => group.title)).toEqual(['General', 'Hardware']);
  });

  test('seeds deterministic active and archived records and supports filters, empty, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'inventory_operation_types_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'inventory_operation_types_test_migrations', ['schema', 'data']);
    const source = parsed('api/operation-types.yaml').datasources[0];
    const params = { q: null, active: null, is_favorite: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.name)).toEqual(['Receipts', 'Deliveries', 'Internal Transfers', 'Quality Control']);
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Legacy Dispatch']);
    expect((await repository.querySource(source, { ...params, q: 'WH-QC' }, 0, 50)).data[0]).toMatchObject({ name: 'Quality Control', code: 'WH-QC', default_location_src_name: 'Stock' });
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_OPERATION_TYPES_UNAVAILABLE' });
    database.close();
  });

  test('keeps create, update, lifecycle, validation, stale, and permission boundaries explicit', () => {
    const api = parsed('api/operation-types.yaml');
    expect(parsed('pages/operation-types.yaml').page.auth.require).toEqual(['inventory.manage']);
    expect(parsed('pages/operation-type-detail.yaml').page.auth.require).toEqual(['inventory.manage']);
    expect(api.datasources.every((source: any) => source.permission === 'inventory.manage')).toBe(true);
    expect(operation('edit_inventory_operation_type').mutation.concurrency.required).toBe(true);
    expect(operation('archive_inventory_operation_type').mutation.concurrency.required).toBe(true);
    expect(operation('create_inventory_operation_type').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'INVENTORY_OPERATION_TYPE_CODE_EXISTS' }),
      expect.objectContaining({ status: 422, code: 'INVENTORY_OPERATION_TYPE_KIND_INVALID' }),
    ]));
    expect(operation('archive_inventory_operation_type').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'INVENTORY_OPERATION_TYPE_HAS_OPEN_TRANSFERS' }),
    ]));
    expect(operation('view_inventory_operation_type')).toMatchObject({ type: 'navigate', navigate_to: '/operation-types/detail' });
  });
});
