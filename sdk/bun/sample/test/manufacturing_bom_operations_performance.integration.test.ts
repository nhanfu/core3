import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const service = join(root, 'services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(service, file), 'utf8')) as any;

describe('Manufacturing BoM Operations Performance parity slice', () => {
  test('maps the Odoo record-scoped action, stat button, page/API split, and all source modes', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_workorder_views.xml', 'utf8');
    const bomSource = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_bom_views.xml', 'utf8');
    const page = yaml('pages/bom-operations-performance.yaml');
    const api = yaml('api/bom-operations-performance.yaml');
    const bomApi = yaml('api/bom-detail.yaml');
    const discovered = discoverPages(root);
    const list = page.components[0];

    expect(source).toContain('<record id="action_mrp_routing_time" model="ir.actions.act_window">');
    expect(source).toContain('<field name="view_mode">graph,pivot,list,form,calendar</field>');
    expect(source).toContain("[('operation_id.bom_id', '=', active_id), ('state', '=', 'done')]");
    expect(bomSource).toContain('Operations<br/>Performance');
    expect(page.page).toMatchObject({ id: 'manufacturing-bom-operations-performance', route: '/manufacturing/boms/detail/operations-performance' });
    expect(page.datasources).toBeUndefined();
    expect(list).toMatchObject({ source: 'mrp_bom_operations_performance', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list', 'form', 'calendar']);
    expect(api.page).toEqual({ id: 'manufacturing-bom-operations-performance' });
    expect(api.datasources.map((source: any) => source.id)).toEqual([
      'mrp_bom_operations_performance_operations',
      'mrp_bom_operations_performance_workcenters',
      'mrp_bom_operations_performance',
    ]);
    expect(bomApi.actions).toContainEqual(expect.objectContaining({
      id: 'bom_operations_performance',
      navigate_to: '/manufacturing/boms/detail/operations-performance',
      params: { bom_id: '{state.id}' },
    }));
    expect(discovered.pageDatasources.get('manufacturing-bom-operations-performance')).toEqual([
      'mrp_bom_operations_performance_operations',
      'mrp_bom_operations_performance_workcenters',
      'mrp_bom_operations_performance',
    ]);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({
      path: '/manufacturing/boms/detail/operations-performance',
      page: 'manufacturing-bom-operations-performance',
      module: 'manufacturing',
    }));
  });

  test('scopes completed work orders to the durable BoM and preserves filters and error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_bom_operations_performance', ['schema', 'data']);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_bom_operations_performance', ['schema', 'data']);
    const api = yaml('api/bom-operations-performance.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_bom_operations_performance');
    const params = { bom_id: 'bom-drawer-primary', operation_name: null, workcenter: null, q: null, fixture_state: null };

    expect((await repository.querySource(source, params, 0, 50)).data).toMatchObject([
      { id: 'wora-finished-001', operation_name: 'Drawer assembly', duration: 28, duration_unit: 3.5, status_label: 'Finished' },
    ]);
    expect((await repository.querySource(source, { ...params, bom_id: 'bom-table-odoo' }, 0, 50)).data).toMatchObject([
      { id: 'wora-finished-002', operation_name: 'Table assembly', duration: 88, duration_unit: 29.333333333333332 },
    ]);
    expect((await repository.querySource(source, { ...params, q: 'not found' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_BOM_OPERATIONS_PERFORMANCE_UNAVAILABLE' });
    expect(source).toMatchObject({ permission: 'manufacturing.read', error_states: { unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } } });
    expect(await repository.query("SELECT version FROM manufacturing_bom_operations_performance WHERE version = '0.0.22'")).toEqual([{ version: '0.0.22' }]);
    expect(await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'idx_mrp_workorder_analysis_bom_done'")).toHaveLength(1);
    database.close();
  });

  test('retains BoM-scoped completed work orders across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-manufacturing-bom-operations-performance-'));
    const databasePath = join(directory, 'manufacturing.duckdb');
    const migrations = join(service, 'migrations');
    const source = yaml('api/bom-operations-performance.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_bom_operations_performance');
    const params = { bom_id: 'bom-drawer-primary', operation_name: null, workcenter: null, q: null, fixture_state: null };
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'manufacturing_bom_operations_performance_restart', ['schema', 'data']);
      expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wora-finished-001']);
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'manufacturing_bom_operations_performance_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wora-finished-001']);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('keeps the record-scoped action read-only and permissioned', () => {
    const api = yaml('api/bom-operations-performance.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'view_mrp_bom_operations_performance');
    expect(action).toMatchObject({ type: 'navigate', permission: 'manufacturing.read', navigate_to: '/manufacturing/work-orders-performance/detail' });
    expect(api.actions).toHaveLength(1);
    expect(api.datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(readFileSync(join(service, 'migrations/20260922100000-022-bom-operations-performance-index.yaml'), 'utf8')).toContain('idx_mrp_workorder_analysis_bom_done');
  });
});
