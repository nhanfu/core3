import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Events attendee parity batch', () => {
  test('matches the Odoo event form actions and stat buttons', () => {
    const page = yaml('pages/event-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(form.header_actions.map((action: any) => action.id)).toEqual([
      'registration_desk_event_detail',
      'edit_event_detail',
      'publish_event_detail',
      'start_event_detail',
      'complete_event_detail',
      'cancel_event_detail',
    ]);
    expect(form.stat_buttons.map((action: any) => action.value_field)).toEqual(['registration_count', 'attendee_count']);
    expect(page.actions.find((action: any) => action.id === 'event_registration_stats_detail').params).toEqual({ event_id: '{row.id}' });
    expect(yaml('api/event-detail.yaml').datasources.find((source: any) => source.id === 'event_detail').query).toContain('attendee_count');
    expect(yaml('migrations/20260910120000-006-event-detail-catalog.yaml').version).toBe('0.0.6');
  });

  test('declares the event detail ticket, question, and slot tabs', () => {
    const page = yaml('pages/event-detail.yaml');
    const tabs = page.components.find((component: any) => component.type === 'TabGroup');
    expect(tabs).toMatchObject({ mount_in: 'previous-panel' });
    expect(tabs.tabs.map((tab: any) => tab.label)).toEqual(['Tickets', 'Communication', 'Questions', 'Notes & Documents', 'Slots']);
    expect(yaml('api/event-detail.yaml').datasources.map((source: any) => source.id)).toEqual([
      'event_detail', 'event_registrations', 'event_tickets', 'event_detail_questions', 'event_detail_slots',
    ]);
    expect(tabs.tabs.find((tab: any) => tab.id === 'tickets').components[0].source).toBe('event_tickets');
    expect(tabs.tabs.find((tab: any) => tab.id === 'questions').components[0].source).toBe('event_detail_questions');
    expect(tabs.tabs.find((tab: any) => tab.id === 'slots').components[0].source).toBe('event_detail_slots');
  });

  test('opens attendee rows on a service-owned detail route', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const attendees = yaml('pages/attendees.yaml');
    expect(attendees.components[0]).toMatchObject({ row_open_action: 'view_event_attendee', row_double_click_action: 'view_event_attendee' });
    expect(attendees.actions.find((action: any) => action.id === 'view_event_attendee')).toMatchObject({ navigate_to: '/events/attendees/detail', params: { id: '{row.id}' } });
    expect(yaml('pages/attendee-detail.yaml').page.route).toBe('/events/attendees/detail');
    expect(discovered.pages.get('event-attendee-detail')?.config.components[0].source).toBe('event_attendee_detail');
    expect(discovered.pageDatasources.get('event-attendee-detail')).toContain('event_attendee_answers');
  });

  test('matches the Odoo attendee form sections and lifecycle controls', () => {
    const form = yaml('pages/attendee-detail.yaml').components.find((component: any) => component.type === 'OdooFormView');
    expect(form.statusbar.map((state: any) => state.value)).toEqual(['Registered', 'Attended', 'Cancelled']);
    expect(form.groups.map((group: any) => group.title)).toEqual(['Attendee', 'Event Information']);
    expect(form.header_actions.map((action: any) => action.id)).toEqual(['mark_attendee_attended_detail', 'cancel_event_attendee_detail']);
  });

  test('guards attendee transitions and seeds answer-line fields', () => {
    const page = yaml('pages/attendee-detail.yaml');
    for (const id of ['mark_attendee_attended_detail', 'cancel_event_attendee_detail']) {
      const action = page.actions.find((candidate: any) => candidate.id === id);
      expect(action.permission).toBe('events.write');
      expect(action.mutation.guards[0].status).toBe(409);
      expect(action.mutation.steps[0].query).toContain('row_version = row_version + 1');
    }
    const migration = yaml('migrations/20260910110000-004-attendee-detail.yaml');
    expect(migration.type.postgres.up).toContain('CREATE TABLE IF NOT EXISTS event_registration_answers');
    expect(migration.type.postgres.up).toContain('attendee_phone');
    const fixtures = yaml('migrations/20260910113000-005-official-event-fixtures.yaml');
    expect(fixtures.version).toBe('0.0.5');
    expect(fixtures.type.postgres.up).toContain('Hockey Tournament');
    expect(fixtures.type.postgres.up).toContain('OpenWood Collection Online Reveal');
  });
});
