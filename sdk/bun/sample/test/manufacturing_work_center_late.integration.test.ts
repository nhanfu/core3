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

describe('Manufacturing Work Center Late Work Orders parity slice', () => {
  test('maps the source Late action with page/API separation and source modes', async () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_workcenter_views.xml', 'utf8');
    const searchSource = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_workorder_views.xml', 'utf8');
    const page = yaml('pages/work-center-late.yaml');
    const api = yaml('api/work-center-late.yaml');
    const overview = yaml('api/work-center-overview.yaml');
    const discoveredRoot = await mkdtemp(join(tmpdir(), 'core3-manufacturing-late-discovery-'));
    const isolatedModule = join(discoveredRoot, 'services/manufacturing');
    await mkdir(isolatedModule, { recursive: true });
    for (const entry of ['manifest.yaml', 'permissions.yaml', 'pages', 'api']) {
      await symlink(join(service, entry), join(isolatedModule, entry), entry.includes('.') ? 'file' : 'dir');
    }
    const discovered = discoverPages(discoveredRoot);

    expect(source).toContain('<a name="action_work_order" class="col-8" type="object" context="{\'search_default_late\': 1, \'desktop_list_view\': 1}">');
    expect(source).toContain('<field name="view_mode">list,form,pivot,graph,calendar</field>');
    expect(searchSource).toContain('<filter string="Late" name="late" domain="[(');
    expect(page.page).toMatchObject({ id: 'manufacturing-work-center-late', route: '/manufacturing/work-centers/late-orders' });
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ source: 'mrp_workcenter_late_workorders', view_navigation: 'tabs', default_filters: { search_default_late: true } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'calendar', 'pivot', 'graph']);
    expect(api.page).toEqual({ id: 'manufacturing-work-center-late' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['mrp_workcenter_late_workorder_states', 'mrp_workcenter_late_workorders']);
    expect(overview.actions).toContainEqual(expect.objectContaining({
      id: 'open_mrp_workcenter_late',
      navigate_to: '/manufacturing/work-centers/late-orders',
      params: { workcenter_id: '{row.id}', workcenter: '{row.name}', search_default_late: true },
    }));
    expect(discovered.pageDatasources.get('manufacturing-work-center-late')).toEqual(['mrp_workcenter_late_workorder_states', 'mrp_workcenter_late_workorders']);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/manufacturing/work-centers/late-orders', page: 'manufacturing-work-center-late', module: 'manufacturing' }));
    expect(api.actions.filter((action: any) => action.type === 'server')).toHaveLength(6);
    expect(api.actions.filter((action: any) => action.type === 'server').every((action: any) => action.permission === 'manufacturing.write' && action.workflow === 'mrp_workorders')).toBe(true);
    expect(api.actions.some((action: any) => ['create', 'update', 'delete'].includes(action.operation))).toBe(false);
    await rm(discoveredRoot, { recursive: true, force: true });
  });

  test('returns durable selected-center late rows and excludes non-late and terminal rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_late_test', ['schema', 'data']);
    const source = yaml('api/work-center-late.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_late_workorders');
    const params = { workcenter_id: 'workcenter-assembly-2', workcenter: 'Assembly 2', q: null, state: null, late: true, fixture_state: null };

    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-confirmed-001']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-drill-1', workcenter: 'Drill 1' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-blocked-001']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-assembly-1', workcenter: 'Assembly 1' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, late: false }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, q: 'Table top' }, 0, 50)).data).toMatchObject([{ operation_name: 'Table top assembly', late: true, state: 'Waiting' }]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKCENTER_LATE_UNAVAILABLE' });
    database.close();
  });

  test('replays the late index and retains selected rows across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-manufacturing-workcenter-late-'));
    const databasePath = join(directory, 'manufacturing.duckdb');
    const migrations = join(service, 'migrations');
    const source = yaml('api/work-center-late.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_late_workorders');
    const params = { workcenter_id: 'workcenter-assembly-2', workcenter: 'Assembly 2', q: null, state: null, late: true, fixture_state: null };
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'manufacturing_work_center_late_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'manufacturing_work_center_late_restart', ['schema', 'data']);
      expect((await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'idx_mrp_workorders_workcenter_late_state_plan'")).length).toBe(1);
      expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-confirmed-001']);
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'manufacturing_work_center_late_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-confirmed-001']);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('keeps late workflow actions permissioned and bounded', () => {
    const api = yaml('api/work-center-late.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_workcenter_late_workorders');
    expect(source).toMatchObject({ permission: 'manufacturing.read', workflow: 'mrp_workorders' });
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(api.actions.filter((action: any) => action.type === 'server').map((action: any) => action.action)).toEqual([
      'manufacturing.workorders.plan', 'manufacturing.workorders.start', 'manufacturing.workorders.pause',
      'manufacturing.workorders.continue', 'manufacturing.workorders.block', 'manufacturing.workorders.cancel',
    ]);
    expect(api.actions.some((action: any) => action.operation === 'create' || action.operation === 'delete')).toBe(false);
  });
});
