import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = () => yaml('api/costs-analysis.yaml').datasources.find((candidate: any) => candidate.id === 'fleet_costs_analysis');

describe('Fleet Costs Analysis parity slice', () => {
  test('matches the installed Odoo action and keeps page/API ownership separate', () => {
    const page = yaml('pages/costs-analysis.yaml');
    const api = yaml('api/costs-analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const reportSource = api.datasources.find((candidate: any) => candidate.id === 'fleet_costs_analysis');

    expect(reporting.items).toContainEqual({ path: '/fleet/reporting/costs', label: 'Costs', icon: 'chart', permission: 'fleet.manage' });
    expect(page.title).toBe('Costs Analysis');
    expect(page.page).toMatchObject({ id: 'fleet-costs-analysis', route: '/fleet/reporting/costs', auth: { require: ['fleet.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(list.source).toBe('fleet_costs_analysis');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(list.views[0]).toMatchObject({ category_field: 'date_start', series_field: 'cost_type', measure_field: 'cost', measure_label: 'Cost', type: 'line' });
    expect(list.views[1].pivot.default).toEqual({ rows: ['vehicle_name'], columns: ['date_start', 'cost_type'], measures: [{ field: 'cost', aggregate: 'sum', column: 'Cost' }] });
    expect(api.page).toEqual({ id: 'fleet-costs-analysis' });
    expect(reportSource.permission).toBe('fleet.manage');
    expect(reportSource.pivot.fields).toEqual(['date_start', 'cost_type', 'vehicle_name', 'driver_name', 'fuel_type', 'cost']);
    expect(reportSource.error_states.transport_error).toMatchObject({ status: 503, code: 'FLEET_COSTS_DATA_UNAVAILABLE' });
    expect(String(reportSource.query)).toContain(':q IS NULL');
    expect(String(reportSource.query)).toContain(':fixture_state');
    expect(readFileSync(join(serviceRoot, 'migrations/20260911210000-015-fleet-cost-report-schema.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(readFileSync(join(serviceRoot, 'migrations/20260911211000-016-fleet-cost-report-data.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('fleet-costs-analysis')).toEqual(['fleet_costs_analysis']);
  });

  test('seeds stable graph/pivot rows and supports search, filters, empty, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'fleet_costs_analysis_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'fleet_costs_analysis_migrations', ['schema', 'data']);
    const report = source();
    const params = { q: null, cost_type: null, date_period: 'year', fixture_state: null };

    const initial = await repository.querySource(report, params, 0, 50);
    expect(initial.data).toHaveLength(18);
    expect(initial.data[0]).toMatchObject({ date_start: '2026-01-01', vehicle_name: 'City Bike 02', cost: 400, cost_type: 'contract' });
    expect(initial.data.at(-1)).toMatchObject({ date_start: '2026-06-01', vehicle_name: 'Pool Vehicle 01', cost: 400, cost_type: 'contract' });
    expect(initial.data.every((row: any) => row.date_start >= '2026-01-01' && row.date_start <= '2026-12-01')).toBe(true);

    const searched = await repository.querySource(report, { ...params, q: 'Pool Vehicle' }, 0, 50);
    expect(searched.data).toHaveLength(10);
    expect(searched.data.every((row: any) => row.vehicle_name === 'Pool Vehicle 01')).toBe(true);
    const services = await repository.querySource(report, { ...params, cost_type: 'service' }, 0, 50);
    expect(services.data).toHaveLength(7);
    expect(services.data.every((row: any) => row.cost_type === 'service')).toBe(true);
    expect((await repository.querySource(report, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(report, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'FLEET_COSTS_DATA_UNAVAILABLE' });
  });
});
