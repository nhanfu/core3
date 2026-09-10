import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/event-questions.yaml');
const detailApi = () => yaml('api/event-question-detail.yaml');
const action = (id: string) => [...(listApi().actions || []), ...(detailApi().actions || [])]
  .find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_questions_test_schema_migrations', ['schema', 'data']);
  return repository;
}

describe('Events Event Questions parity action', () => {
  test('binds the layout-only list/detail pages to page-owned APIs and shared views', () => {
    const listPage = yaml('pages/event-questions.yaml');
    const detailPage = yaml('pages/event-question-detail.yaml');
    const list = listPage.components.find((component: any) => component.type === 'ListView');
    const detail = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.actions).toBeUndefined();
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'event-questions', route: '/events/questions', auth: { require: ['events.read'] } });
    expect(detailPage.page).toMatchObject({ id: 'event-question-detail', route: '/events/questions/detail', auth: { require: ['events.read'] } });
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'event_questions', row_open_action: 'view_event_question', row_double_click_action: 'view_event_question', empty_state: { title: 'No event questions' } });
    expect(detail).toMatchObject({ type: 'OdooFormView', source: 'event_question_detail', editable: true });
    expect(detail.groups.map((group: any) => group.title)).toEqual(['Question']);
    expect(discovered.pageDatasources.get('event-questions')).toEqual(['event_questions']);
    expect(discovered.pageDatasources.get('event-question-detail')).toEqual(['event_question_detail', 'event_question_answers']);
    expect(listApi().page.id).toBe('event-questions');
    expect(detailApi().page.id).toBe('event-question-detail');
  });

  test('matches the Odoo menu/action contract and permission boundaries', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'configuration').items
      .find((item: any) => item.label === 'Event Questions');
    expect(menu).toMatchObject({ path: '/events/questions', permission: 'events.read' });
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['events.read', 'events.write', 'events.manage']));
    expect(listApi().datasources[0]).toMatchObject({ permission: 'events.read' });
    expect(detailApi().datasources[0]).toMatchObject({ permission: 'events.read' });
    expect(action('view_event_question')).toMatchObject({ type: 'navigate', permission: 'events.read', navigate_to: '/events/questions/detail' });
    for (const id of ['create_event_question', 'edit_event_question', 'delete_event_question']) {
      expect(action(id), id).toMatchObject({ permission: 'events.write', handler: 'yaml_mutation' });
    }
    expect(action('edit_event_question').mutation.concurrency).toMatchObject({ required: true });
    expect(action('delete_event_question').mutation.concurrency).toMatchObject({ required: true });
  });

  test('supports deterministic search and explicit empty/transport states', async () => {
    const repository = await repositoryForTest();
    const list = listApi().datasources[0];
    const detail = detailApi().datasources[0];

    expect((await repository.querySource(list, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
      .toEqual(['Dietary requirements', 'Email', 'Name', 'Phone']);
    expect((await repository.querySource(list, { q: 'mail', fixture_state: null }, 0, 50)).data)
      .toMatchObject([{ id: 'question-email', title: 'Email', question_type: 'Email' }]);
    expect((await repository.querySource(list, { q: 'No matching question', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detail, { id: 'question-name', fixture_state: null }, 0, 1))
      .toMatchObject({ data: { id: 'question-name', title: 'Name', row_version: 1, mandatory: true } });
    expect((await repository.querySource(detail, { id: 'missing-question', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(list, { q: null, fixture_state: 'transport_error' }, 0, 50))
      .rejects.toMatchObject({ status: 503, code: 'EVENT_QUESTIONS_UNAVAILABLE' });
    await expect(repository.querySource(detail, { id: 'question-name', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'EVENT_QUESTION_DETAIL_UNAVAILABLE' });
    expect(list.error_states.transport_error).toMatchObject({ status: 503, code: 'EVENT_QUESTIONS_UNAVAILABLE' });
    expect(detail.error_states.transport_error).toMatchObject({ status: 503, code: 'EVENT_QUESTION_DETAIL_UNAVAILABLE' });
  });

  test('supports CRUD with duplicate, validation, stale, and missing-record guards', async () => {
    const repository = await repositoryForTest();
    const create = action('create_event_question');
    const edit = action('edit_event_question');
    const remove = action('delete_event_question');

    const created = await repository.executeMutation(create.mutation, {
      values: { title: 'Accessibility needs', question_type: 'Selection', mandatory: true, once_per_order: true, answers: 'Vegetarian, Vegan' },
    });
    expect(created).toMatchObject({ title: 'Accessibility needs', question_type: 'Selection', mandatory: true, once_per_order: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { title: 'accessibility needs', question_type: 'Text' } }))
      .rejects.toMatchObject({ status: 409, code: 'EVENT_QUESTION_TITLE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { title: 'Unsupported', question_type: 'Date' } }))
      .rejects.toMatchObject({ status: 422, code: 'EVENT_QUESTION_TYPE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { title: 'Missing type' } }))
      .rejects.toMatchObject({ status: 422, code: 'EVENT_QUESTION_TYPE_INVALID' });

    const updated = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { title: 'Accessibility updated', question_type: 'Selection', mandatory: false, once_per_order: true, answers: 'Vegetarian, Vegan, Other' },
    });
    expect(updated).toMatchObject({ id: created.id, title: 'Accessibility updated', mandatory: false, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { title: 'Stale question', question_type: 'Text' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { title: 'Invalid question', question_type: 'Date' } }))
      .rejects.toMatchObject({ status: 422, code: 'EVENT_QUESTION_TYPE_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-question', expected_row_version: 1, values: { title: 'Missing', question_type: 'Text' } }))
      .rejects.toMatchObject({ status: 404, code: 'EVENT_QUESTION_NOT_FOUND' });

    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(listApi().datasources[0], { q: 'Accessibility', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: 'missing-question', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'EVENT_QUESTION_NOT_FOUND' });
  });
});
