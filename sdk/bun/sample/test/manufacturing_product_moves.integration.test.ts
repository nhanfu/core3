import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Manufacturing Product Moves parity slice', () => {
  test('keeps the record-scoped Inventory Moves action separate from the MO page', () => {
    const page = yaml('pages/product-moves.yaml');
    const api = yaml('api/product-moves.yaml');
    const detail = yaml('pages/product-move-detail.yaml');
    const detailApi = yaml('api/product-move-detail.yaml');
    const moApi = yaml('api/manufacturing-order-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'manufacturing-product-moves', route: '/manufacturing-orders/detail/product-moves' });
    expect(detail.page).toMatchObject({ id: 'manufacturing-product-move-detail', route: '/manufacturing-orders/detail/product-moves/detail' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'manufacturing-product-moves' });
    expect(detailApi.page).toEqual({ id: 'manufacturing-product-move-detail' });
    expect(discovered.pageDatasources.get('manufacturing-product-moves')).toEqual(['mrp_product_moves']);
    expect(discovered.pageDatasources.get('manufacturing-product-move-detail')).toEqual(['mrp_product_move_detail']);
    expect(moApi.actions.find((action: any) => action.id === 'open_mrp_production_moves')).toMatchObject({
      navigate_to: '/manufacturing-orders/detail/product-moves', params: { id: '{state.id}' }, permission: 'manufacturing.read',
    });
    expect(api.datasources[0].permission).toBe('manufacturing.read');
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 }, transport_error: { status: 503 } });
    expect(page.views).toBeUndefined();
  });

  test('serves deterministic raw and finished moves plus read-only edge states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'manufacturing_product_moves_test', ['schema', 'data']);
    const api = yaml('api/product-moves.yaml');
    const list = api.datasources[0];
    const detail = yaml('api/product-move-detail.yaml').datasources[0];

    const rows = await repository.querySource(list, { id: 'mo-progress-001', fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(2);
    expect(rows.data[0]).toMatchObject({ reference: 'MO/2026/0003', product_name: 'Wood Panel', location: 'WH/Stock', location_dest: 'Production', state: 'Reserved' });
    expect(rows.data[1]).toMatchObject({ move_type: 'Finished product', location: 'Production', location_dest: 'WH/Stock' });
    expect((await repository.querySource(list, { id: 'mo-progress-001', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { id: 'mo-missing-001', fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detail, { id: 'move-done-raw', fixture_state: null }, 0, 1)).toMatchObject({ data: { production_name: 'MO/2026/0005', lot_name: 'LOT-TABLE-001' } });
    await expect(repository.querySource(list, { id: 'mo-progress-001', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCT_MOVES_UNAVAILABLE' });
    await expect(repository.querySource(detail, { id: 'move-progress-raw', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCT_MOVE_UNAVAILABLE' });
    expect(detail.error_states.unauthorized.status).toBe(401);
    expect(detail.error_states.forbidden.status).toBe(403);
    expect(detail.permission).toBe('manufacturing.read');
  });
});
