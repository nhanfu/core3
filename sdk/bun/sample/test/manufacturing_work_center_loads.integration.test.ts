import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const service = join(root, 'services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(service, file), 'utf8')) as any;

describe('Manufacturing Work Center Loads parity slice', () => {
  test('maps the Odoo Load stat action and keeps page/API ownership separate', () => {
    const page = yaml('pages/work-center-loads.yaml');
    const api = yaml('api/work-center-loads.yaml');
    const detailApi = yaml('api/work-center-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(root);
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toContainEqual(expect.objectContaining({ path: '/manufacturing/work-center-loads', label: 'Work Center Loads' }));
    expect(detailApi.actions).toContainEqual(expect.objectContaining({ id: 'open_mrp_workcenter_loads', navigate_to: '/manufacturing/work-center-loads' }));
    expect(page.page).toMatchObject({ id: 'manufacturing-work-center-loads', route: '/manufacturing/work-center-loads' });
    expect(api.page.id).toBe('manufacturing-work-center-loads');
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('manufacturing-work-center-loads')).toEqual(['mrp_workcenter_loads']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/manufacturing/work-center-loads', page: 'manufacturing-work-center-loads', module: 'manufacturing' })]));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(page.components[0].view_navigation).toBe('tabs');
  });

  test('seeds idempotent scoped report fixtures and explicit states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_loads_test', ['schema', 'data']);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_work_center_loads_test', ['schema', 'data']);
    const source = yaml('api/work-center-loads.yaml').datasources[0];
    const params = { q: null, workcenter_id: null, workcenter: null, state: 'active', fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wcl-assembly-001', 'wcl-assembly-002', 'wcl-drill-001', 'wcl-assembly-004']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-assembly-1' }, 0, 50)).data.reduce((sum: number, row: any) => sum + Number(row.duration_expected), 0)).toBe(330);
    expect((await repository.querySource(source, { ...params, state: 'finished' }, 0, 50)).data).toMatchObject([{ id: 'wcl-assembly-003', duration: 28 }]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKCENTER_LOADS_UNAVAILABLE' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'MRP_WORKCENTER_LOADS_FORBIDDEN' });
    database.close();
  });
});
