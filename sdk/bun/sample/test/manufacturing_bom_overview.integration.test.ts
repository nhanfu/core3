import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Manufacturing BoM Overview parity slice', () => {
  test('keeps the client-action page separate from its page-id API and uses the BoM stat action route', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const bomApi = yaml('api/bom-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'manufacturing-bom-overview', route: '/boms/detail/overview', auth: { require: ['manufacturing.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'mrp_bom_overview', editable: false });
    expect(api.page).toEqual({ id: 'manufacturing-bom-overview' });
    expect(discovered.pageDatasources.get('manufacturing-bom-overview')).toEqual(['mrp_bom_overview', 'mrp_bom_overview_lines', 'mrp_bom_overview_operations']);
    expect(bomApi.actions.find((a: any) => a.id === 'bom_overview')).toMatchObject({ navigate_to: '/manufacturing/boms/detail/overview', params: { id: '{state.id}' }, permission: 'manufacturing.read' });
  });

  test('serves deterministic overview, components, empty, missing, transport, and permission contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'manufacturing_bom_overview_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'manufacturing_bom_overview_test', ['schema', 'data']);
    const api = yaml('api/analysis.yaml');
    const overview = api.datasources[0];
    const lines = api.datasources[1];
    expect(await repository.querySource(overview, { id: 'bom-desk-combination', fixture_state: null }, 0, 1)).toMatchObject({ data: { product_name: '[FURN_7800] Desk Combination', component_count: 2, total_cost: 205 } });
    expect((await repository.querySource(lines, { id: 'bom-desk-combination', fixture_state: null }, 0, 50)).data.map((row: any) => row.availability_status)).toEqual(['Available', 'Available']);
    expect((await repository.querySource(lines, { id: 'bom-desk-combination', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(overview, { id: 'bom-desk-combination', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(overview, { id: 'bom-desk-combination', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_BOM_OVERVIEW_UNAVAILABLE' });
    expect(overview.permission).toBe('manufacturing.read');
    expect(overview.error_states.forbidden.status).toBe(403);
    expect(overview.error_states.unauthorized.status).toBe(401);
  });
});
