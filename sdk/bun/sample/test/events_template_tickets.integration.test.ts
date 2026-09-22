import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiAction = (id: string) => yaml('api/event-template-tickets.yaml').actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => yaml('api/event-template-tickets.yaml').datasources.find((candidate: any) => candidate.id === id);

describe('Events event template ticket parity', () => {
  test('joins the template ticket action to a page-owned route through page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/event-template-tickets.yaml');
    const detail = yaml('pages/event-template-detail.yaml');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid');

    expect(page.page).toMatchObject({ id: 'event-template-tickets', route: '/events/templates/tickets' });
    expect(page.datasources).toBeUndefined();
    expect(yaml('api/event-template-tickets.yaml').page.id).toBe('event-template-tickets');
    expect(discovered.pageDatasources.get('event-template-tickets')).toEqual([
      'event_template_tickets_detail', 'event_template_tickets',
    ]);
    expect(detail.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'manage_event_template_tickets', label: 'Tickets' }),
    ]));
    expect(grid).toMatchObject({
      source: 'event_template_tickets',
      parent_source: 'event_template_tickets_detail',
      variant: 'odoo_x2many',
      actions: [expect.objectContaining({ id: 'add_event_template_ticket' })],
    });
    expect(apiAction('add_event_template_ticket')).toMatchObject({ permission: 'events.write', action: 'events.templates.tickets.create', operation: 'create' });
    expect(apiAction('edit_event_template_ticket')).toMatchObject({ permission: 'events.write', action: 'events.templates.tickets.update', operation: 'update' });
    expect(apiAction('delete_event_template_ticket')).toMatchObject({ permission: 'events.write', action: 'events.templates.tickets.delete', operation: 'delete' });
  });

  test('persists template tickets with validation, stale, empty, and replay guards', async () => {
    const databasePath = `/tmp/core3-events-template-tickets-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    const migrationName = `events_template_tickets_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);

    const detail = await repository.querySource(source('event_template_tickets_detail'), { id: 'template-exhibition', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ name: 'Exhibition', row_version: 1 });
    expect((await repository.querySource(source('event_template_tickets'), { id: 'template-exhibition', q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Free', 'Standard', 'VIP']);
    expect((await repository.querySource(source('event_template_tickets'), { id: 'template-exhibition', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source('event_template_tickets_detail'), { id: 'missing-template', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});

    const create = apiAction('add_event_template_ticket');
    const update = apiAction('edit_event_template_ticket');
    const remove = apiAction('delete_event_template_ticket');
    const created = await repository.executeMutation(create.mutation, {
      id: 'template-exhibition',
      parent_expected_row_version: 1,
      values: { name: 'Workshop Pass', description: 'Access to the workshop.', seats_max: 25 },
    });
    expect(created).toMatchObject({ id: 'event-template-ticket-template-exhibition-40', name: 'Workshop Pass', seats_limited: true, seats_max: 25, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, {
      id: 'template-exhibition', parent_expected_row_version: 2, values: { name: 'workshop pass', seats_max: 5 },
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_TICKET_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, {
      id: 'template-exhibition', parent_expected_row_version: 2, values: { name: '', seats_max: 5 },
    })).rejects.toMatchObject({ status: 422, code: 'EVENT_TEMPLATE_TICKET_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, {
      id: 'template-exhibition', parent_expected_row_version: 2, values: { name: 'Bad seats', seats_max: -1 },
    })).rejects.toMatchObject({ status: 422, code: 'EVENT_TEMPLATE_TICKET_SEATS_INVALID' });

    const updated = await repository.executeMutation(update.mutation, {
      id: 'template-exhibition', line_id: created.id, parent_expected_row_version: 2, expected_row_version: 1,
      values: { name: 'Workshop Pass Plus', description: 'Updated access.', seats_max: 30 },
    });
    expect(updated).toMatchObject({ id: created.id, name: 'Workshop Pass Plus', seats_max: 30, row_version: 2 });
    await expect(repository.executeMutation(update.mutation, {
      id: 'template-exhibition', line_id: created.id, parent_expected_row_version: 2, expected_row_version: 1,
      values: { name: 'Stale pass', seats_max: 1 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(remove.mutation, {
      id: 'template-exhibition', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 1,
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_TICKET_STALE' });
    await repository.executeMutation(remove.mutation, {
      id: 'template-exhibition', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 2,
    });
    expect((await repository.querySource(source('event_template_tickets'), { id: 'template-exhibition', q: 'Workshop', fixture_state: null }, 0, 50)).data).toEqual([]);

    await database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopened = new YamlRepository(reopenedDatabase);
    expect((await reopened.querySource(source('event_template_tickets'), { id: 'template-exhibition', q: 'Workshop', fixture_state: null }, 0, 50)).data).toEqual([]);
    await reopenedDatabase.close();
  });
});
