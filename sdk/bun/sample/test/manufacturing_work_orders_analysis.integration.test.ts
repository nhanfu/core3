import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const manufacturing = join(root, 'services/manufacturing');
const read = (file: string) => readFileSync(join(manufacturing, file), 'utf8');
const yaml = (file: string) => Bun.YAML.parse(read(file)) as any;

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(manufacturing, 'migrations'), undefined, 'manufacturing_workorder_analysis_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, join(manufacturing, 'migrations'), undefined, 'manufacturing_workorder_analysis_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Work Orders Analysis Odoo action parity', () => {
  test('maps the Reporting action and keeps page/API ownership joined by page id', () => {
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const page = yaml('pages/work-orders-analysis.yaml');
    const detail = yaml('pages/work-orders-analysis-detail.yaml');
    const api = yaml('api/work-orders-analysis.yaml');
    const detailApi = yaml('api/work-orders-analysis-detail.yaml');
    const list = page.components[0];

    expect(reporting.items).toContainEqual(expect.objectContaining({
      path: '/manufacturing/work-orders-analysis',
      label: 'Work Orders',
      permission: 'manufacturing.read',
    }));
    expect(page.page).toMatchObject({ id: 'manufacturing-work-orders-analysis', route: '/manufacturing/work-orders-analysis' });
    expect(detail.page).toMatchObject({ id: 'manufacturing-work-orders-analysis-detail', route: '/manufacturing/work-orders-analysis/detail' });
    expect(api.page.id).toBe('manufacturing-work-orders-analysis');
    expect(detailApi.page.id).toBe('manufacturing-work-orders-analysis-detail');
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    const discovered = discoverPages(root);
    expect(discovered.pageDatasources.get('manufacturing-work-orders-analysis')).toEqual([
      'mrp_workorder_analysis_states',
      'mrp_workorder_analysis_workcenters',
      'mrp_workorder_analysis_productions',
      'mrp_workorder_analysis',
    ]);
    expect(discovered.pageDatasources.get('manufacturing-work-orders-analysis-detail')).toEqual(['mrp_workorder_analysis_detail']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing/work-orders-analysis', page: 'manufacturing-work-orders-analysis', module: 'manufacturing' }),
      expect.objectContaining({ path: '/manufacturing/work-orders-analysis/detail', page: 'manufacturing-work-orders-analysis-detail', module: 'manufacturing' }),
    ]));
    expect(list).toMatchObject({
      type: 'ListView',
      variant: 'odoo',
      source: 'mrp_workorder_analysis',
      default_filters: { report_scope: 'active' },
      default_group_by: 'workcenter',
      view_navigation: 'icons',
      row_open_action: 'view_mrp_workorder_analysis',
    });
    expect(api.datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(detailApi.datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
  });

  test('matches the source graph, pivot, list, and read-only form contract', () => {
    const page = yaml('pages/work-orders-analysis.yaml');
    const list = page.components[0];
    const detail = yaml('pages/work-orders-analysis-detail.yaml');
    const form = detail.components[0];
    const graph = list.views.find((view: any) => view.id === 'graph');
    const pivot = list.views.find((view: any) => view.id === 'pivot');

    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list', 'form']);
    expect(graph).toMatchObject({ category_field: 'workcenter', measure_field: 'expected_duration', measure_label: 'Expected Duration (minutes)', type: 'bar' });
    expect(pivot.pivot.default.rows).toEqual(['workcenter']);
    expect(pivot.pivot.default.measures).toEqual([
      { field: 'duration', aggregate: 'sum', column: 'Duration (minutes)' },
      { field: 'duration_per_unit', aggregate: 'sum', column: 'Duration Per Unit' },
      { field: 'expected_duration', aggregate: 'sum', column: 'Expected Duration (minutes)' },
    ]);
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Operation', 'Work Center', 'Product', 'Quantity', 'Expected Duration', 'Real Duration', 'Status',
    ]);
    expect(list.columns.filter((column: any) => column.mobile).map((column: any) => column.label)).toEqual([
      'Operation', 'Work Center', 'Product', 'Quantity',
    ]);
    expect(list.empty_state).toMatchObject({ title: 'No Work Orders Analysis data' });
    expect(list.actions).toBeUndefined();
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'mrp_workorder_analysis_detail', editable: false, title_field: 'record_title' });
    expect(detail.components[0].header_actions).toEqual([expect.objectContaining({ id: 'back_to_mrp_workorder_analysis' })]);
    expect(detailApiActions(detail)).toHaveLength(0);
  });

  test('seeds deterministic report states and exercises default/filter/empty/error boundaries', async () => {
    const { database, repository } = await repositoryForTest();
    const api = yaml('api/work-orders-analysis.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_workorder_analysis');
    const params = { q: null, state: null, workcenter: null, production_name: null, from_date: null, to_date: null, report_scope: 'active', fixture_state: null };

    const active = await repository.querySource(source, params, 0, 50);
    expect(active.data).toHaveLength(3);
    expect(active.data.map((row: any) => row.state).sort()).toEqual(['Blocked', 'Progress', 'Ready']);
    expect(active.data.map((row: any) => row.workcenter)).toEqual(['Assembly 1', 'Assembly 1', 'Drill 1']);
    expect(active.data.reduce((sum: number, row: any) => sum + Number(row.expected_duration), 0)).toBe(250);
    expect((await repository.querySource(source, { ...params, report_scope: 'all' }, 0, 50)).data).toHaveLength(7);
    expect((await repository.querySource(source, { ...params, workcenter: 'Drill 1' }, 0, 50)).data).toMatchObject([{ id: 'wora-blocked-001', status_label: 'Blocked', blocked_reason: 'Material shortage' }]);
    expect((await repository.querySource(source, { ...params, q: 'Table' }, 0, 50)).data).toHaveLength(0);
    expect((await repository.querySource(source, { ...params, report_scope: 'all', q: 'Table' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { ...params, from_date: '2026-01-15', to_date: '2026-01-15' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKORDER_ANALYSIS_UNAVAILABLE' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'MRP_WORKORDER_ANALYSIS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'MRP_WORKORDER_ANALYSIS_UNAUTHORIZED' });
    database.close();
  });

  test('opens a deterministic read-only detail and protects missing/forbidden records', async () => {
    const { database, repository } = await repositoryForTest();
    const source = yaml('api/work-orders-analysis-detail.yaml').datasources[0];
    const detail = await repository.querySource(source, { id: 'wora-progress-001', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({
      id: 'wora-progress-001',
      record_title: 'WH/MO/00003 - Cut panels',
      status_label: 'In Progress',
      expected_duration: 45,
      duration: 30,
    });
    await expect(repository.querySource(source, { id: 'wora-missing-001', fixture_state: 'missing_record' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'MRP_WORKORDER_ANALYSIS_DETAIL_NOT_FOUND' });
    await expect(repository.querySource(source, { id: 'wora-progress-001', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'MRP_WORKORDER_ANALYSIS_DETAIL_FORBIDDEN' });
    await expect(repository.querySource(source, { id: 'wora-progress-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKORDER_ANALYSIS_DETAIL_UNAVAILABLE' });
    database.close();
  });
});

function detailApiActions(detailPage: any): any[] {
  const detailApi = yaml('api/work-orders-analysis-detail.yaml');
  expect(detailPage.components[0].editable).toBe(false);
  expect(detailApi.actions).toEqual([{ id: 'back_to_mrp_workorder_analysis', type: 'navigate', permission: 'manufacturing.read', navigate_to: '/manufacturing/work-orders-analysis', params: {} }]);
  return detailApi.actions.filter((action: any) => action.type !== 'navigate');
}
