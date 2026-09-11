import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events Mail Schedulers parity slice', () => {
  test('binds the technical Odoo action and page-owned list/detail APIs', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    const menu = configuration.items.find((item: any) => item.label === 'Mail Schedulers');
    const list = yaml('pages/event-mail-schedulers.yaml');
    const detail = yaml('pages/event-mail-scheduler-detail.yaml');
    const listApi = yaml('api/event-mail-schedulers.yaml');
    const detailApi = yaml('api/event-mail-scheduler-detail.yaml');

    expect(menu).toMatchObject({ path: '/events/mail-schedulers', label: 'Mail Schedulers', permission: 'events.settings' });
    expect(list.page).toMatchObject({ id: 'event-mail-schedulers', route: '/events/mail-schedulers', auth: { require: ['events.settings'] } });
    expect(detail.page).toMatchObject({ id: 'event-mail-scheduler-detail', route: '/events/mail-schedulers/detail', auth: { require: ['events.settings'] } });
    expect(list.components[0]).toMatchObject({ source: 'event_mail_schedulers', row_open_action: 'view_event_mail_scheduler', row_double_click_action: 'view_event_mail_scheduler' });
    expect(list.components[0].views).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'list', mobile: false }),
      expect.objectContaining({ id: 'card', label: 'Cards', card: expect.objectContaining({ title: 'event_name', subtitle: 'template_ref' }) }),
    ]));
    expect(list.components[0].columns.map((column: any) => column.label)).toEqual(['Event', 'Template', 'Schedule Date', '# Sent', 'Status']);
    expect(list.actions).toHaveLength(1);
    expect(detail.components[0]).toMatchObject({ source: 'event_mail_scheduler_detail', editable: false });
    expect(detail.components[0].header_actions.map((action: any) => action.id)).toEqual(['back_to_event_mail_schedulers']);
    expect(listApi.page.id).toBe('event-mail-schedulers');
    expect(detailApi.page.id).toBe('event-mail-scheduler-detail');
    expect(discovered.pages.get('event-mail-schedulers')?.config.page.route).toBe('/events/mail-schedulers');
    expect(discovered.pages.get('event-mail-scheduler-detail')?.config.page.route).toBe('/events/mail-schedulers/detail');
    expect(discovered.pageDatasources.get('event-mail-schedulers')).toEqual(['event_mail_schedulers']);
    expect(discovered.pageDatasources.get('event-mail-scheduler-detail')).toEqual(['event_mail_scheduler_detail']);
  });

  test('seeds deterministic scheduler rows and supports search, empty, and detail reads', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_mail_schedulers_read_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_mail_schedulers_read_migrations', ['schema', 'data']);

    const api = yaml('api/event-mail-schedulers.yaml');
    const listSource = api.datasources.find((source: any) => source.id === 'event_mail_schedulers');
    const detailSource = yaml('api/event-mail-scheduler-detail.yaml').datasources.find((source: any) => source.id === 'event_mail_scheduler_detail');
    const initial = await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50);
    expect(initial.data).toHaveLength(21);
    expect(initial.data.slice(0, 3).map((row: any) => row.event_name)).toEqual([
      'Design Fair Los Angeles', 'Design Fair Los Angeles', 'Design Fair Los Angeles',
    ]);
    expect(initial.data.slice(0, 3).map((row: any) => row.template_ref)).toEqual([
      'Event: Registration Confirmation', 'Event: Reminder', 'Event: Reminder',
    ]);
    expect(initial.data[0]).toMatchObject({
      event_name: 'Design Fair Los Angeles',
      mail_state: 'running',
      mail_state_label: 'Running',
      interval_display: 'Immediately',
      interval_type_label: 'After each registration',
      mail_count_done: 3,
    });
    expect((await repository.querySource(listSource, { q: 'OpenWood', fixture_state: null }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(listSource, { q: 'No matching scheduler', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detailSource, { id: 'event-mail-design-fair-registration', fixture_state: null }, 0, 1)).toMatchObject({
      data: {
        event_name: 'Design Fair Los Angeles',
        template_ref: 'Event: Registration Confirmation',
        scheduler_label: 'Event Mail Scheduler',
        mail_state_label: 'Running',
        interval_display: 'Immediately',
        interval_type_label: 'After each registration',
        registration_mail_count: 3,
      },
    });
    expect((await repository.querySource(detailSource, { id: 'missing-scheduler', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    database.close();
  });

  test('declares stable forbidden and transport-error boundaries for the system-only action', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_mail_schedulers_error_migrations', ['schema', 'data']);
    const api = yaml('api/event-mail-schedulers.yaml');
    const listSource = api.datasources.find((source: any) => source.id === 'event_mail_schedulers');
    const detailSource = yaml('api/event-mail-scheduler-detail.yaml').datasources.find((source: any) => source.id === 'event_mail_scheduler_detail');

    expect(listSource.permission).toBe('events.settings');
    expect(detailSource.permission).toBe('events.settings');
    expect(yaml('pages/event-mail-schedulers.yaml').page.auth.require).toEqual(['events.settings']);
    expect(yaml('pages/event-mail-scheduler-detail.yaml').page.auth.require).toEqual(['events.settings']);
    expect(listSource.error_states).toMatchObject({
      forbidden: { status: 403, code: 'EVENT_MAIL_SCHEDULERS_FORBIDDEN' },
      transport_error: { status: 503, code: 'EVENT_MAIL_SCHEDULERS_UNAVAILABLE' },
    });
    expect(detailSource.error_states).toMatchObject({
      forbidden: { status: 403, code: 'EVENT_MAIL_SCHEDULER_FORBIDDEN' },
      missing_record: { status: 404, code: 'EVENT_MAIL_SCHEDULER_NOT_FOUND' },
      transport_error: { status: 503, code: 'EVENT_MAIL_SCHEDULER_DETAIL_UNAVAILABLE' },
    });
    await expect(repository.querySource(listSource, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EVENT_MAIL_SCHEDULERS_UNAVAILABLE' });
    await expect(repository.querySource(detailSource, { id: 'event-mail-design-fair-registration', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EVENT_MAIL_SCHEDULER_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('keeps the migration fixed, idempotent, and faithful to the read-only Odoo action', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_mail_schedulers_schema_migrations', ['schema', 'data']);
    expect((await repository.query("SELECT COUNT(*) AS count FROM event_mail_schedulers"))[0].count).toBe(21);
    expect((await repository.query("SELECT COUNT(*) AS count FROM event_mail_scheduler_registrations"))[0].count).toBe(3);
    const migration = readFileSync(join(serviceRoot, 'migrations/20260911170000-020-event-mail-schedulers.yaml'), 'utf8');
    expect(migration).toContain("'Event: Registration Confirmation'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)|random\(\)/i);
    expect(yaml('manifest.yaml').id).toBe('events');
    expect(yaml('pages/event-mail-schedulers.yaml').components[0].create_action).toBeUndefined();
    expect(yaml('pages/event-mail-scheduler-detail.yaml').components[0].editable).toBe(false);
    database.close();
  });
});
