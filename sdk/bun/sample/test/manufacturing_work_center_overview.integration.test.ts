import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const service = join(root, 'services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(service, file), 'utf8')) as any;

describe('Manufacturing Work Center Overview parity slice', () => {
  test('keeps the dashboard page presentation-only and maps the source action', () => {
    const page = yaml('pages/work-center-overview.yaml');
    const api = yaml('api/work-center-overview.yaml');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'manufacturing-work-center-overview', route: '/manufacturing/work-centers-overview' });
    expect(page.components[0]).toMatchObject({ source: 'mrp_workcenter_overview', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'form']);
    expect(page.components[0].views[0].group_by).toBe('');
    expect(api.page.id).toBe('manufacturing-work-center-overview');
    expect(page.page.route).toBe('/manufacturing/work-centers-overview');
    expect(api.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_workcenter_orders', navigate_to: '/workorders', permission: 'manufacturing.read' }),
      expect.objectContaining({ id: 'open_mrp_workcenter_oee', navigate_to: '/manufacturing/oee', permission: 'manufacturing.read' }),
    ]));
    expect(api.actions.some((action: any) => ['create', 'update', 'delete'].includes(action.operation))).toBe(false);
  });

  test('persists idempotent dashboard metrics and returns scoped work-center cards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_overview_test', ['schema', 'data']);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_overview_test', ['schema', 'data']);
    const source = yaml('api/work-center-overview.yaml').datasources[0];
    const params = { q: null, active: 'active', working_state: null, fixture_state: null };
    const result = await repository.querySource(source, params, 0, 50);

    expect(result.data.map((row: any) => row.id)).toEqual(['workcenter-assembly-1', 'workcenter-assembly-2', 'workcenter-drill-1']);
    expect(result.data.find((row: any) => row.id === 'workcenter-assembly-1')).toMatchObject({ oee: 72, planned_minutes: 330, workorder_count: 1, ready_workorder_count: 0, progress_workorder_count: 1 });
    expect(result.data.find((row: any) => row.id === 'workcenter-drill-1')).toMatchObject({ working_state: 'blocked', workorder_count: 1, late_workorder_count: 1 });
    expect((await repository.querySource(source, { ...params, working_state: 'blocked' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['workcenter-drill-1']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKCENTER_OVERVIEW_UNAVAILABLE' });
    database.close();
  });

  test('keeps overview navigation permissioned and durable metrics deterministic', () => {
    const api = yaml('api/work-center-overview.yaml');
    const source = api.datasources[0];
    expect(source.permission).toBe('manufacturing.read');
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(api.actions.every((action: any) => action.permission === 'manufacturing.read')).toBe(true);
    const migration = readFileSync(join(service, 'migrations/20260921090000-020-work-center-overview.yaml'), 'utf8');
    expect(migration).toContain('mrp_workcenter_overview_metrics');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
