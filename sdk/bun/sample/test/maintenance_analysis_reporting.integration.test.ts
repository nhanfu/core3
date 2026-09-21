import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance Requests Analysis graph and pivot parity', () => {
  test('binds the source-aligned Graph/Pivot report through page.id', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'maintenance-analysis', route: '/maintenance-requests-analysis' });
    expect(api.page).toEqual({ id: 'maintenance-analysis' });
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(list.default_filters).toEqual({ active: 'active' });
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list', 'card']);
    expect(list.views[0]).toMatchObject({ category_field: 'state', series_field: 'assigned_to', measure_field: 'duration' });
    expect(list.views[0].measures.map((measure: any) => measure.label)).toEqual(['Duration', 'Repeat Every', 'Count']);
    expect(list.views[1].pivot).toMatchObject({
      fields: expect.arrayContaining([
        { field: 'assigned_to', column: 'Responsible' },
        { field: 'state', column: 'Stage' },
        { field: 'duration', column: 'Duration' },
        { field: 'repeat_interval', column: 'Repeat Every' },
        { field: 'record_count', column: 'Count' },
      ]),
      default: { rows: [], columns: [], measures: [{ field: 'record_count', aggregate: 'sum', column: 'Count' }] },
    });
    const source = api.datasources.find((item: any) => item.id === 'maintenance_analysis_requests');
    expect(source.permission).toBe('maintenance.read');
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['assigned_to', 'state', 'duration', 'repeat_interval', 'record_count']));
    expect(source.query).toContain(':active');
    expect(source.query).not.toContain('0 AS duration');
  });

  test('returns persisted active report rows with real report measures and empty state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'maintenance_analysis_reporting_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'maintenance_analysis_reporting_migrations', ['schema', 'data']);
    const api = yaml('api/analysis.yaml');
    const source = api.datasources.find((item: any) => item.id === 'maintenance_analysis_requests');
    const params = { q: null, active: 'active', fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data.length).toBeGreaterThan(0);
    expect(rows.data.every((row: any) => typeof row.duration === 'number' && typeof row.repeat_interval === 'number' && row.record_count === 1)).toBe(true);
    expect(rows.data.some((row: any) => row.assigned_to === 'Unassigned')).toBe(true);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const totals = api.datasources.find((item: any) => item.id === 'maintenance_analysis_totals');
    const totalRows = await repository.querySource(totals, { active: 'active' }, 0, 1);
    expect(totalRows.data).toMatchObject({ request_count: rows.data.length });
    database.close();
  });

  test('keeps the report measures and filters after a file-backed restart', async () => {
    const databasePath = `/tmp/core3-maintenance-analysis-${crypto.randomUUID()}.duckdb`;
    const migrationName = `maintenance_analysis_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const source = yaml('api/analysis.yaml').datasources.find((item: any) => item.id === 'maintenance_analysis_requests');
    const params = { q: null, active: 'active', fixture_state: null };
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const firstRows = await firstRepository.querySource(source, params, 0, 50);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const secondRows = await secondRepository.querySource(source, params, 0, 50);
    expect(secondRows.data).toEqual(firstRows.data);
    expect(secondRows.data.every((row: any) => row.record_count === 1)).toBe(true);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
