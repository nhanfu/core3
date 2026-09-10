import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off by Type report parity', () => {
  test('declares the installed Odoo action as a read-only graph, list, and pivot menu', () => {
    const manifest = yaml('manifest.yaml');
    expect(manifest.menu.groups.find((group: any) => group.id === 'reporting')?.items).toContainEqual(expect.objectContaining({
      path: '/time-off-reporting/by-type',
      label: 'By Type',
      permission: 'time_off.read',
    }));

    const page = yaml('pages/report-by-type.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.page).toMatchObject({ id: 'time-off-report-by-type', route: '/time-off-reporting/by-type' });
    expect(page.page.datasources).toBeUndefined();
    expect(list.source).toBe('time_off_type_report');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'list', 'pivot']);
    expect(list.views[0]).toMatchObject({ category_field: 'leave_type_name', measure_field: 'time_off_days' });
    expect(list.views[2].pivot.default).toMatchObject({
      rows: ['leave_type_name'],
      measures: [
        { field: 'allocation_days', aggregate: 'sum', column: 'Allocation' },
        { field: 'time_off_days', aggregate: 'sum', column: 'Time Off' },
        { field: 'balance_days', aggregate: 'sum', column: 'Balance' },
      ],
    });
    expect(list.create_action).toBeUndefined();
    expect(list.actions).toBeUndefined();
  });

  test('uses page-id API discovery, fixed 2026 aggregates, search, type/status filters, and error state', async () => {
    const api = yaml('api/report-by-type.yaml');
    expect(api.page.id).toBe('time-off-report-by-type');
    expect(api.datasources.every((source: any) => source.permission === 'time_off.read')).toBe(true);
    const source = api.datasources.find((candidate: any) => candidate.id === 'time_off_type_report');
    expect(source.pivot.fields).toContain('balance_days');
    expect(source.query).toContain("DATE '2026-01-01'");
    expect(source.query).toContain("DATE '2027-01-01'");
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'TIME_OFF_TYPE_REPORT_UNAVAILABLE' });

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_report_type_schema_migrations', ['schema', 'data']);

    const params = { q: null, state: null, leave_type_id: null, fixture_state: null };
    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data.map((row: any) => row.leave_type_name)).toEqual(['Annual Leave', 'Compensatory Days', 'Sick Time Off', 'Training Time Off']);
    expect(populated.data.find((row: any) => row.leave_type_id === 'leave-type-annual')).toMatchObject({
      allocation_days: 35,
      time_off_days: 5,
      balance_days: 30,
    });

    const searched = await repository.querySource(source, { ...params, q: 'comp' }, 0, 50);
    expect(searched.data).toHaveLength(1);
    expect(searched.data[0]).toMatchObject({ leave_type_name: 'Compensatory Days', time_off_days: 2 });
    const filtered = await repository.querySource(source, { ...params, leave_type_id: 'leave-type-sick' }, 0, 50);
    expect(filtered.data).toHaveLength(1);
    expect(filtered.data[0].leave_type_name).toBe('Sick Time Off');
    const empty = await repository.querySource(source, { ...params, q: 'does-not-exist' }, 0, 50);
    expect(empty.data).toEqual([]);
    const forcedEmpty = await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50);
    expect(forcedEmpty.data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({
      status: 503,
      code: 'TIME_OFF_TYPE_REPORT_UNAVAILABLE',
    });
    database.close();
  });
});
