import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const service = join(root, 'services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(service, file), 'utf8')) as any;

describe('Manufacturing Work Center Work Orders parity slice', () => {
  test('maps action_work_orders with a page/API split and source view modes', async () => {
    const page = yaml('pages/work-center-workorders.yaml');
    const api = yaml('api/work-center-workorders.yaml');
    const overviewApi = yaml('api/work-center-overview.yaml');
    const discoveredRoot = await mkdtemp(join(tmpdir(), 'core3-manufacturing-discovery-'));
    const isolatedModule = join(discoveredRoot, 'services/manufacturing');
    await mkdir(isolatedModule, { recursive: true });
    for (const entry of ['manifest.yaml', 'permissions.yaml', 'pages', 'api']) {
      await symlink(join(service, entry), join(isolatedModule, entry), entry.includes('.') ? 'file' : 'dir');
    }
    const discovered = discoverPages(discoveredRoot);

    expect(page.page).toMatchObject({ id: 'manufacturing-work-center-workorders', route: '/manufacturing/work-centers/work-orders' });
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ source: 'mrp_workcenter_workorders', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'calendar', 'pivot', 'graph']);
    expect(api.page).toEqual({ id: 'manufacturing-work-center-workorders' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['mrp_workcenter_workorder_states', 'mrp_workcenter_workorders']);
    expect(overviewApi.actions).toContainEqual(expect.objectContaining({ id: 'open_mrp_workcenter_orders', navigate_to: '/manufacturing/work-centers/work-orders', params: { workcenter_id: '{row.id}', workcenter: '{row.name}' } }));
    expect(discovered.pageDatasources.get('manufacturing-work-center-workorders')).toEqual(['mrp_workcenter_workorder_states', 'mrp_workcenter_workorders']);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/manufacturing/work-centers/work-orders', page: 'manufacturing-work-center-workorders', module: 'manufacturing' }));
    expect(page.components[0].actions.some((action: any) => action.id.includes('create') || action.id.includes('delete'))).toBe(false);
    await rm(discoveredRoot, { recursive: true, force: true });
  });

  test('scopes durable non-terminal work orders and replays the index migration idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_workorders_test', ['schema', 'data']);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_workorders_test', ['schema', 'data']);
    const source = yaml('api/work-center-workorders.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_workorders');
    const params = { workcenter_id: 'workcenter-assembly-1', workcenter: 'Assembly 1', q: null, state: null, late: null, fixture_state: null };

    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-progress-001']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-assembly-2', workcenter: 'Assembly 2' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-confirmed-001']);
    expect((await repository.querySource(source, { ...params, q: 'Cut panels' }, 0, 50)).data).toMatchObject([{ state: 'Progress', production_name: 'MO/2026/0003' }]);
    expect((await repository.querySource(source, { ...params, state: 'Finished' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKCENTER_WORKORDERS_UNAVAILABLE' });
    database.close();
  });

  test('retains the scoped rows across a file-backed database restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-manufacturing-workcenter-workorders-'));
    const databasePath = join(directory, 'manufacturing.duckdb');
    const migrations = join(service, 'migrations');
    const source = yaml('api/work-center-workorders.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_workorders');
    const params = { workcenter_id: 'workcenter-assembly-1', workcenter: 'Assembly 1', q: null, state: null, late: null, fixture_state: null };
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'manufacturing_work_center_workorders_restart', ['schema', 'data']);
      expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-progress-001']);
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'manufacturing_work_center_workorders_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-progress-001']);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('keeps workflow actions permissioned and guarded by the existing durable workflow', () => {
    const api = yaml('api/work-center-workorders.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_workorders');
    expect(source.permission).toBe('manufacturing.read');
    expect(source.workflow).toBe('mrp_workorders');
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(api.actions.filter((action: any) => action.type === 'server').map((action: any) => action.action)).toEqual([
      'manufacturing.workorders.plan', 'manufacturing.workorders.start', 'manufacturing.workorders.pause',
      'manufacturing.workorders.continue', 'manufacturing.workorders.block', 'manufacturing.workorders.cancel',
    ]);
    expect(api.actions.filter((action: any) => action.type === 'server').every((action: any) => action.permission === 'manufacturing.write' && action.workflow === 'mrp_workorders')).toBe(true);
    expect(readFileSync(join(service, 'migrations/20260921100000-021-work-center-workorders-index.yaml'), 'utf8')).toContain('idx_mrp_workorders_workcenter_state_plan');
  });
});
