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

describe('Manufacturing Work Center Operations parity slice', () => {
  test('maps the Odoo Operations stat action and preserves page/API ownership', () => {
    const page = yaml('pages/operations.yaml');
    const api = yaml('api/operations.yaml');
    const detailPage = yaml('pages/work-center-detail.yaml');
    const detailApi = yaml('api/work-center-detail.yaml');
    const discovered = discoverPages(root);

    expect(page.page).toMatchObject({ id: 'manufacturing-operations', route: '/operations' });
    expect(api.page.id).toBe('manufacturing-operations');
    expect(page.datasources).toBeUndefined();
    expect(detailPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'open_mrp_workcenter_operations', label: 'Operations' }));
    expect(detailApi.actions).toContainEqual(expect.objectContaining({ id: 'open_mrp_workcenter_operations', navigate_to: '/operations', params: { workcenter_id: '{row.id}', workcenter: '{row.name}' } }));
    expect(discovered.pageDatasources.get('manufacturing-operations')).toEqual(['mrp_operations']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/operations', page: 'manufacturing-operations', module: 'manufacturing' })]));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(page.components[0].view_navigation).toBe('tabs');
    expect(api.datasources[0]).toMatchObject({ permission: 'manufacturing.read' });
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
  });

  test('filters deterministic operations by work center and supports empty/transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(service, 'migrations'), undefined, 'manufacturing_workcenter_operations_test', ['schema', 'data']);
    const source = yaml('api/operations.yaml').datasources[0];
    const params = { q: null, active: null, time_mode: null, workcenter_id: null, fixture_state: null };

    const all = await repository.querySource(source, params, 0, 50);
    expect(all.data).toHaveLength(5);
    const scoped = await repository.querySource(source, { ...params, workcenter_id: 'workcenter-assembly-1' }, 0, 50);
    expect(scoped.data.map((row: any) => row.id)).toEqual(['operation-manual-assembly', 'operation-testing', 'operation-long-time-assembly', 'operation-assembly']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-drill-1' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['operation-packing']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'missing-workcenter' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_OPERATIONS_UNAVAILABLE' });
    database.close();
  });
});
