import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/package-detail.yaml');
const page = yaml('pages/package-detail.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'relocate_inventory_package');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory package relocation parity', () => {
  test('maps the Odoo package write behavior to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('package-detail');
    expect(api.page.id).toBe('package-detail');
    expect(discovered.pageDatasources.get('package-detail')).toContain('inventory_package_relocations');
    expect(page.components.find((component: any) => component.type === 'OdooFormView').header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'relocate_inventory_package', label: 'Relocate', permission: 'inventory.write' }),
    ]));
    expect(action.action).toBe('inventory.packages.relocate');
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_PACKAGE_RELOCATION_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_PACKAGE_RELOCATION_LOCATION_INVALID' }),
      expect.objectContaining({ code: 'INVENTORY_PACKAGE_RELOCATION_SAME_LOCATION' }),
    ]));
  });

  test('relocates a non-empty package and persists an audit row', async () => {
    const db = await repository('inventory_package_relocation_mutation');
    const result = await db.executeMutation(action.mutation, {
      id: 'package-relocate-0005', expected_row_version: 1, location_name: 'WH/Stock/Shelf 1',
      reason: 'Move to a replenishment shelf', current_user_id: 'user-admin', current_user_name: 'Admin User',
      current_company_name: 'Core3 Demo Company',
    }) as any;
    expect(result).toMatchObject({ package_id: 'package-relocate-0005', from_location_name: 'WH/Stock', to_location_name: 'WH/Stock/Shelf 1', moved_quantity: 2, relocated_by: 'Admin User' });
    expect(await db.query('SELECT location_name, row_version FROM inventory_packages WHERE id = ?', ['package-relocate-0005'])).toEqual([{ location_name: 'WH/Stock/Shelf 1', row_version: 2 }]);
    expect((await db.querySource(source('inventory_package_relocations'), { id: 'package-relocate-0005', current_company_name: 'Core3 Demo Company' }, 0, 10)).data).toHaveLength(1);
    await expect(db.executeMutation(action.mutation, { id: 'package-relocate-0005', expected_row_version: 2, location_name: 'WH/Stock/Shelf 1', current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PACKAGE_RELOCATION_SAME_LOCATION' });
  });

  test('enforces actor, company, empty, stale, and invalid destination guards without partial rows', async () => {
    const db = await repository('inventory_package_relocation_guards');
    const base = { id: 'package-relocate-0005', expected_row_version: 1, location_name: 'WH/Stock/Shelf 1', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };
    await expect(db.executeMutation(action.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PACKAGE_RELOCATION_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', current_company_name: 'My Company (San Francisco)' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_RELOCATION_STALE' });
    await expect(db.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', location_name: 'Customers/Wood Corner' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PACKAGE_RELOCATION_LOCATION_INVALID' });
    await expect(db.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_RELOCATION_STALE' });
    await expect(db.executeMutation(action.mutation, { ...base, id: 'package-empty-0004', current_user_id: 'user-admin' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_RELOCATION_STALE' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_package_relocations')).toEqual([{ count: 0 }]);
  });

  test('persists relocation across restart and denies inventory readers', async () => {
    const databasePath = `/tmp/core3-inventory-package-relocation-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_package_relocation_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action.mutation, { id: 'package-relocate-0005', expected_row_version: 1, location_name: 'WH/Transit', current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'Core3 Demo Company' });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT location_name, row_version FROM inventory_packages WHERE id = ?', ['package-relocate-0005'])).toEqual([{ location_name: 'WH/Transit', row_version: 2 }]);
      expect((await secondRepository.querySource(source('inventory_package_relocations'), { id: 'package-relocate-0005', current_company_name: 'Core3 Demo Company' }, 0, 10)).data[0]).toMatchObject({ to_location_name: 'WH/Transit', relocated_by: 'Restart Operator' });
      second.close();

      const reader = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'], company_name: 'My Company (San Francisco)' };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['package-detail', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['package-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.tracking'] }, uploadRoot: '/tmp/core3-inventory-package-relocation-test', eventStore: {}, topics: {},
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.packages.relocate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'package-relocate-0005', expected_row_version: 2, location_name: 'WH/Stock', current_user_id: 'inventory-reader' } }) }), new URL('http://inventory.test/api/actions/inventory.packages.relocate'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
