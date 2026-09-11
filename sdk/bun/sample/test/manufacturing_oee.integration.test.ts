import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const manufacturing = join(root, 'services/manufacturing');
const read = (file: string) => readFileSync(join(manufacturing, file), 'utf8');
const yaml = (file: string) => Bun.YAML.parse(read(file)) as any;

describe('Manufacturing Overall Equipment Effectiveness Odoo action parity', () => {
  test('maps Odoo Reporting action 836/menu 549 and keeps page/API ownership explicit', () => {
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const page = yaml('pages/oee.yaml');
    const detail = yaml('pages/oee-detail.yaml');
    const api = yaml('api/oee.yaml');
    const detailApi = yaml('api/oee-detail.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_oee_productivity');

    expect(reporting.items).toContainEqual(expect.objectContaining({
      path: '/manufacturing/oee',
      label: 'Overall Equipment Effectiveness',
      permission: 'manufacturing.read',
    }));
    expect(page.page).toMatchObject({ id: 'manufacturing-oee', route: '/manufacturing/oee' });
    expect(detail.page).toMatchObject({ id: 'manufacturing-oee-detail', route: '/manufacturing/oee/detail' });
    expect(api.page.id).toBe('manufacturing-oee');
    expect(detailApi.page.id).toBe('manufacturing-oee-detail');
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    const discovered = discoverPages(root);
    expect(discovered.pageDatasources.get('manufacturing-oee')).toContain('mrp_oee_productivity');
    expect(discovered.pageDatasources.get('manufacturing-oee-detail')).toContain('mrp_oee_productivity_detail');
    expect(list.source).toBe('mrp_oee_productivity');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list', 'form']);
    expect(list.default_group_by).toBe('workcenter_name');
    expect(list.group_by).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'workcenter_name', label: 'Workcenter' }),
      expect.objectContaining({ field: 'loss_reason', label: 'Loss Reason' }),
    ]));
    expect(source.permission).toBe('manufacturing.read');
    expect(api.datasources.every((candidate: any) => candidate.permission === 'manufacturing.read')).toBe(true);
    expect(detailApi.datasources.every((candidate: any) => candidate.permission === 'manufacturing.read')).toBe(true);
  });

  test('matches the read-only Odoo graph, pivot, list, and productivity form contract', () => {
    const page = yaml('pages/oee.yaml');
    const list = page.components[0];
    const graph = list.views.find((view: any) => view.id === 'graph');
    const pivot = list.views.find((view: any) => view.id === 'pivot');
    const detail = yaml('pages/oee-detail.yaml');
    const form = detail.components[0];

    expect(graph).toMatchObject({ category_field: 'workcenter_name', measure_field: 'duration_minutes', measure_label: 'Duration (minutes)', type: 'bar' });
    expect(pivot.pivot.default).toMatchObject({ rows: ['workcenter_name', 'loss_reason'], columns: ['loss_type'] });
    expect(pivot.pivot.default.measures).toEqual([{ field: 'duration_minutes', aggregate: 'sum', column: 'Duration (minutes)' }]);
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Start Date', 'End Date', 'Work Center', 'User', 'Loss Reason', 'Duration (minutes)', 'Company',
    ]);
    expect(list.empty_state).toMatchObject({ title: 'Overall Equipment Effectiveness: no working or blocked time' });
    expect(list.create_action).toBeUndefined();
    expect(list.actions).toBeUndefined();
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'mrp_oee_productivity_detail', editable: false, title_field: 'loss_reason' });
    expect(detail.components[0].header_actions).toEqual([expect.objectContaining({ id: 'back_to_mrp_oee' })]);
  });

  test('seeds stable report rows and covers default/search/filter/date/empty/error/forbidden states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(manufacturing, 'migrations'), undefined, 'manufacturing_oee_schema_migrations', ['schema', 'data']);
    const api = yaml('api/oee.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_oee_productivity');
    const params = { q: null, workcenter_name: null, loss_reason: null, loss_type: null, from_date: null, to_date: null, fixture_state: null };

    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data).toHaveLength(6);
    expect(populated.data.reduce((sum: number, row: any) => sum + Number(row.duration_minutes), 0)).toBe(7200);
    expect(populated.data[0]).toMatchObject({ workcenter_name: 'Assembly 1', loss_reason: 'Material Availability' });
    expect((await repository.querySource(source, { ...params, q: 'Assembly' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { ...params, workcenter_name: 'Drill 1', loss_type: 'productive' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, from_date: '2026-01-11', to_date: '2026-01-11' }, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'oee-drill-availability', 'oee-drill-productive',
    ]);
    expect((await repository.querySource(source, { ...params, q: 'does-not-exist' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_OEE_UNAVAILABLE' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'MRP_OEE_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'MRP_OEE_UNAUTHORIZED' });
    database.close();
  });

  test('opens a deterministic read-only detail and exposes missing-record boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(manufacturing, 'migrations'), undefined, 'manufacturing_oee_detail_schema_migrations', ['schema', 'data']);
    const source = yaml('api/oee-detail.yaml').datasources[0];
    const detail = await repository.querySource(source, { id: 'oee-assembly-productive', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'oee-assembly-productive', workcenter_name: 'Assembly 1', loss_reason: 'Fully Productive Time', duration_minutes: 4320 });
    await expect(repository.querySource(source, { id: 'oee-missing', fixture_state: 'missing_record' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'MRP_OEE_DETAIL_NOT_FOUND' });
    await expect(repository.querySource(source, { id: 'oee-assembly-productive', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'MRP_OEE_DETAIL_FORBIDDEN' });
    database.close();
  });
});
