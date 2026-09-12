import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const listApi = yaml('api/scraps.yaml');
const detailApi = yaml('api/scrap-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Scrap Orders Odoo action parity', () => {
  test('keeps page/API ownership, menu placement, and Odoo modes aligned', () => {
    const pages = discoverPages(join(import.meta.dir, '..'));
    const manifest = yaml('manifest.yaml');
    const adjustments = manifest.menu.groups.find((group: any) => group.id === 'adjustments');
    expect(adjustments.items).toContainEqual({ path: '/inventory/scraps', label: 'Scrap Orders', icon: 'delete', permission: 'inventory.read' });
    expect(yaml('pages/scraps.yaml').datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'inventory-scraps' });
    expect(detailApi.page).toEqual({ id: 'inventory-scrap-detail' });
    expect(pages.pageDatasources.get('inventory-scraps')).toContain('inventory_scrap_orders');
    expect(discoverPageRoutes(pages)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/inventory/scraps', page: 'inventory-scraps', module: 'inventory' }),
      expect.objectContaining({ path: '/inventory/scraps/detail', page: 'inventory-scrap-detail', module: 'inventory' }),
    ]));
    const list = yaml('pages/scraps.yaml').components[0];
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'form', 'kanban', 'pivot', 'graph']);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Reference', 'Date', 'Product', 'Quantity', 'Unit', 'Company', 'Status', ' ']);
    expect(list.form_view.page).toBe('apps/services/inventory/pages/scrap-detail.yaml');
    expect(yaml('pages/scrap-detail.yaml').components[0].statusbar.map((item: any) => item.label)).toEqual(['Draft', 'Done']);
  });

  test('returns deterministic default, filter, empty, detail, and transport states', async () => {
    const { database, repository } = await repositoryForTest('inventory_scrap_fixture_test');
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_scrap_orders');
    const params = { q: null, state: null, product_name: null, source_location: null, scrap_location: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data).toHaveLength(6);
    expect((await repository.querySource(source, { ...params, state: 'Done' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { ...params, q: 'Drawer' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['SCRAP/2026/0003', 'SCRAP/2026/0005']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_SCRAP_UNAVAILABLE' });
    const detail = detailApi.datasources[0];
    expect((await repository.querySource(detail, { id: 'inventory-scrap-0002', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'SCRAP/2026/0002', state: 'Draft' });
    expect((await repository.querySource(detail, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'inventory-scrap-0002', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_SCRAP_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('guards create, edit, validate, stale writes, and done deletion', async () => {
    const { database, repository } = await repositoryForTest('inventory_scrap_mutation_test');
    const values = { name: 'SCRAP/2026/0099', date_done: '2026-01-21', product_id: 'product-furn-9666', product_name: '[FURN_9666] Table', scrap_qty: 1, product_uom: 'Units', source_location: 'WH/Stock', scrap_location: 'Virtual Locations/Scrap', company_name: 'My Company (San Francisco)', state: 'Draft', should_replenish: false };
    const created = await repository.executeMutation(action('create_inventory_scrap').mutation, { values });
    expect(created).toMatchObject({ id: 'inventory-scrap-scrap-2026-0099', state: 'Draft', row_version: 1 });
    await expect(repository.executeMutation(action('create_inventory_scrap').mutation, { values: { ...values, name: 'scrap/2026/0099' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_SCRAP_REFERENCE_EXISTS' });
    await expect(repository.executeMutation(action('create_inventory_scrap').mutation, { values: { ...values, name: 'SCRAP/2026/0100', scrap_qty: 0 } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_SCRAP_REQUIRED_FIELDS' });
    const edited = await repository.executeMutation(action('edit_inventory_scrap').mutation, { id: created.id, expected_row_version: 1, values: { ...values, scrap_qty: 2 } });
    expect(edited).toMatchObject({ scrap_qty: 2, row_version: 2 });
    await expect(repository.executeMutation(action('edit_inventory_scrap').mutation, { id: created.id, expected_row_version: 1, values })).rejects.toMatchObject({ status: 409 });
    const done = await repository.executeMutation(action('validate_inventory_scrap').mutation, { id: 'inventory-scrap-0002', expected_row_version: 1, values: { state: 'Done' } });
    expect(done).toMatchObject({ state: 'Done', row_version: 2 });
    await expect(repository.executeMutation(action('delete_inventory_scrap').mutation, { id: 'inventory-scrap-0001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_SCRAP_DONE_DELETE' });
    database.close();
  });
});
