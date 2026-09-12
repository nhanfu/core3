import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events Full Page Ticket Example report', () => {
  test('joins the layout-only page and API by page id and wires the event action', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/event-full-page-ticket.yaml');
    const api = yaml('api/event-full-page-ticket.yaml');
    const detail = yaml('pages/event-detail.yaml');
    expect(page.page).toMatchObject({ id: 'event-full-page-ticket', route: '/events/full-page-ticket' });
    expect(api.page).toEqual({ id: 'event-full-page-ticket' });
    expect(page.components[1]).toMatchObject({ type: 'TemplatePreview', source: 'event_full_page_ticket_blocks', template_source: 'event_full_page_ticket' });
    expect(discovered.pageDatasources.get('event-full-page-ticket')).toEqual(['event_full_page_ticket', 'event_full_page_ticket_blocks']);
    expect(detail.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'print_event_full_page_ticket_example', label: 'Full Page Ticket Example' }));
  });

  test('provides deterministic populated, empty, missing, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'events_full_page_ticket_test_migrations', ['schema', 'data']);
    const source = yaml('api/event-full-page-ticket.yaml').datasources[0];
    expect(await repository.querySource(source, { id: 'event-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ event_name: 'Design Fair Los Angeles', format: 'A4', status: 'Ready' }) });
    expect((await repository.querySource(source, { id: 'event-demo-001', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { id: 'missing-event', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { id: 'event-demo-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EVENT_FULL_PAGE_TICKET_UNAVAILABLE' });
    const blocks = yaml('api/event-full-page-ticket.yaml').datasources[1];
    expect((await repository.querySource(blocks, { id: 'event-demo-001', fixture_state: null }, 0, 20)).data).toHaveLength(9);
    database.close();
  });

  test('keeps the report fixture free of runtime-dependent values', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260912150000-029-event-full-page-ticket.yaml'), 'utf8');
    expect(migration).toContain('version: 0.0.29');
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)|random\(\)/i);
  });
});
