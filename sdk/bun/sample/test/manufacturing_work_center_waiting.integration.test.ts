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

describe('Manufacturing Work Center Waiting Availability parity slice', () => {
  test('maps the source Waiting Availability action with a page/API split', async () => {
    const page = yaml('pages/work-center-waiting.yaml');
    const api = yaml('api/work-center-waiting.yaml');
    const overview = yaml('api/work-center-overview.yaml');
    const discoveredRoot = await mkdtemp(join(tmpdir(), 'core3-manufacturing-waiting-discovery-'));
    const isolatedModule = join(discoveredRoot, 'services/manufacturing');
    await mkdir(isolatedModule, { recursive: true });
    for (const entry of ['manifest.yaml', 'permissions.yaml', 'pages', 'api']) {
      await symlink(join(service, entry), join(isolatedModule, entry), entry.includes('.') ? 'file' : 'dir');
    }
    const discovered = discoverPages(discoveredRoot);

    expect(page.page).toMatchObject({ id: 'manufacturing-work-center-waiting', route: '/manufacturing/work-centers/waiting-availability' });
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ source: 'mrp_workcenter_waiting_workorders', view_navigation: 'tabs', default_filters: { search_default_waiting: true } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'calendar', 'pivot', 'graph']);
    expect(api.page).toEqual({ id: 'manufacturing-work-center-waiting' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['mrp_workcenter_waiting_states', 'mrp_workcenter_waiting_workorders']);
    expect(overview.actions).toContainEqual(expect.objectContaining({ id: 'open_mrp_workcenter_waiting', navigate_to: '/manufacturing/work-centers/waiting-availability', params: { workcenter_id: '{row.id}', workcenter: '{row.name}', search_default_waiting: true } }));
    expect(discovered.pageDatasources.get('manufacturing-work-center-waiting')).toEqual(['mrp_workcenter_waiting_states', 'mrp_workcenter_waiting_workorders']);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/manufacturing/work-centers/waiting-availability', page: 'manufacturing-work-center-waiting', module: 'manufacturing' }));
    expect(api.actions.filter((action: any) => action.type === 'server')).toEqual([expect.objectContaining({ id: 'plan_mrp_waiting_workorder', permission: 'manufacturing.write', workflow: 'mrp_workorders', operation: 'plan' })]);
    await rm(discoveredRoot, { recursive: true, force: true });
  });

  test('returns only durable Waiting rows scoped to the selected work center', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_waiting_test', ['schema', 'data']);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_waiting_test', ['schema', 'data']);
    const source = yaml('api/work-center-waiting.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_waiting_workorders');
    const params = { workcenter_id: 'workcenter-assembly-2', workcenter: 'Assembly 2', q: null, state: null, late: null, fixture_state: null };

    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-confirmed-001']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-assembly-1', workcenter: 'Assembly 1' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, state: 'Ready' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, q: 'Table top' }, 0, 50)).data).toMatchObject([{ state: 'Waiting', operation_name: 'Table top assembly', late: true }]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKCENTER_WAITING_UNAVAILABLE' });
    database.close();
  });

  test('retains Waiting rows across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-manufacturing-waiting-'));
    const databasePath = join(directory, 'manufacturing.duckdb');
    const migrations = join(service, 'migrations');
    const source = yaml('api/work-center-waiting.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_waiting_workorders');
    const params = { workcenter_id: 'workcenter-assembly-2', workcenter: 'Assembly 2', q: null, state: null, late: null, fixture_state: null };
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'manufacturing_work_center_waiting_restart', ['schema', 'data']);
      expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-confirmed-001']);
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'manufacturing_work_center_waiting_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-confirmed-001']);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('keeps the Waiting workflow action permissioned and reusable', () => {
    const api = yaml('api/work-center-waiting.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_waiting_workorders');
    expect(source.permission).toBe('manufacturing.read');
    expect(source.workflow).toBe('mrp_workorders');
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'plan_mrp_waiting_workorder', type: 'server', permission: 'manufacturing.write', workflow: 'mrp_workorders', operation: 'plan' }));
    expect(api.actions.some((action: any) => ['create', 'update', 'delete'].includes(action.operation))).toBe(false);
  });
});
