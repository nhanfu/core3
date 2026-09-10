import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/workorders.yaml');
const detailApi = () => yaml('api/workorder-detail.yaml');
const workflow = () => yaml('pages/workorder-workflow.yaml').workflow;
const action = (id: string) => [...(listApi().actions || []), ...(detailApi().actions || [])].find((item: any) => item.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const migrations = join(serviceRoot, 'migrations');
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_workorders_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_workorders_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Work Orders parity slice', () => {
  test('keeps list/detail pages presentation-only and binds API fragments by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/workorders.yaml');
    const detailPage = yaml('pages/workorder-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'manufacturing-workorders', route: '/workorders' });
    expect(detailPage.page).toMatchObject({ id: 'manufacturing-workorder-detail', route: '/workorders/detail' });
    expect(listPage.components[0]).toMatchObject({ source: 'mrp_workorders', row_open_action: 'view_mrp_workorder', default_group_by: 'workcenter' });
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'calendar', 'pivot', 'graph']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'mrp_workorder_detail' });
    expect(discovered.pageDatasources.get('manufacturing-workorders')).toEqual(['mrp_workorder_states', 'mrp_workorders']);
    expect(discovered.pageDatasources.get('manufacturing-workorder-detail')).toEqual(['mrp_workorder_detail']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/workorders', page: 'manufacturing-workorders', module: 'manufacturing' }),
      expect.objectContaining({ path: '/workorders/detail', page: 'manufacturing-workorder-detail', module: 'manufacturing' }),
    ]));
  });

  test('seeds all required work-order states and deterministic list/detail/empty/error fixtures', async () => {
    const { database, repository } = await repositoryForTest();
    const list = listApi().datasources.find((source: any) => source.id === 'mrp_workorders');
    const detail = detailApi().datasources.find((source: any) => source.id === 'mrp_workorder_detail');
    const params = { q: null, state: null, workcenter: null, late: null, fixture_state: null };

    expect((await repository.querySource(list, params, 0, 50)).data.map((row: any) => row.state).sort()).toEqual(['Blocked', 'Cancelled', 'Finished', 'Finished', 'Progress', 'Ready', 'Waiting']);
    expect((await repository.querySource(list, { ...params, q: 'Cut panels' }, 0, 50)).data).toMatchObject([{ id: 'wo-progress-001', production_name: 'MO/2026/0003' }]);
    expect((await repository.querySource(list, { ...params, state: 'Blocked' }, 0, 50)).data).toMatchObject([{ id: 'wo-blocked-001', late: true, blocked_reason: 'Material shortage' }]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detail, { id: 'wo-progress-001', fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Progress', planned_date: '2026-01-15', production_name: 'MO/2026/0003' });
    expect((await repository.querySource(detail, { id: 'missing-workorder', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKORDERS_UNAVAILABLE' });
    database.close();
  });

  test('declares permissioned guarded actions and enforces the full operator workflow with stale-write rejection', async () => {
    const { database, repository } = await repositoryForTest();
    const transitions = workflow().transitions;
    expect(workflow().states.map((state: any) => state.id)).toEqual(['Waiting', 'Ready', 'Progress', 'Finished', 'Blocked', 'Cancelled']);
    expect(transitions.map((transition: any) => transition.id)).toEqual(['plan', 'start', 'pause', 'continue', 'block', 'cancel']);
    expect(transitions.every((transition: any) => transition.permission === 'manufacturing.write' && transition.mutation.concurrency.required === true)).toBe(true);
    expect(transitions.every((transition: any) => transition.mutation.guards[0].status === 400 && transition.mutation.guards[1].status === 409)).toBe(true);
    expect(listApi().datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(detailApi().datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    for (const id of ['plan_mrp_workorder', 'start_mrp_workorder', 'pause_mrp_workorder', 'continue_mrp_workorder', 'block_mrp_workorder', 'cancel_mrp_workorder', 'plan_mrp_workorder_detail', 'start_mrp_workorder_detail', 'pause_mrp_workorder_detail', 'continue_mrp_workorder_detail', 'block_mrp_workorder_detail', 'cancel_mrp_workorder_detail']) {
      expect(action(id), id).toHaveProperty('permission', 'manufacturing.write');
    }

    const plan = transitions.find((transition: any) => transition.id === 'plan');
    const start = transitions.find((transition: any) => transition.id === 'start');
    const pause = transitions.find((transition: any) => transition.id === 'pause');
    const continueWork = transitions.find((transition: any) => transition.id === 'continue');
    const block = transitions.find((transition: any) => transition.id === 'block');
    const cancel = transitions.find((transition: any) => transition.id === 'cancel');

    await expect(repository.executeMutation(plan.mutation, { id: 'wo-blocked-001' })).rejects.toMatchObject({ status: 400, code: 'MRP_WORKORDER_VERSION_REQUIRED' });
    const planned = await repository.executeMutation(plan.mutation, { id: 'wo-blocked-001', expected_row_version: 1 });
    expect(planned).toMatchObject({ id: 'wo-blocked-001', state: 'Ready', planned: true, row_version: 2 });
    await expect(repository.executeMutation(start.mutation, { id: 'wo-blocked-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MRP_WORKORDER_INVALID_STATE' });
    const started = await repository.executeMutation(start.mutation, { id: 'wo-blocked-001', expected_row_version: 2 });
    expect(started).toMatchObject({ state: 'Progress', paused: false, row_version: 3 });
    const paused = await repository.executeMutation(pause.mutation, { id: 'wo-blocked-001', expected_row_version: 3 });
    expect(paused).toMatchObject({ state: 'Progress', paused: true, row_version: 4 });
    const continued = await repository.executeMutation(continueWork.mutation, { id: 'wo-blocked-001', expected_row_version: 4 });
    expect(continued).toMatchObject({ state: 'Ready', paused: false, row_version: 5 });
    const blocked = await repository.executeMutation(block.mutation, { id: 'wo-blocked-001', expected_row_version: 5 });
    expect(blocked).toMatchObject({ state: 'Blocked', blocked_reason: 'Operator blocked', row_version: 6 });
    const replanned = await repository.executeMutation(plan.mutation, { id: 'wo-blocked-001', expected_row_version: 6 });
    expect(replanned).toMatchObject({ state: 'Ready', row_version: 7 });
    const cancelled = await repository.executeMutation(cancel.mutation, { id: 'wo-blocked-001', expected_row_version: 7 });
    expect(cancelled).toMatchObject({ state: 'Cancelled', row_version: 8 });
    await expect(repository.executeMutation(cancel.mutation, { id: 'wo-blocked-001', expected_row_version: 8 })).rejects.toMatchObject({ status: 409, code: 'MRP_WORKORDER_INVALID_STATE' });
    await expect(repository.executeMutation(plan.mutation, { id: 'wo-progress-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MRP_WORKORDER_INVALID_STATE' });
    database.close();
  });
});
