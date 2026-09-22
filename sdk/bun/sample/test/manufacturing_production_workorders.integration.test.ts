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

describe('Manufacturing Order Work Orders parity slice', () => {
  test('maps action_mrp_workorder_production_specific with a page/API split and source modes', async () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_workorder_views.xml', 'utf8');
    const page = yaml('pages/production-workorders.yaml');
    const api = yaml('api/production-workorders.yaml');
    const detailApi = yaml('api/manufacturing-order-detail.yaml');
    const discoveredRoot = await mkdtemp(join(tmpdir(), 'core3-manufacturing-production-workorders-discovery-'));
    const isolatedModule = join(discoveredRoot, 'services/manufacturing');
    await mkdir(isolatedModule, { recursive: true });
    for (const entry of ['manifest.yaml', 'permissions.yaml', 'pages', 'api']) {
      await symlink(join(service, entry), join(isolatedModule, entry), entry.includes('.') ? 'file' : 'dir');
    }
    const discovered = discoverPages(discoveredRoot);

    expect(source).toContain('id="action_mrp_workorder_production_specific"');
    expect(source).toContain("[('production_id', '=', active_id)]");
    expect(source).toContain('<field name="view_mode">list,form,calendar,pivot,graph</field>');
    expect(page.page).toMatchObject({ id: 'manufacturing-production-workorders', route: '/manufacturing-orders/detail/work-orders' });
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ source: 'mrp_production_workorders_action', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'calendar', 'pivot', 'graph']);
    expect(api.page).toEqual({ id: 'manufacturing-production-workorders' });
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(['mrp_production_workorder_states', 'mrp_production_workorders_action']);
    expect(detailApi.actions).toContainEqual(expect.objectContaining({
      id: 'open_mrp_production_workorders',
      navigate_to: '/manufacturing-orders/detail/work-orders',
      params: { id: '{state.id}' },
      permission: 'manufacturing.read',
    }));
    expect(discovered.pageDatasources.get('manufacturing-production-workorders')).toEqual([
      'mrp_production_workorder_states', 'mrp_production_workorders_action',
    ]);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({
      path: '/manufacturing-orders/detail/work-orders', page: 'manufacturing-production-workorders', module: 'manufacturing',
    }));
    expect(page.components[0].actions.some((action: any) => action.id.includes('create') || action.id.includes('delete'))).toBe(false);
    await rm(discoveredRoot, { recursive: true, force: true });
  });

  test('scopes durable work orders to one manufacturing order and handles filters and edge states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_production_workorders_test', ['schema', 'data']);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_production_workorders_test', ['schema', 'data']);
    const api = yaml('api/production-workorders.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_production_workorders_action');
    const params = { id: 'mo-progress-001', q: null, state: null, late: null, fixture_state: null };

    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'wo-progress-001', 'wo-progress-002', 'wo-blocked-001',
    ]);
    expect((await repository.querySource(source, { ...params, state: 'Blocked' }, 0, 50)).data).toMatchObject([
      { id: 'wo-blocked-001', production_id: 'mo-progress-001', production_name: 'MO/2026/0003' },
    ]);
    expect((await repository.querySource(source, { ...params, q: 'Quality check' }, 0, 50)).data).toMatchObject([
      { id: 'wo-progress-002', state: 'Ready' },
    ]);
    expect((await repository.querySource(source, { ...params, id: 'mo-done-001' }, 0, 50)).data).toMatchObject([
      { id: 'wo-done-001', state: 'Finished' },
    ]);
    expect((await repository.querySource(source, { ...params, id: 'missing-mo', fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({
      status: 503, code: 'MRP_PRODUCTION_WORKORDERS_UNAVAILABLE',
    });
    database.close();
  });

  test('retains production-scoped rows across a file-backed restart and migration replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-manufacturing-production-workorders-'));
    const databasePath = join(directory, 'manufacturing.duckdb');
    const migrations = join(service, 'migrations');
    const source = yaml('api/production-workorders.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_production_workorders_action');
    const params = { id: 'mo-progress-001', q: null, state: null, late: null, fixture_state: null };
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'manufacturing_production_workorders_restart', ['schema', 'data']);
      expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.production_id)).toEqual([
        'mo-progress-001', 'mo-progress-001', 'mo-progress-001',
      ]);
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'manufacturing_production_workorders_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual([
        'wo-progress-001', 'wo-progress-002', 'wo-blocked-001',
      ]);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('reuses guarded work-order workflow and declares permission boundaries', () => {
    const page = yaml('pages/production-workorders.yaml');
    const api = yaml('api/production-workorders.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_production_workorders_action');
    expect(source.permission).toBe('manufacturing.read');
    expect(source.workflow).toBe('mrp_workorders');
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 }, transport_error: { status: 503 } });
    expect(api.actions.filter((action: any) => action.type === 'server').map((action: any) => action.action)).toEqual([
      'manufacturing.workorders.plan', 'manufacturing.workorders.start', 'manufacturing.workorders.pause',
      'manufacturing.workorders.continue', 'manufacturing.workorders.block', 'manufacturing.workorders.cancel',
    ]);
    expect(api.actions.filter((action: any) => action.type === 'server').every((action: any) => action.permission === 'manufacturing.write' && action.workflow === 'mrp_workorders')).toBe(true);
    expect(readFileSync(join(service, 'migrations/20260922160000-025-production-specific-workorders-index.yaml'), 'utf8')).toContain('idx_mrp_workorders_production_sequence');
    expect(page.components[0].actions.filter((action: any) => action.id.includes('create') || action.id.includes('delete'))).toEqual([]);
  });
});
