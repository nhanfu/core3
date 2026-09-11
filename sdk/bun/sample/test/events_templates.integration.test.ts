import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('pages/event-template-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Events Event Templates configuration slice', () => {
  test('binds the Odoo list/form route through page IDs', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = yaml('pages/event-templates.yaml');
    const detail = yaml('pages/event-template-detail.yaml');
    expect(list.page.route).toBe('/events/templates');
    expect(list.components[0]).toMatchObject({ row_open_action: 'view_event_template', row_double_click_action: 'view_event_template' });
    expect(list.actions.find((candidate: any) => candidate.id === 'view_event_template')).toMatchObject({ navigate_to: '/events/templates/detail', permission: 'events.read' });
    expect(discovered.pages.get('event-template-detail')?.config.page.route).toBe('/events/templates/detail');
    expect(discovered.pageDatasources.get('event-template-detail')).toEqual([
      'event_template_detail', 'event_template_communications',
    ]);
    expect(detail.components[0].header_actions.map((candidate: any) => candidate.id)).toEqual([
      'back_to_event_templates', 'edit_event_template', 'delete_event_template',
    ]);
  });

  test('seeds deterministic templates and enforces permissions, validation, and concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_templates_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_templates_test_migrations', ['schema', 'data']);

    const listSource = yaml('api/event-templates.yaml').datasources[0];
    const detailSource = yaml('api/event-template-detail.yaml').datasources[0];
    expect(listSource.permission).toBe('events.read');
    expect(yaml('pages/event-templates.yaml').page.auth.require).toEqual(['events.read']);
    expect((await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Exhibition', 'Sport', 'Training']);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detailSource, { id: 'template-training', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Training', seats: 40, row_version: 1 } });

    const create = yaml('pages/event-templates.yaml').actions.find((candidate: any) => candidate.id === 'create_event_template');
    const edit = action('edit_event_template');
    const remove = action('delete_event_template');
    expect(create.permission).toBe('events.write');
    expect(edit.permission).toBe('events.write');
    expect(remove.permission).toBe('events.write');

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Leadership Summit', seats: 120, active: true } });
    expect(created).toMatchObject({ name: 'Leadership Summit', seats: 120, active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'leadership summit', seats: 10 } })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Seats', seats: -1 } })).rejects.toMatchObject({ status: 422, code: 'EVENT_TEMPLATE_SEATS_INVALID' });

    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Leadership Summit 2027', seats: 160, active: true } });
    expect(updated).toMatchObject({ id: created.id, name: 'Leadership Summit 2027', seats: 160, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Template', seats: 1 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(listSource, { q: 'Leadership Summit', fixture_state: null }, 0, 50)).data).toEqual([]);
  });
});
