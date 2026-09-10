import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/manufacturing-orders.yaml');
const detailApi = () => yaml('api/manufacturing-order-detail.yaml');
const workflow = () => yaml('pages/manufacturing-workflow.yaml').workflow;
const action = (id: string) => [...(listApi().actions || []), ...(detailApi().actions || [])].find((item: any) => item.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const migrations = join(serviceRoot, 'migrations');
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_orders_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_orders_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Orders parity slice', () => {
  test('keeps pages presentation-only and binds list/detail API fragments by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/manufacturing-orders.yaml');
    const detailPage = yaml('pages/manufacturing-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'manufacturing-orders', route: '/manufacturing-orders' });
    expect(detailPage.page).toMatchObject({ id: 'manufacturing-detail', route: '/manufacturing-orders/detail' });
    expect(listPage.components[0]).toMatchObject({ source: 'mrp_productions', row_open_action: 'view_mrp_production', view_navigation: 'icons' });
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'mrp_production_detail' });
    expect(detailPage.components[0].notebook.tabs.map((tab: any) => tab.label)).toEqual(['Components', 'Work Orders', 'Miscellaneous']);
    expect(discovered.pageDatasources.get('manufacturing-orders')).toEqual(['mrp_production_states', 'mrp_bom_lookup', 'mrp_productions']);
    expect(discovered.pageDatasources.get('manufacturing-detail')).toEqual(['mrp_production_detail', 'mrp_production_workorders', 'mrp_production_moves']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing-orders', page: 'manufacturing-orders', module: 'manufacturing' }),
      expect.objectContaining({ path: '/manufacturing-orders/detail', page: 'manufacturing-detail', module: 'manufacturing' }),
    ]));
  });

  test('seeds all MO states, work orders, moves, search, empty, detail, and error fixtures deterministically', async () => {
    const { database, repository } = await repositoryForTest();
    const list = listApi().datasources.find((source: any) => source.id === 'mrp_productions');
    const detail = detailApi().datasources.find((source: any) => source.id === 'mrp_production_detail');
    const workorders = detailApi().datasources.find((source: any) => source.id === 'mrp_production_workorders');
    const moves = detailApi().datasources.find((source: any) => source.id === 'mrp_production_moves');
    const params = { q: null, state: null, priority: null, fixture_state: null };

    expect((await repository.querySource(list, params, 0, 50)).data.map((row: any) => row.state)).toEqual(['Cancelled', 'Done', 'To Close', 'In Progress', 'Confirmed', 'Draft']);
    expect((await repository.querySource(list, { ...params, q: 'Wood Panel' }, 0, 50)).data).toMatchObject([{ id: 'mo-progress-001', workorder_count: 3 }]);
    expect((await repository.querySource(list, { ...params, state: 'To Close' }, 0, 50)).data).toMatchObject([{ id: 'mo-to-close-001', qty_produced: 8 }]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detail, { id: 'mo-progress-001', fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'In Progress', planned_date: '2026-01-15' });
    expect((await repository.querySource(detail, { id: 'missing-mo', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(workorders, { id: 'mo-progress-001', fixture_state: null }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(moves, { id: 'mo-progress-001', fixture_state: null }, 0, 50)).data).toHaveLength(2);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCTIONS_UNAVAILABLE' });
    database.close();
  });

  test('declares permissioned CRUD/workflow actions and enforces transitions, validation, and stale writes', async () => {
    const { database, repository } = await repositoryForTest();
    expect(workflow().states.map((state: any) => state.id)).toEqual(['Draft', 'Confirmed', 'In Progress', 'To Close', 'Done', 'Cancelled']);
    expect(workflow().transitions.every((transition: any) => transition.permission === 'manufacturing.write' && transition.mutation.guards[0].status === 409)).toBe(true);
    expect(listApi().datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(detailApi().datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    for (const id of ['create_mrp_production', 'confirm_mrp_production', 'start_mrp_production', 'produce_mrp_production', 'close_mrp_production', 'cancel_mrp_production', 'edit_mrp_production']) {
      expect(action(id), id).toHaveProperty('permission', 'manufacturing.write');
    }

    const create = action('create_mrp_production');
    const edit = action('edit_mrp_production');
    const values = { name: 'MO/QA/0001', product_id: 'product-qa', product_name: 'QA Assembly', bom_id: null, quantity: 4, planned_date: '2026-01-15', priority: 'Normal', reference: 'QA', company_name: 'My Company (San Francisco)', warehouse_name: 'WH/Stock', origin: 'QA', availability: 'Waiting', locked: false };
    const created = await repository.executeMutation(create.mutation, { id: 'mo-qa-001', values });
    expect(created).toMatchObject({ id: 'mo-qa-001', state: 'Draft', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'mo-qa-invalid', values: { ...values, quantity: 0 } })).rejects.toMatchObject({ status: 422, code: 'MRP_PRODUCTION_QUANTITY_INVALID' });
    const confirmed = await repository.executeMutation(workflow().transitions.find((item: any) => item.id === 'confirm').mutation, { id: created.id });
    expect(confirmed).toMatchObject({ state: 'Confirmed', row_version: 2 });
    await expect(repository.executeMutation(workflow().transitions.find((item: any) => item.id === 'confirm').mutation, { id: created.id })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCTION_INVALID_STATE' });
    await repository.executeMutation(workflow().transitions.find((item: any) => item.id === 'start').mutation, { id: created.id });
    await repository.executeMutation(workflow().transitions.find((item: any) => item.id === 'produce').mutation, { id: created.id });
    const closed = await repository.executeMutation(workflow().transitions.find((item: any) => item.id === 'close').mutation, { id: created.id });
    expect(closed).toMatchObject({ state: 'Done', qty_produced: 4, row_version: 5 });
    await expect(repository.executeMutation(workflow().transitions.find((item: any) => item.id === 'cancel').mutation, { id: created.id })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCTION_INVALID_STATE' });

    const edited = await repository.executeMutation(edit.mutation, { id: 'mo-draft-001', expected_row_version: 1, values: { ...values, name: 'MO/2026/0001 updated', product_name: '[FURN_7800] Desk Combination', quantity: 6 } });
    expect(edited).toMatchObject({ id: 'mo-draft-001', quantity: 6, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'mo-draft-001', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-mo', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCTION_NOT_FOUND' });
    database.close();
  });
});
