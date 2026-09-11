import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/event-template-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Events Event Template Communication parity', () => {
  test('binds the Odoo Communication tab and API by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/event-template-detail.yaml');
    const api = yaml('api/event-template-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid');

    expect(api.page.id).toBe(page.page.id);
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Tickets', 'Communication', 'Questions', 'Notes']);
    expect(form.notebook.active).toBe('communication');
    expect(form.notebook.tabs.filter((tab: any) => tab.content_slot).map((tab: any) => tab.id)).toEqual(['communication']);
    expect(grid).toMatchObject({ source: 'event_template_communications', parent_source: 'event_template_detail', variant: 'odoo_x2many' });
    expect(grid.children.filter((child: any) => child.type === 'LineItemField').map((field: any) => field.label)).toEqual(['Template', 'Interval', 'Unit', 'Trigger']);
    expect(grid.actions[0]).toMatchObject({ id: 'add_event_template_communication', label: 'Add a line', permission: 'events.write' });
    expect(action('add_event_template_communication')).toMatchObject({ permission: 'events.write', handler: 'line_item', domain: 'event_template' });
    expect(action('edit_event_template_communication')).toMatchObject({ permission: 'events.write', operation: 'update' });
    expect(action('delete_event_template_communication')).toMatchObject({ permission: 'events.write', operation: 'delete' });
    expect(discovered.pageDatasources.get('event-template-detail')).toEqual(['event_template_detail', 'event_template_communications']);
  });

  test('seeds the Odoo Exhibition schedules and explicit empty/error contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_template_communication_read_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_template_communication_read_migrations', ['schema', 'data']);
    const source = yaml('api/event-template-detail.yaml').datasources.find((candidate: any) => candidate.id === 'event_template_communications');

    expect((await repository.querySource(source, { id: 'template-exhibition', fixture_state: null }, 0, 50)).data).toMatchObject([
      { template_name: 'Event: Registration Confirmation', interval_nbr: 0, interval_unit: 'Immediately', interval_type: 'After each registration' },
      { template_name: 'Event: Reminder', interval_nbr: 1, interval_unit: 'Hours', interval_type: 'Before the event starts' },
      { template_name: 'Event: Reminder', interval_nbr: 3, interval_unit: 'Days', interval_type: 'Before the event starts' },
    ]);
    expect((await repository.querySource(source, { id: 'template-exhibition', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'missing-template', fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'EVENT_TEMPLATE_COMMUNICATIONS_UNAVAILABLE' });
    database.close();
  });

  test('supports permissioned create/update/delete with validation and concurrency guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_template_communication_crud_migrations', ['schema', 'data']);
    const create = action('add_event_template_communication');
    const update = action('edit_event_template_communication');
    const remove = action('delete_event_template_communication');
    for (const candidate of [create, update, remove]) expect(candidate.permission).toBe('events.write');

    const parent = (await repository.query('SELECT row_version FROM event_templates WHERE id = ?', ['template-exhibition']))[0];
    const created = await repository.executeMutation(create.mutation, {
      id: 'template-exhibition', parent_expected_row_version: parent.row_version,
      template_name: 'Event: Reminder', interval_nbr: 2, interval_unit: 'Weeks', interval_type: 'After the event started',
    });
    expect(created).toMatchObject({ id: 'event-template-mail-template-exhibition-40', template_name: 'Event: Reminder', interval_unit: 'weeks', interval_type: 'after_event_start', row_version: 1 });

    await expect(repository.executeMutation(create.mutation, {
      id: 'template-exhibition', parent_expected_row_version: parent.row_version,
      template_name: 'Event: Reminder', interval_nbr: 4, interval_unit: 'Weeks', interval_type: 'Before the event ends',
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const current = (await repository.query('SELECT row_version FROM event_templates WHERE id = ?', ['template-exhibition']))[0];
    await expect(repository.executeMutation(create.mutation, {
      id: 'template-exhibition', parent_expected_row_version: current.row_version,
      template_name: 'Event: Reminder', interval_nbr: 0, interval_unit: 'Hours', interval_type: 'Before the event starts',
    })).rejects.toMatchObject({ status: 422, code: 'EVENT_TEMPLATE_COMMUNICATION_INVALID' });
    await expect(repository.executeMutation(create.mutation, {
      id: 'template-exhibition', parent_expected_row_version: current.row_version,
      template_name: 'Event: Reminder', interval_nbr: 1, interval_unit: 'Hours', interval_type: 'Before the event starts',
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_COMMUNICATION_EXISTS' });

    const edited = await repository.executeMutation(update.mutation, {
      id: 'template-exhibition', line_id: created.id, expected_row_version: 1, parent_expected_row_version: current.row_version,
      template_name: 'Event: Reminder', interval_nbr: 2, interval_unit: 'Weeks', interval_type: 'Before the event ends',
    });
    expect(edited).toMatchObject({ id: created.id, interval_type: 'before_event_end', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, {
      id: 'template-exhibition', line_id: created.id, expected_row_version: 1, parent_expected_row_version: current.row_version + 1,
      template_name: 'Event: Reminder', interval_nbr: 2, interval_unit: 'Weeks', interval_type: 'Before the event ends',
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_COMMUNICATION_STALE' });

    const afterEdit = (await repository.query('SELECT row_version FROM event_templates WHERE id = ?', ['template-exhibition']))[0];
    await expect(repository.executeMutation(remove.mutation, { id: 'template-exhibition', line_id: created.id, expected_row_version: 1, parent_expected_row_version: afterEdit.row_version })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_COMMUNICATION_STALE' });
    const deleted = await repository.executeMutation(remove.mutation, { id: 'template-exhibition', line_id: created.id, expected_row_version: 2, parent_expected_row_version: afterEdit.row_version });
    expect(deleted).toMatchObject({ deleted: true, id: created.id });
    database.close();
  });
});
