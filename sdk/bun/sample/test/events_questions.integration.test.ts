import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events Event Questions detail parity', () => {
  test('binds the list/detail workflow through page IDs and Odoo form controls', () => {
    const listPage = yaml('pages/event-questions.yaml');
    const list = listPage.components.find((component: any) => component.type === 'ListView');
    const detailPage = yaml('pages/event-question-detail.yaml');
    const detail = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.datasources).toBeUndefined();
    expect(list).toMatchObject({ row_open_action: 'view_event_question', row_double_click_action: 'view_event_question', empty_state: { title: 'No event questions' } });
    expect(listPage.actions.find((action: any) => action.id === 'view_event_question')).toMatchObject({ navigate_to: '/events/questions/detail', permission: 'events.read' });
    expect(detailPage.page).toMatchObject({ id: 'event-question-detail', route: '/events/questions/detail', auth: { require: ['events.read'] } });
    expect(detail.header_actions.map((action: any) => action.id)).toEqual(['back_to_event_questions', 'edit_event_question', 'delete_event_question']);
    expect(detail.groups.map((group: any) => group.title)).toEqual(['Question', 'Answers']);
    expect(yaml('api/event-question-detail.yaml').page.id).toBe('event-question-detail');
    expect(discovered.pageDatasources.get('event-question-detail')).toContain('event_question_detail');
  });

  test('seeds deterministic questions and guards duplicate, missing, and detail reads', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_questions_test_schema_migrations', ['schema', 'data']);

    const source = yaml('api/event-question-detail.yaml').datasources[0];
    const detail = await repository.querySource(source, { id: 'question-name', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'question-name', title: 'Name', row_version: 1, mandatory: true });
    expect((await repository.querySource(source, { id: 'does-not-exist', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});

    const create = yaml('pages/event-questions.yaml').actions.find((action: any) => action.id === 'create_event_question');
    const update = yaml('pages/event-question-detail.yaml').actions.find((action: any) => action.id === 'edit_event_question');
    expect(create.mutation.guards[0]).toMatchObject({ status: 409, code: 'EVENT_QUESTION_TITLE_EXISTS' });
    expect(update.mutation.guards.map((guard: any) => guard.status)).toEqual([404, 409]);
    expect(yaml('migrations/20260910230000-011-event-question-detail.yaml').version).toBe('0.0.11');
  });
});
