import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Inventory Analysis parity', () => {
  test('keeps the page-only layout and page.id-bound API route contract', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'inventory-analysis', auth: { require: ['inventory.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('inventory-analysis')).toEqual(['inventory_analysis_totals', 'inventory_analysis_locations']);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/inventory-analysis', page: 'inventory-analysis', module: 'inventory' }));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/inventory-analysis', label: 'Inventory Analysis', icon: 'chart', permission: 'inventory.read' });
    expect(page.components.map((component: any) => component.type)).toEqual(['StatRow', 'Chart']);
  });

  test('serves deterministic totals and location data with empty, forbidden, and transport boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'inventory_analysis_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'inventory_analysis_test_migrations', ['schema', 'data']);
    const api = yaml('api/analysis.yaml');
    const totals = api.datasources[0];
    const locations = api.datasources[1];
    expect(await repository.querySource(totals, { fixture_state: null }, 0, 1)).toMatchObject({ data: { product_locations: expect.any(Number), units_on_hand: expect.any(Number), units_available: expect.any(Number), stock_value: expect.any(Number) } });
    expect((await repository.querySource(locations, { fixture_state: null }, 0, 50)).data.length).toBeGreaterThan(0);
    expect(await repository.querySource(totals, { fixture_state: 'empty' }, 0, 1)).toMatchObject({ data: {} });
    expect((await repository.querySource(locations, { fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(totals, { fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'INVENTORY_ANALYSIS_FORBIDDEN' });
    await expect(repository.querySource(locations, { fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_ANALYSIS_UNAVAILABLE' });
    expect(totals.permission).toBe('inventory.read');
    expect(locations.permission).toBe('inventory.read');
    database.close();
  });
});
