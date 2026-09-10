import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Events Settings persistence slice', () => {
  test('keeps the settings layout and API contract joined by page.id', () => {
    const page = yaml('pages/event-settings.yaml');
    const api = yaml('api/event-settings.yaml');
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'configuration').items.find((item: any) => item.path === '/events/settings');
    const settings = page.components[0];
    const save = api.actions.find((candidate: any) => candidate.id === 'save_event_settings');

    expect(page.page).toMatchObject({ id: 'event-settings', route: '/events/settings' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(settings).toMatchObject({ source: 'event_settings', save_action: 'save_event_settings' });
    expect(menu).toMatchObject({ label: 'Settings', permission: 'events.settings' });
    expect(page.page.auth).toEqual({ require: ['events.settings'] });
    expect(api.datasources[0]).toMatchObject({ id: 'event_settings', single: true, permission: 'events.settings' });
    expect(save).toMatchObject({ type: 'server_form', permission: 'events.write', operation: 'update', handler: 'yaml_mutation' });
    expect(save.mutation).toMatchObject({ table: 'event_settings', key_field: 'id', concurrency: { required: true } });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('event-settings')).toEqual(['event_settings']);
  });

  test('returns deterministic settings, empty/error states, and guards stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_settings_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_settings_migrations', ['schema', 'data']);
    const api = yaml('api/event-settings.yaml');
    const source = api.datasources[0];
    const save = api.actions[0];

    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({ data: { id: 'event-settings', row_version: 1, schedule: true, barcode_attendance: true } });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EVENTS_SETTINGS_UNAVAILABLE' });
    expect(save.permission).toBe('events.write');

    const updated = await repository.executeMutation(save.mutation, { id: 'event-settings', expected_row_version: 1, values: { schedule: false, online_exhibitors: true, booth_management: false, sale_tickets: true, pos_tickets: false, online_ticketing: true, barcode_attendance: false } });
    expect(updated).toMatchObject({ id: 'event-settings', row_version: 2, schedule: false, booth_management: false, barcode_attendance: false });
    await expect(repository.executeMutation(save.mutation, { id: 'event-settings', expected_row_version: 1, values: { schedule: true, online_exhibitors: true, booth_management: true, sale_tickets: true, pos_tickets: true, online_ticketing: true, barcode_attendance: true } })).rejects.toMatchObject({ status: 409, code: 'EVENT_SETTINGS_STALE' });
    await expect(repository.executeMutation(save.mutation, { id: 'missing-event-settings', expected_row_version: 1, values: { schedule: true } })).rejects.toMatchObject({ status: 404, code: 'EVENT_SETTINGS_NOT_FOUND' });
    await expect(repository.executeMutation(save.mutation, { id: 'event-settings', expected_row_version: 2, values: { schedule: 'unknown' } })).rejects.toMatchObject({ status: 422, code: 'EVENT_SETTINGS_VALUES_INVALID' });
    database.close();
  });
});
