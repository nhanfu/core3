import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events revenues parity batch', () => {
  test('binds the graph, pivot, and list report through the page id', () => {
    const page = yaml('pages/revenues.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'events-revenues', route: '/events/revenues' });
    expect(list).toMatchObject({ source: 'event_revenues', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ category_field: 'event_start_date', measure_field: 'revenue', type: 'line' });
    expect(list.views.find((view: any) => view.id === 'pivot')?.pivot.default).toMatchObject({ rows: ['event_start_month'], columns: ['event_name'] });
    expect(yaml('api/revenues.yaml').page.id).toBe('events-revenues');
    expect(yaml('api/revenues.yaml').datasources[0].pivot.fields).toEqual(['event_name', 'event_start_date', 'event_start_month', 'ticket_name', 'unit_price', 'sold_quantity', 'revenue', 'state']);
  });

  test('returns deterministic non-free ticket revenue and supports empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_revenue_test_schema_migrations', ['schema', 'data']);

    const source = yaml('api/revenues.yaml').datasources[0];
    const result = await repository.querySource(source, { q: null, state: null, fixture_state: null }, 0, 50);
    expect(result.data.length).toBe(8);
    expect(result.data[0]).toMatchObject({ event_name: 'Conference for Architects', ticket_name: 'Standard', revenue: 1200 });
    expect(result.data.reduce((sum: number, row: any) => sum + Number(row.revenue), 0)).toBe(10550);
    expect((await repository.querySource(source, { q: null, state: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });
});
