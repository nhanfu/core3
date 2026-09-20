import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/overview.yaml');
const page = yaml('pages/overview.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'open_inventory_overview');

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_overview_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

describe('Inventory Overview Odoo operation-card parity', () => {
  test('maps the source menu/action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'inventory-overview' });
    expect(discovered.pageDatasources.get('inventory-overview')).toEqual(['inventory_overview_cards', 'inventory_overview_runs']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/inventory/overview', page: 'inventory-overview', module: 'inventory' }),
    ]));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'list']);
    expect(page.components[0].views[0].card.fields.map((field: any) => field.field)).toEqual([
      'ready_label', 'count_picking_waiting', 'count_picking_late', 'count_picking_backorders', 'count_move_ready',
    ]);
    expect(action).toMatchObject({ type: 'server_form', permission: 'inventory.read', action: 'stock.inventory_overview.open', operation: 'report' });
    expect(action.fields[0].options.map((option: any) => option.value)).toEqual(['all', 'ready', 'waiting', 'late', 'backorders', 'operations']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'overview').items)
      .toContainEqual(expect.objectContaining({ path: '/inventory/overview', label: 'Overview', permission: 'inventory.read' }));
  });

  test('returns deterministic current-company operation cards and seeded history', async () => {
    const { database, repository } = await repositoryForTest();
    const cards = api.datasources.find((source: any) => source.id === 'inventory_overview_cards');
    const history = api.datasources.find((source: any) => source.id === 'inventory_overview_runs');
    const params = { current_company_name: 'My Company (San Francisco)', fixture_state: null };
    expect((await repository.querySource(cards, params, 0, 20)).data.map((row: any) => row.id)).toEqual([
      'operation-receipts', 'operation-deliveries', 'operation-internal', 'operation-quality',
    ]);
    expect((await repository.querySource(cards, params, 0, 20)).data[0]).toMatchObject({
      name: 'Receipts', count_picking_ready: 3, count_picking_waiting: 1, count_picking_late: 2, count_move_ready: 0,
    });
    expect((await repository.querySource(cards, { ...params, fixture_state: 'empty' }, 0, 20)).data).toEqual([]);
    expect((await repository.querySource(cards, { current_company_name: 'Other Company', fixture_state: null }, 0, 20)).data).toEqual([]);
    expect((await repository.querySource(history, params, 0, 20)).data).toMatchObject([
      { id: 'inventory-overview-open-0001', operation_name: 'Receipts', filter_name: 'ready', requested_by: 'Mitchell Admin' },
    ]);
    database.close();
  });

  test('records report opens with actor/company/filter and rejects permission or stale cards', async () => {
    const { database, repository } = await repositoryForTest();
    const base = { id: 'operation-receipts', expected_row_version: 1, current_company_name: 'My Company (San Francisco)', company_name: 'My Company (San Francisco)', current_user_id: 'user-admin', current_user_name: 'Inventory Manager', filter_name: 'ready' };
    const opened = await repository.executeMutation(action.mutation, base) as any;
    expect(opened).toMatchObject({ id: 'inventory-overview-operation-receipts-2', operation_name: 'Receipts', filter_name: 'ready', requested_by: 'Inventory Manager', row_version: 1 });
    await expect(repository.executeMutation(action.mutation, { ...base, id: 'operation-receipts', expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_OVERVIEW_STALE' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_id: '', current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_OVERVIEW_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_OVERVIEW_COMPANY' });
    await expect(repository.executeMutation(action.mutation, { ...base, filter_name: 'invalid' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_OVERVIEW_FILTER_INVALID' });
    database.close();
  });

  test('enforces inventory.read at the page/API boundary and survives restart', async () => {
    const databasePath = `/tmp/core3-inventory-overview-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: first.repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((source: any) => [source.id, source])),
      pageSources: new Map([['inventory-overview', api.datasources.map((source: any) => source.id)]]),
      pages: new Map([['inventory-overview', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const response = await handler(new Request('http://inventory.test/api/pages/inventory-overview?current_company_name=My%20Company%20(San%20Francisco)'), new URL('http://inventory.test/api/pages/inventory-overview?current_company_name=My%20Company%20(San%20Francisco)'));
    expect(response.status).toBe(200);
    expect((await response.json()).datasources.find((source: any) => source.id === 'inventory_overview_cards').data).toHaveLength(4);
    await first.repository.executeMutation(action.mutation, { id: 'operation-receipts', expected_row_version: 1, current_company_name: 'My Company (San Francisco)', company_name: 'My Company (San Francisco)', current_user_id: 'user-restart', current_user_name: 'Restart Operator', filter_name: 'operations' });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT operation_name, filter_name, requested_by FROM inventory_overview_runs WHERE id = ?', ['inventory-overview-operation-receipts-2'])).toEqual([{ operation_name: 'Receipts', filter_name: 'operations', requested_by: 'Restart Operator' }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
