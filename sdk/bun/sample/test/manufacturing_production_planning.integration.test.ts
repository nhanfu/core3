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

describe('Manufacturing Work Orders Planning parity slice', () => {
  test('maps action_mrp_workorder_production with a page/API split and source modes', async () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_workorder_views.xml', 'utf8');
    const page = yaml('pages/production-planning.yaml');
    const api = yaml('api/production-planning.yaml');
    const discoveredRoot = await mkdtemp(join(tmpdir(), 'core3-manufacturing-production-planning-discovery-'));
    const isolatedModule = join(discoveredRoot, 'services/manufacturing');
    await mkdir(isolatedModule, { recursive: true });
    for (const entry of ['manifest.yaml', 'permissions.yaml', 'pages', 'api']) {
      await symlink(join(service, entry), join(isolatedModule, entry), entry.includes('.') ? 'file' : 'dir');
    }
    const discovered = discoverPages(discoveredRoot);

    expect(source).toContain('id="action_mrp_workorder_production"');
    expect(source).toContain('<field name="path">production-planning</field>');
    expect(source).toContain("[('production_state','not in',('done','cancel'))]");
    expect(source).toContain('<field name="view_mode">list,form,calendar,pivot,graph</field>');
    expect(page.page).toMatchObject({ id: 'manufacturing-production-planning', route: '/manufacturing/production-planning' });
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ source: 'mrp_production_planning_workorders', default_group_by: 'production_name', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'calendar', 'pivot', 'graph']);
    expect(api.page).toEqual({ id: 'manufacturing-production-planning' });
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(['mrp_production_planning_states', 'mrp_production_planning_workcenters', 'mrp_production_planning_workorders']);
    expect(discovered.pageDatasources.get('manufacturing-production-planning')).toEqual(['mrp_production_planning_states', 'mrp_production_planning_workcenters', 'mrp_production_planning_workorders']);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/manufacturing/production-planning', page: 'manufacturing-production-planning', module: 'manufacturing' }));
    expect(page.components[0].actions.some((action: any) => action.id.includes('create') || action.id.includes('delete'))).toBe(false);
    await rm(discoveredRoot, { recursive: true, force: true });
  });

  test('scopes durable work orders to active productions and honors source filters and error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_production_planning_test', ['schema', 'data']);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_production_planning_test', ['schema', 'data']);
    const api = yaml('api/production-planning.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_production_planning_workorders');
    const params = { q: null, state: null, workcenter_id: null, workcenter: null, fixture_state: null, search_default_ready: null, search_default_progress: null, search_default_blocked: null };

    expect((await repository.querySource(source, { ...params, search_default_ready: true, search_default_progress: true, search_default_blocked: true }, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-blocked-001', 'wo-progress-001', 'wo-progress-002']);
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-confirmed-001', 'wo-blocked-001', 'wo-progress-001', 'wo-progress-002', 'wo-to-close-001']);
    expect((await repository.querySource(source, { ...params, workcenter: 'Assembly 1' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-progress-001', 'wo-to-close-001']);
    expect((await repository.querySource(source, { ...params, q: 'Table top' }, 0, 50)).data).toMatchObject([{ production_name: 'MO/2026/0002', production_state: 'Confirmed' }]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCTION_PLANNING_UNAVAILABLE' });
    database.close();
  });

  test('retains production-scoped rows across a file-backed restart and migration replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-manufacturing-production-planning-'));
    const databasePath = join(directory, 'manufacturing.duckdb');
    const source = yaml('api/production-planning.yaml').datasources.find((candidate: any) => candidate.id === 'mrp_production_planning_workorders');
    const params = { q: null, state: null, workcenter_id: null, workcenter: null, fixture_state: null, search_default_ready: true, search_default_progress: true, search_default_blocked: true };
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_production_planning_restart', ['schema', 'data']);
      expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.production_id)).toEqual(['mo-progress-001', 'mo-progress-001', 'mo-progress-001']);
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, join(service, 'migrations'), undefined, 'manufacturing_production_planning_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, params, 0, 50)).data.map((row: any) => row.production_id)).toEqual(['mo-progress-001', 'mo-progress-001', 'mo-progress-001']);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('reuses the guarded work-order workflow and declares permission boundaries', () => {
    const api = yaml('api/production-planning.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_production_planning_workorders');
    expect(source.permission).toBe('manufacturing.read');
    expect(source.workflow).toBe('mrp_workorders');
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(api.actions.filter((action: any) => action.type === 'server').map((action: any) => action.action)).toEqual([
      'manufacturing.workorders.plan', 'manufacturing.workorders.start', 'manufacturing.workorders.pause',
      'manufacturing.workorders.continue', 'manufacturing.workorders.block', 'manufacturing.workorders.cancel',
    ]);
    expect(api.actions.filter((action: any) => action.type === 'server').every((action: any) => action.permission === 'manufacturing.write' && action.workflow === 'mrp_workorders')).toBe(true);
    expect(readFileSync(join(service, 'migrations/20260922130000-024-production-planning-index.yaml'), 'utf8')).toContain('idx_mrp_workorders_production_schedule');
  });
});
