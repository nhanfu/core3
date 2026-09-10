import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((item: any) => item.id === id);

describe('Manufacturing Work Centers parity slice', () => {
  test('keeps list and detail presentation-only and joins API by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = yaml('pages/work-centers.yaml');
    const detail = yaml('pages/work-center-detail.yaml');

    expect(list.datasources).toBeUndefined();
    expect(list.actions).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(detail.actions).toBeUndefined();
    expect(discovered.pages.get('manufacturing-work-centers')?.config.page.id).toBe('manufacturing-work-centers');
    expect(discovered.pages.get('work-center-detail')?.config.page.id).toBe('work-center-detail');
    expect(discovered.pageDatasources.get('manufacturing-work-centers')).toContain('mrp_workcenters');
    expect(discovered.pageDatasources.get('work-center-detail')).toContain('mrp_workcenter_detail');
    expect(yaml('api/work-centers.yaml').page.id).toBe('manufacturing-work-centers');
    expect(yaml('api/work-centers.yaml').actions.map((action: any) => action.id)).toEqual([
      'create_mrp_workcenter', 'edit_mrp_workcenter', 'archive_mrp_workcenter', 'unarchive_mrp_workcenter', 'delete_mrp_workcenter',
    ]);
    expect(yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items.map((item: any) => item.label))).toContain('Work Centers');
  });

  test('matches the Odoo work center action modes and responsive cards', () => {
    const list = yaml('pages/work-centers.yaml').components[0];
    expect(list.source).toBe('mrp_workcenters');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'card', 'form']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Cards', mobile: true });
    expect(list.form_view).toEqual({ page: 'apps/services/manufacturing/pages/work-center-detail.yaml', side_panel: true });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Work Center', 'Code', 'Status', 'Time Efficiency', 'OEE Target', 'Company', ' ']);
    expect(source('work-centers.yaml', 'mrp_workcenters').error_states.transport_error).toMatchObject({ status: 503, code: 'MRP_WORKCENTERS_UNAVAILABLE' });
  });

  test('seeds deterministic active, archived, search, empty, and not-found fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_work_centers_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_work_centers_test_migrations', ['schema', 'data']);

    const centers = source('work-centers.yaml', 'mrp_workcenters');
    const active = await repository.querySource(centers, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(active.data.map((row: any) => row.id)).toEqual(['workcenter-assembly-1', 'workcenter-assembly-2', 'workcenter-drill-1']);
    expect(active.data.map((row: any) => row.working_state)).toEqual(['normal', 'normal', 'blocked']);
    expect((await repository.querySource(centers, { q: 'Drill', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Drill 1']);
    expect((await repository.querySource(centers, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['workcenter-packaging-1']);
    expect((await repository.querySource(centers, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = source('work-center-detail.yaml', 'mrp_workcenter_detail');
    expect(await repository.querySource(detail, { id: 'workcenter-drill-1', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'Drill 1', working_state: 'blocked', oee_target: 90 }) });
    expect((await repository.querySource(detail, { id: 'missing-workcenter', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
  });

  test('keeps CRUD, permission, validation, conflict, and transport boundaries explicit', () => {
    const listApi = yaml('api/work-centers.yaml');
    const detailApi = yaml('api/work-center-detail.yaml');
    const allActions = [...listApi.actions, ...detailApi.actions];
    expect(allActions.every((action: any) => action.permission === 'manufacturing.manage')).toBe(true);
    expect(listApi.actions.find((action: any) => action.id === 'create_mrp_workcenter').mutation.guards.map((guard: any) => guard.status)).toEqual([409, 422]);
    expect(listApi.actions.find((action: any) => action.id === 'edit_mrp_workcenter').mutation.concurrency).toEqual({ required: true });
    expect(listApi.actions.find((action: any) => action.id === 'delete_mrp_workcenter').mutation).toMatchObject({ operation: 'delete', concurrency: { required: true } });
    expect(detailApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'MRP_WORKCENTER_DETAIL_UNAVAILABLE' });
    const migration = readFileSync(join(serviceRoot, 'migrations/20260910170000-003-work-centers.yaml'), 'utf8');
    expect(migration).toContain("'2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
