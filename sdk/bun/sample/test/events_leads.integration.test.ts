import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events event-form Leads stat parity', () => {
  test('binds the exact event-form stat action through separate page and API ids', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/event-leads.yaml');
    const api = yaml('api/event-leads.yaml');
    const detail = yaml('pages/event-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe('event-leads');
    expect(discovered.pageDatasources.get('event-leads')).toEqual(['event_linked_leads']);
    expect(detail.components[0].stat_buttons).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'event_leads_detail', label: 'Leads', value_field: 'lead_count' })]));
    expect(detail.actions.find((action: any) => action.id === 'event_leads_detail')).toMatchObject({ navigate_to: '/events/leads', permission: 'events.read' });
  });

  test('seeds idempotent event leads and covers search, empty, missing, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_leads_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_leads_test_migrations', ['schema', 'data']);
    const source = yaml('api/event-leads.yaml').datasources[0];
    expect((await repository.querySource(source, { event_id: 'event-demo-001', q: null, fixture_state: null }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { event_id: 'event-demo-001', q: 'Hospitality', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Hospitality partnership', probability_display: '20%' }]);
    expect((await repository.querySource(source, { event_id: 'event-demo-001', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { event_id: 'missing-event', q: null, fixture_state: 'not_found' }, 0, 50)).rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' });
    await expect(repository.querySource(source, { event_id: 'event-demo-001', q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EVENT_LEADS_UNAVAILABLE' });
    database.close();
  });

  test('keeps the source action read-only and fixtures deterministic', () => {
    const page = yaml('pages/event-leads.yaml');
    const api = yaml('api/event-leads.yaml');
    expect(page.actions).toEqual([expect.objectContaining({ id: 'view_event_lead', type: 'navigate' })]);
    expect(api.actions).toBeUndefined();
    expect(readFileSync(join(serviceRoot, 'migrations/20260912110000-026-event-lead-stat.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)|random\(\)/i);
  });
});
