import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { bindNamedParams } from '@core3/server/database/sql';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import SurveysModule from '../services/surveys/module';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const surveyToken = 'comments-public-token-2026';

function routeFor(repository: YamlRepository) {
  const operations = yaml('operations.yaml').operations;
  const api = yaml('api/surveys.yaml');
  const actions = Object.fromEntries(api.actions.map((action: any) => [action.action, action]));
  const service = {
    async call(operation: string, request: any = {}) {
      if (operations[operation]) {
        const definition = operations[operation];
        const bound = bindNamedParams(definition.query, request);
        return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
      }
      const action = actions[operation];
      if (!action) throw new Error(`Unexpected survey operation: ${operation}`);
      return repository.executeMutation(action.mutation, request);
    },
  };
  const module = new SurveysModule() as any;
  return (path: string, init: RequestInit = {}) => module.handlePublicRoute(
    new Request(`http://survey.test${path}`, init),
    new URL(`http://survey.test${path}`),
    service,
  ) as Promise<Response>;
}

describe('Surveys public choice comments', () => {
  test('keeps Odoo comment settings in the paired page/API contract', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    const publicActions = api.actions.filter((action: any) => action.id.startsWith('public_survey_'));
    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(publicActions.every((action: any) => action.permission === 'surveys.public')).toBe(true);
    expect(operations['survey.public.comment_settings'].query).toContain('comment_count_as_answer');
    expect(renderer).toContain('data-comment');
    expect(renderer).toContain('__comment');
    expect(yaml('migrations/20260928000000-031-survey-public-comments.yaml').version).toBe('0.0.31');
  });

  test('persists a comment-only required answer across restart and replays one submit', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-comments-'));
    const databasePath = join(directory, 'comments.duckdb');
    const migrationTable = 'surveys_public_comments_restart';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);

    const landing = await route(`/api/public/surveys/${surveyToken}`);
    expect(landing.status).toBe(200);
    expect(await landing.json()).toMatchObject({
      survey: { id: 'survey-demo-comments', title: 'Choice Comments' },
      questions: [{ id: 'question-comments-channel', comments_allowed: true, comments_message: 'Tell us what worked well', comment_count_as_answer: true }],
    });

    const started = await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'comments-start-001' }) });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;
    const commentOnly = { 'question-comments-channel__comment': 'The support team followed up quickly.' };
    const progress = await route(`/api/public/surveys/${surveyToken}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: commentOnly }) });
    expect(progress.status).toBe(200);
    expect((await progress.json()).answer.answer_data).toBe(JSON.stringify(commentOnly));

    const feedbackStart = await route('/api/public/surveys/b135640d-14d4-4748-9ef6-344ca256531e/start', { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'comments-foreign-start-001' }) });
    const feedbackToken = (await feedbackStart.json()).answer.access_token;
    const forbiddenComment = await route('/api/public/surveys/b135640d-14d4-4748-9ef6-344ca256531e/progress', { method: 'POST', headers, body: JSON.stringify({ answer_token: feedbackToken, answers: { 'question-feedback-rating': '5', 'question-feedback-rating__comment': 'Not configured here' } }) });
    expect(forbiddenComment.status).toBe(422);
    expect(await repository.query('SELECT answer_data FROM survey_responses WHERE access_token = ?', [feedbackToken])).toEqual([{ answer_data: '{}' }]);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const restored = await reopenedRoute(`/api/public/surveys/${surveyToken}?answer_token=${encodeURIComponent(answerToken)}`);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ answer: { access_token: answerToken, answer_data: JSON.stringify(commentOnly) } });

    const submitBody = JSON.stringify({ answer_token: answerToken, answers: commentOnly, idempotency_key: 'comments-submit-001' });
    const submissions = await Promise.all([
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body: submitBody }),
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body: submitBody }),
    ]);
    expect(submissions.map((response) => response.status).sort()).toEqual([200, 200]);
    expect((await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = 'comments-submit-001'")).at(0)?.count).toBe(1);
    expect((await reopenedRepository.query("SELECT state, answer_data FROM survey_responses WHERE access_token = ?", [answerToken]))[0]).toEqual({ state: 'Submitted', answer_data: JSON.stringify(commentOnly) });
    expect((await reopenedRepository.query("SELECT response_count FROM surveys WHERE id = 'survey-demo-comments'"))[0].response_count).toBe(1);

    const wrongToken = await reopenedRoute(`/api/public/surveys/${surveyToken}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: '00000000-0000-0000-0000-000000000000', answers: commentOnly }) });
    expect(wrongToken.status).toBe(404);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
