import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Manufacturing MO Overview parity slice', () => {
  test('keeps the client action page separate and links the MO Overview stat action', () => {
    const page = yaml('pages/manufacturing-order-overview.yaml');
    const api = yaml('api/manufacturing-order-overview.yaml');
    const detailApi = yaml('api/manufacturing-order-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'manufacturing-order-overview', route: '/manufacturing-orders/detail/overview', auth: { require: ['manufacturing.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'manufacturing-order-overview' });
    expect(discovered.pageDatasources.get('manufacturing-order-overview')).toEqual([
      'mrp_production_overview', 'mrp_production_overview_components',
      'mrp_production_overview_operations', 'mrp_production_overview_costs',
    ]);
    expect(detailApi.actions.find((action: any) => action.id === 'open_mrp_production_overview')).toMatchObject({
      navigate_to: '/manufacturing-orders/detail/overview', params: { id: '{state.id}' }, permission: 'manufacturing.read',
    });
  });

  test('serves deterministic overview breakdown and explicit edge-state contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'manufacturing_mo_overview_test', ['schema', 'data']);
    const api = yaml('api/manufacturing-order-overview.yaml');
    const overview = api.datasources[0];
    const components = api.datasources[1];
    const operations = api.datasources[2];
    expect(await repository.querySource(overview, { id: 'mo-progress-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'MO/2026/0003', product_name: '[FURN_7023] Wood Panel', state: 'In Progress' } });
    expect((await repository.querySource(components, { id: 'mo-progress-001', fixture_state: null }, 0, 50)).data.length).toBeGreaterThan(0);
    expect((await repository.querySource(operations, { id: 'mo-progress-001', fixture_state: null }, 0, 50)).data.length).toBeGreaterThan(0);
    expect((await repository.querySource(components, { id: 'mo-progress-001', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(overview, { id: 'mo-progress-001', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(overview, { id: 'mo-progress-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_MO_OVERVIEW_UNAVAILABLE' });
    expect(overview.error_states.unauthorized.status).toBe(401);
    expect(overview.error_states.forbidden.status).toBe(403);
    expect(overview.permission).toBe('manufacturing.read');
  });
});
