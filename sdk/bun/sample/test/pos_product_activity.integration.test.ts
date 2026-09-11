import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS Products Activity view parity', () => {
  test('joins the existing Products page/API and exposes the observed view tabs', () => {
    const page = yaml('pages/pos-products.yaml');
    const api = yaml('api/pos-products.yaml');
    const list = page.components[0];
    expect(page.page).toMatchObject({ id: 'pos-products', route: '/point-of-sale/products' });
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('pos-products')).toEqual([
      'pos_product_catalog', 'pos_product_activity_products',
    ]);
    expect(list.views.map((view: any) => view.id)).toEqual(['card', 'list', 'activity']);
    expect(list.views[0]).toMatchObject({ id: 'card', label: 'Kanban' });
    expect(list.views[2]).toMatchObject({ id: 'activity', label: 'Activity', mobile: false, schedule_action: 'schedule_pos_product_activity' });
    expect(list.views[2].activity_types.map((type: any) => type.label)).toEqual(['To-Do', 'Email', 'Call', 'Meeting', 'Document']);
  });

  test('seeds service-owned activity slots and explicit empty/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_product_activity_read', ['schema', 'data']);
    const source = yaml('api/pos-products.yaml').datasources.find((candidate: any) => candidate.id === 'pos_product_catalog');
    const rows = (await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data;
    expect(rows).toHaveLength(3);
    expect(rows.filter((row: any) => Number(row.activity_count) > 0).map((row: any) => row.id)).toEqual(['pos-product-coffee', 'pos-product-sandwich']);
    expect((await repository.querySource(source, { q: 'coffee', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'House coffee', barcode: 'POS-COFFEE' }]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_PRODUCTS_UNAVAILABLE' });
    database.close();
  });

  test('guards scheduling behind POS write permission and persists a refreshed activity', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_product_activity_schedule', ['schema', 'data']);
    const api = yaml('api/pos-products.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'schedule_pos_product_activity');
    expect(action).toMatchObject({ type: 'server_form', permission: 'pos.write', handler: 'yaml_mutation', operation: 'update' });
    expect(action.mutation).toMatchObject({ operation: 'update', concurrency: false });
    expect(action.fields.find((field: any) => field.field === 'product_id')).toMatchObject({ options_source: 'pos_product_activity_products' });
    const scheduled = await repository.executeMutation(action.mutation, {
      values: { product_id: 'pos-product-coffee', activity_type: 'todo', activity_summary: 'Review POS listing', activity_date: '2026-01-15' },
    });
    expect(scheduled).toMatchObject({ product_id: 'pos-product-coffee', activity_type: 'todo', activity_summary: 'Review POS listing', activity_count: 1, row_version: 2 });
    const catalog = api.datasources.find((candidate: any) => candidate.id === 'pos_product_catalog');
    expect((await repository.querySource(catalog, { q: 'coffee', fixture_state: null }, 0, 50)).data).toMatchObject([{ id: 'pos-product-coffee', activity_type: 'todo', activity_summary: 'Review POS listing', row_version: 2 }]);
    await expect(repository.executeMutation(action.mutation, { values: { product_id: 'pos-product-coffee', activity_type: 'invalid', activity_summary: 'Review', activity_date: '2026-01-15' } })).rejects.toMatchObject({ status: 422, code: 'POS_ACTIVITY_TYPE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { product_id: 'missing-product', activity_type: 'todo', activity_summary: 'Review', activity_date: '2026-01-15' } })).rejects.toMatchObject({ status: 404, code: 'POS_PRODUCT_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { values: { product_id: 'pos-product-coffee', activity_type: 'todo', activity_summary: ' ', activity_date: '2026-01-15' } })).rejects.toMatchObject({ status: 422, code: 'POS_ACTIVITY_SUMMARY_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { expected_row_version: 1, values: { product_id: 'pos-product-coffee', activity_type: 'todo', activity_summary: 'Stale write', activity_date: '2026-01-15' } })).rejects.toMatchObject({ status: 409, code: 'POS_PRODUCT_ACTIVITY_STALE' });
    database.close();
  });
});
