import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const manufacturing = join(root, 'services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(manufacturing, file), 'utf8')) as any;

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(manufacturing, 'migrations'), undefined, 'manufacturing_workorder_performance_test', ['schema', 'data']);
  await migrateDatabase(repository, join(manufacturing, 'migrations'), undefined, 'manufacturing_workorder_performance_test', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Work Orders Performance parity slice', () => {
  test('maps the Work Center action and keeps page/API ownership separate', () => {
    const page = yaml('pages/work-orders-performance.yaml');
    const detail = yaml('pages/work-orders-performance-detail.yaml');
    const workCenter = yaml('api/work-center-detail.yaml');
    const discovered = discoverPages(root);
    expect(workCenter.actions).toContainEqual(expect.objectContaining({ id: 'open_mrp_workorder_performance', navigate_to: '/manufacturing/work-orders-performance' }));
    expect(page.page).toMatchObject({ id: 'manufacturing-work-orders-performance', route: '/manufacturing/work-orders-performance' });
    expect(detail.page).toMatchObject({ id: 'manufacturing-work-orders-performance-detail', route: '/manufacturing/work-orders-performance/detail' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('manufacturing-work-orders-performance')).toEqual([
      'mrp_workorder_performance_states', 'mrp_workorder_performance_workcenters', 'mrp_workorder_performance_productions', 'mrp_workorder_performance_products', 'mrp_workorder_performance',
    ]);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing/work-orders-performance', page: 'manufacturing-work-orders-performance', module: 'manufacturing' }),
      expect.objectContaining({ path: '/manufacturing/work-orders-performance/detail', page: 'manufacturing-work-orders-performance-detail', module: 'manufacturing' }),
    ]));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list', 'form']);
    expect(page.components[0].view_navigation).toBe('tabs');
    expect(page.components[0].filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'production_name', label: 'Manufacturing Order' }),
      expect.objectContaining({ field: 'product_name', label: 'Product' }),
    ]));
    expect(page.components[0].group_by).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'state', label: 'Status' }),
      expect.objectContaining({ field: 'date_start', label: 'Date' }),
    ]));
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', editable: false, source: 'mrp_workorder_performance_detail' });
  });

  test('scopes finished fixtures by work center and covers empty/error/detail boundaries', async () => {
    const { database, repository } = await repositoryForTest();
    const api = yaml('api/work-orders-performance.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_workorder_performance');
    const params = { q: null, workcenter_id: null, workcenter: null, production_name: null, product_name: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['wora-finished-001', 'wora-finished-002']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-assembly-1' }, 0, 50)).data).toMatchObject([{ id: 'wora-finished-001', status_label: 'Finished', duration: 28 }]);
    expect((await repository.querySource(source, { ...params, production_name: 'WH/MO/00005' }, 0, 50)).data).toMatchObject([{ id: 'wora-finished-002', product_name: '[FURN_9666] Table' }]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'MRP_WORKORDER_PERFORMANCE_FORBIDDEN' });
    const detail = yaml('api/work-orders-performance-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'wora-finished-001', fixture_state: null }, 0, 1)).data).toMatchObject({ record_title: 'WH/MO/00004 - Drawer assembly', status_label: 'Finished' });
    await expect(repository.querySource(detail, { id: 'missing', fixture_state: 'missing_record' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'MRP_WORKORDER_PERFORMANCE_DETAIL_NOT_FOUND' });
    database.close();
  });
});
