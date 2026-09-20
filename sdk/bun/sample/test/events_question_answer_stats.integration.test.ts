import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_question_answer_stats_test_schema_migrations', ['schema', 'data']);
  return repository;
}

describe('Events question attendee answers stat action', () => {
  test('binds the Odoo question stat button to the page-owned answer report', () => {
    const page = yaml('pages/event-question-detail.yaml');
    const api = yaml('api/event-question-detail.yaml');
    const answerApi = yaml('api/answer-breakdown.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const stat = form.stat_buttons.find((button: any) => button.id === 'view_event_question_answers');
    const action = api.actions.find((candidate: any) => candidate.id === 'view_event_question_answers');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'event-question-detail', route: '/events/questions/detail' });
    expect(page.datasources).toBeUndefined();
    expect(stat).toMatchObject({ label: 'Attendee answers', value_field: 'answer_count', permission: 'events.read' });
    expect(stat.show_if).toContain("record.question_type === 'Selection'");
    expect(action).toMatchObject({ type: 'navigate', permission: 'events.read', navigate_to: '/events/answer-breakdown', params: { question_id: '{row.id}' } });
    expect(discovered.pageDatasources.get('event-question-detail')).toEqual(['event_question_detail', 'event_question_answers']);
    expect(answerApi.page.id).toBe('answer-breakdown');
    expect(answerApi.datasources[0].query).toContain('a.question_id = :question_id');
  });

  test('persists the question relation and scopes the report after migration replay', async () => {
    const repository = await repositoryForTest();
    const questionDetail = yaml('api/event-question-detail.yaml').datasources[0];
    const answerBreakdown = yaml('api/answer-breakdown.yaml').datasources[0];

    const detail = await repository.querySource(questionDetail, { id: 'question-dietary', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'question-dietary', title: 'Dietary requirements', question_type: 'Selection', answer_count: 1 });

    const scoped = await repository.querySource(answerBreakdown, { question_id: 'question-dietary', q: null, fixture_state: null }, 0, 50);
    expect(scoped.data).toMatchObject([{ registration_id: 'registration-demo-002', question_name: 'Dietary requirements', value_answer_id: 'No preference', answer_count: 1 }]);
    expect((await repository.querySource(answerBreakdown, { question_id: 'question-email', q: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(answerBreakdown, { question_id: 'question-dietary', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(answerBreakdown, { question_id: 'question-dietary', q: null, fixture_state: 'transport_error' }, 0, 50))
      .rejects.toMatchObject({ status: 503, code: 'EVENTS_ANSWER_DATA_UNAVAILABLE' });

    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_question_answer_stats_test_schema_migrations', ['schema', 'data']);
    expect((await repository.querySource(answerBreakdown, { question_id: 'question-dietary', q: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
  });
});
