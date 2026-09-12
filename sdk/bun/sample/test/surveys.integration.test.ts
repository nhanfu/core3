import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys parity catalog and workflow', () => {
  test('uses Odoo-style card records on the survey landing screen', () => {
    const page = yaml('pages/surveys.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['card', 'list']);
    expect(list.views[0].card).toMatchObject({ title: 'title', subtitle: 'owner' });
    expect(list.views[1].mobile).toBe(false);
  });

  test('matches Odoo survey detail stat buttons and counts', () => {
    const page = yaml('pages/survey-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(form.stat_buttons.map((button: any) => button.value_field)).toEqual(['certified_count', 'participant_count', 'completed_count']);
    expect(page.actions.find((action: any) => action.id === 'survey_participant_stats_detail').params).toEqual({ survey_id: '{row.id}', state: 'Completed' });
    expect(page.actions.find((action: any) => action.id === 'survey_registered_stats_detail').params).toEqual({ survey_id: '{row.id}' });
    expect(yaml('api/survey-detail.yaml').datasources[0].query).toContain('completed_count');
    expect(yaml('migrations/20260910193000-004-survey-participant-fixtures.yaml').type.postgres.up).toContain('participant-certification-4');
  });

  test('routes the Participants stat to the completed Odoo cohort', async () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/participants.yaml');
    const participants = page.actions.find((action: any) => action.id === 'survey_participant_stats_detail');
    expect(page.components.find((component: any) => component.type === 'OdooFormView').stat_buttons).toContainEqual(expect.objectContaining({ label: 'Participants', value_field: 'completed_count' }));
    expect(participants).toMatchObject({
      permission: 'surveys.read',
      navigate_to: '/surveys/participants',
      params: { survey_id: '{row.id}', state: 'Completed' },
    });
    expect(api.datasources.find((source: any) => source.id === 'survey_participants').query).toContain(':state');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_completed_stat_migrations', ['schema', 'data']);
    const source = api.datasources.find((candidate: any) => candidate.id === 'survey_participants');
    const result = await repository.querySource(source, {
      q: null,
      state: 'Completed',
      quiz_status: null,
      survey_id: 'survey-demo-feedback',
    }, 0, 50);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((row: any) => row.state === 'Completed')).toBe(true);
    expect(result.data.every((row: any) => row.survey_id === 'survey-demo-feedback')).toBe(true);
  });

  test('routes the Certified stat to the Odoo Certifications Succeeded cohort', async () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/participants.yaml');
    const certified = page.actions.find((action: any) => action.id === 'survey_certified_stats_detail');
    expect(page.page.id).toBe('survey-detail');
    expect(yaml('pages/participants.yaml').page.id).toBe(api.page.id);
    expect(certified).toMatchObject({
      permission: 'surveys.read',
      navigate_to: '/surveys/participants',
      params: { survey_id: '{row.id}', quiz_status: 'Passed' },
    });
    expect(api.datasources.find((source: any) => source.id === 'survey_participants').query).toContain(':quiz_status');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_certified_stat_migrations', ['schema', 'data']);
    const source = api.datasources.find((candidate: any) => candidate.id === 'survey_participants');
    const result = await repository.querySource(source, {
      q: null,
      state: null,
      quiz_status: 'Passed',
      survey_id: 'survey-demo-certification',
    }, 0, 50);
    expect(result.data).toHaveLength(2);
    expect(result.data.every((row: any) => row.quiz_status === 'Passed')).toBe(true);
  });

  test('registers the catalog forms and readonly detail routes', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(yaml('pages/suggested-values.yaml').page.route).toBe('/surveys/suggested-values');
    expect(discovered.pages.get('survey-suggested-values')?.config.components[0].create_action).toBe('create_survey_suggested_value');
    expect(discovered.pageDatasources.get('survey-suggested-values')).toContain('survey_question_options');
    expect(discovered.pages.get('survey-participants')?.config.components[0].row_double_click_action).toBe('view_survey_participant');
    expect(yaml('pages/participant-detail.yaml').page.route).toBe('/surveys/participant-detail');
    expect(discovered.pages.get('survey-detailed-answers')?.config.components[0].row_double_click_action).toBe('view_survey_detailed_answer');
    expect(yaml('pages/detailed-answer-detail.yaml').page.route).toBe('/surveys/detailed-answer-detail');
  });

  test('scopes participant and answer catalogs and exposes the guarded lifecycle action', () => {
    const participants = yaml('api/participants.yaml').datasources.find((source: any) => source.id === 'survey_participants');
    expect(participants.query).toContain(':survey_id');
    expect(participants.query).toContain(':quiz_status');
    const answers = yaml('api/detailed-answers.yaml').datasources.find((source: any) => source.id === 'survey_detailed_answers');
    expect(answers.query).toContain(':participant_id');
    const detail = yaml('pages/participant-detail.yaml');
    const action = detail.actions.find((candidate: any) => candidate.id === 'complete_survey_participant');
    expect(action).toMatchObject({ permission: 'surveys.write', action: 'surveys.participants.complete' });
    expect(action.mutation.guards[0].query).toContain("state = 'In Progress'");
    expect(action.mutation.guards[0].query).toContain('EXISTS (SELECT 1 FROM survey_detailed_answers');
    expect(yaml('migrations/20260910210000-006-survey-participant-workflow-answers.yaml').version).toBe('0.0.6');
  });

  test('exposes permissioned invitation, resend, and completed-answer print contracts', () => {
    const participants = yaml('api/participants.yaml');
    const participantPage = yaml('pages/participants.yaml');
    const detail = yaml('api/participant-detail.yaml');
    const detailPage = yaml('pages/participant-detail.yaml');
    const printPage = yaml('pages/participant-print.yaml');
    const invite = participants.actions.find((candidate: any) => candidate.id === 'send_survey_invitation');
    const resend = participants.actions.find((candidate: any) => candidate.id === 'resend_survey_invitation');
    expect(invite).toMatchObject({ type: 'server', permission: 'surveys.write', action: 'surveys.participants.invite', handler: 'yaml_mutation', result: 'alert' });
    expect(String(invite.mutation.guards[0].query)).toContain("state = 'New'");
    expect(String(invite.mutation.guards[1].query)).toContain('email');
    expect(String(resend.mutation.guards[0].query)).toContain("state = 'In Progress'");
    expect(participantPage.components[0].columns.at(-1).actions.map((action: any) => action.id)).toEqual([
      'send_survey_invitation', 'resend_survey_invitation', 'print_completed_answers',
    ]);
    expect(detailPage.components[0].header_actions.map((action: any) => action.id)).toEqual([
      'complete_survey_participant', 'send_survey_invitation_detail', 'resend_survey_invitation_detail', 'print_completed_answers',
    ]);
    const printContract = detail.actions.find((candidate: any) => candidate.id === 'validate_print_completed_answers');
    expect(printContract).toMatchObject({ type: 'server', permission: 'surveys.read', action: 'surveys.participants.print_completed_answers', handler: 'yaml_mutation' });
    expect(String(printContract.mutation.guards[0].query)).toContain("p.state = 'Completed'");
    expect(String(printContract.mutation.guards[0].query)).toContain('survey_detailed_answers');
    expect(printPage.page.route).toBe('/surveys/participant-print');
    expect(printPage.components[0].header_actions[0]).toMatchObject({ id: 'print_completed_answers_document', label: 'Print' });
    expect(yaml('migrations/20260910220000-007-survey-participant-invitations.yaml').version).toBe('0.0.7');
  });

  test('keeps suggested-value creation service-owned and relation-backed', () => {
    const page = yaml('pages/suggested-values.yaml');
    const action = page.actions.find((candidate: any) => candidate.id === 'create_survey_suggested_value');
    expect(action.permission).toBe('surveys.write');
    expect(action.mutation.table).toBe('survey_suggested_values');
    expect(action.mutation.required).toEqual(['question_id', 'question_text', 'value']);
    expect(action.fields.map((field: any) => field.field)).toEqual(['question_id', 'question_text', 'value', 'sequence', 'score', 'matrix_row', 'matrix_column']);
  });

  test('declares guarded archive and reopen transitions', () => {
    const workflow = yaml('pages/survey-workflow.yaml').workflow;
    expect(workflow.states.map((state: any) => state.id)).toContain('Archived');
    expect(workflow.transitions.find((transition: any) => transition.id === 'archive')).toMatchObject({ from: ['Draft', 'Published', 'Closed'], to: 'Archived', permission: 'surveys.manage' });
    expect(workflow.transitions.find((transition: any) => transition.id === 'reopen')).toMatchObject({ from: ['Archived'], to: 'Draft', permission: 'surveys.manage' });
    expect(workflow.transitions.filter((transition: any) => ['archive', 'reopen'].includes(transition.id)).every((transition: any) => transition.mutation.guards?.[0]?.status === 409)).toBe(true);
  });

  test('declares the token-scoped public survey contract', () => {
    const manifest = yaml('manifest.yaml');
    const operations = yaml('operations.yaml').operations;
    const page = yaml('pages/surveys.yaml');
    expect(manifest.operations).toBe('operations.yaml');
    expect(operations['survey.public.detail'].query).toContain("state = 'Published'");
    expect(operations['survey.public.response'].query).toContain('access_token = :access_token');
    expect(page.actions.find((action: any) => action.action === 'surveys.public.start')).toMatchObject({ title: 'Start public survey response' });
    expect(page.actions.find((action: any) => action.action === 'surveys.public.submit').mutation.steps[0].query).toContain("state = 'Submitted'");
    const progress = page.actions.find((action: any) => action.action === 'surveys.public.progress');
    expect(progress).toMatchObject({ permission: 'surveys.write', handler: 'yaml_mutation' });
    expect(progress.mutation.guards[0].query).toContain('access_token = :access_token');
    expect(progress.mutation.guards[0].query).toContain("state = 'In Progress'");
    expect(readFileSync(join(import.meta.dir, '../public/app.ts'), 'utf8')).toContain('answerToken?: string');
    expect(readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8')).toContain('data-back');
    expect(yaml('migrations/20260910200000-005-survey-public-tokens.yaml').version).toBe('0.0.5');
  });

  test('wires Odoo-style survey results from the detail form', () => {
    const detail = yaml('pages/survey-detail.yaml');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');
    expect(form.header_actions[0]).toMatchObject({ id: 'see_survey_results_detail', label: 'See results' });
    expect(detail.actions.find((action: any) => action.id === 'see_survey_results_detail')).toMatchObject({ navigate_to: '/surveys/results', params: { survey_id: '{row.id}' } });
    expect(yaml('api/survey-results.yaml').datasources.map((source: any) => source.id)).toEqual([
      'survey_results_header', 'survey_results_questions', 'survey_results_choices', 'survey_results_text',
    ]);
  });

  test('declares Odoo-style result cohorts across every result datasource', () => {
    const page = yaml('pages/survey-results.yaml');
    const tabs = page.components.filter((component: any) => component.type === 'StatusTabs');
    expect(tabs.map((tab: any) => tab.filter_field)).toEqual(['completion_status', 'result_status']);
    expect(tabs.every((tab: any) => Array.isArray(tab.filter_sources))).toBe(true);
    expect(tabs[0].tabs.map((tab: any) => tab.label)).toEqual(['All surveys', 'Completed surveys']);
    expect(tabs[1].tabs.map((tab: any) => tab.label)).toEqual(['Passed and failed', 'Passed only', 'Failed only']);

    const api = yaml('api/survey-results.yaml');
    for (const source of api.datasources) {
      expect(source.query).toContain(':completion_status');
      expect(source.query).toContain(':result_status');
    }
    const migration = yaml('migrations/20260910220000-007-survey-results-cohorts.yaml');
    expect(migration.type.postgres.up).toContain('participant-feedback-passed');
    expect(migration.type.postgres.up).toContain('participant-feedback-failed');
  });

  test('owns the live-session lifecycle through page-bound YAML actions', () => {
    const detail = yaml('pages/survey-detail.yaml');
    const detailApi = yaml('api/survey-detail.yaml');
    const session = yaml('pages/live-session.yaml');
    const sessionApi = yaml('api/live-session.yaml');
    const detailForm = detail.components.find((component: any) => component.type === 'OdooFormView');
    const start = detailApi.actions.find((action: any) => action.id === 'start_live_session_detail');
    const end = sessionApi.actions.find((action: any) => action.id === 'end_live_session');
    expect(yaml('manifest.yaml').permissions).toBe('permissions.yaml');
    expect(yaml('migrations/20260910230000-008-survey-live-sessions.yaml').version).toBe('0.0.9');
    expect(session.page.id).toBe('survey-live-session');
    expect(sessionApi.page.id).toBe('survey-live-session');
    expect(sessionApi.datasources[0].query).toContain(':survey_id');
    expect(detailApi.datasources[0].query).toContain('session_state');
    expect(detailForm.header_actions.map((action: any) => action.id)).toEqual(expect.arrayContaining([
      'start_live_session_detail', 'open_live_session_detail', 'end_live_session_detail',
    ]));
    expect(detail.actions.find((action: any) => action.id === 'open_live_session_detail')).toMatchObject({
      navigate_to: '/surveys/live-session', params: { survey_id: '{row.id}' },
    });
    expect(start).toMatchObject({ permission: 'surveys.manage', handler: 'yaml_mutation', action: 'surveys.sessions.start' });
    expect(start.params).toEqual({ expected_session_row_version: '{row.session_row_version}' });
    expect(String(start.mutation.guards[0].query)).toContain('EXISTS (SELECT 1 FROM survey_questions');
    expect(String(start.mutation.steps[0].query)).toContain("state = 'Ready'");
    expect(end).toMatchObject({ permission: 'surveys.manage', handler: 'yaml_mutation', action: 'surveys.sessions.end' });
    expect(detailApi.actions.find((action: any) => action.id === 'end_live_session_detail').params).toEqual({ id: '{row.session_id}', expected_row_version: '{row.session_row_version}' });
    expect(String(end.mutation.guards[0].query)).toContain("state IN ('Ready', 'In Progress')");
    expect(String(end.mutation.steps[0].query)).toContain("state = 'Closed'");
  });

  test('starts the first deterministic question with guarded Ready lifecycle', async () => {
    const page = yaml('pages/live-session.yaml');
    const api = yaml('api/live-session.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const questions = page.components.find((component: any) => component.source === 'survey_live_session_questions');
    const start = api.actions.find((action: any) => action.id === 'start_live_session_question');
    expect(page.page.id).toBe('survey-live-session');
    expect(api.page.id).toBe(page.page.id);
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'start_live_session_question', label: 'Start' }));
    expect(questions).toMatchObject({ title: 'Session questions', empty_state: { title: 'No questions in this session' } });
    expect(api.datasources.find((source: any) => source.id === 'survey_live_session')).toMatchObject({
      permission: 'surveys.read',
      error_states: { transport_error: { status: 503, code: 'SURVEY_LIVE_SESSION_UNAVAILABLE' } },
    });
    expect(api.datasources.find((source: any) => source.id === 'survey_live_session_questions')).toMatchObject({
      permission: 'surveys.read',
      error_states: { transport_error: { status: 503, code: 'SURVEY_LIVE_SESSION_QUESTIONS_UNAVAILABLE' } },
    });
    expect(start).toMatchObject({ permission: 'surveys.manage', handler: 'yaml_mutation', action: 'surveys.sessions.start_question' });
    expect(start.params).toEqual({ expected_row_version: '{row.row_version}' });
    expect(String(start.mutation.guards[0].query)).toContain("state = 'Ready'");
    expect(String(start.mutation.guards[0].query)).toContain('row_version = :expected_row_version');
    expect(String(start.mutation.guards[1].query)).toContain('ORDER BY q.sequence, q.id');
    expect(String(start.mutation.steps[0].query)).toContain("state = 'In Progress'");

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_live_session_question_migrations', ['schema', 'data']);
    const sessionSource = api.datasources.find((source: any) => source.id === 'survey_live_session');
    const questionSource = api.datasources.find((source: any) => source.id === 'survey_live_session_questions');
    const initial = await repository.querySource(sessionSource, { survey_id: 'survey-demo-feedback', fixture_state: null }, 0, 1);
    expect(initial.data).toMatchObject({ id: 'live-session-feedback', session_state: 'Closed', row_version: 1, current_question_text: 'Waiting for the host to start the first question' });
    expect((await repository.querySource(questionSource, { survey_id: 'survey-demo-feedback', fixture_state: null }, 0, 50)).data[0]).toMatchObject({ sequence: 1, question_text: 'How satisfied are you?', question_state: 'Upcoming' });
    expect((await repository.querySource(questionSource, { survey_id: 'survey-demo-feedback', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const createSession = yaml('api/survey-detail.yaml').actions.find((action: any) => action.id === 'start_live_session_detail');
    await repository.executeMutation(createSession.mutation, { id: 'survey-demo-feedback', expected_session_row_version: 1 });
    const ready = await repository.querySource(sessionSource, { survey_id: 'survey-demo-feedback', fixture_state: null }, 0, 1);
    expect(ready.data).toMatchObject({ session_state: 'Ready', row_version: 2 });
    const started = await repository.executeMutation(start.mutation, { id: ready.data.id, expected_row_version: ready.data.row_version });
    expect(started).toMatchObject({ state: 'In Progress', current_question_id: 'question-feedback-rating', current_question_text: 'How satisfied are you?' });
    expect(await repository.query('SELECT state, current_question_id, row_version FROM survey_live_sessions WHERE id = ?', ['live-session-feedback'])).toEqual([{ state: 'In Progress', current_question_id: 'question-feedback-rating', row_version: 3 }]);
    await expect(repository.executeMutation(start.mutation, { id: ready.data.id, expected_row_version: ready.data.row_version })).rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_NOT_READY' });
    await expect(repository.executeMutation(start.mutation, { id: ready.data.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_NOT_READY' });

    await repository.run("INSERT INTO surveys(id, name, title, description, owner, state) VALUES ('survey-live-empty', 'SURVEY/LIVE-EMPTY', 'Empty Live Survey', 'No questions yet.', 'Mitchell Admin', 'Draft')");
    await repository.run("INSERT INTO survey_live_sessions(id, survey_id, survey_name, state, session_code, session_link) VALUES ('live-session-empty', 'survey-live-empty', 'Empty Live Survey', 'Ready', '9000', '/s/9000')");
    await expect(repository.executeMutation(start.mutation, { id: 'live-session-empty', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_NO_QUESTIONS' });
  });

  test('advances the host to the next question with explicit end and stale guards', async () => {
    const page = yaml('pages/live-session.yaml');
    const api = yaml('api/live-session.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const next = api.actions.find((action: any) => action.id === 'advance_live_session_question');
    expect(page.page.id).toBe('survey-live-session');
    expect(api.page.id).toBe(page.page.id);
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'advance_live_session_question', label: 'Next' }));
    expect(next).toMatchObject({ permission: 'surveys.manage', action: 'surveys.sessions.next_question', handler: 'yaml_mutation' });
    expect(next.params).toEqual({ expected_row_version: '{row.row_version}' });
    expect(String(next.mutation.guards[0].query)).toContain("state = 'In Progress'");
    expect(String(next.mutation.guards[0].query)).toContain('current_question_id IS NOT NULL');
    expect(next.mutation.guards[1]).toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_STALE' });
    expect(next.mutation.guards[2]).toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_NO_NEXT_QUESTION' });
    expect(String(next.mutation.steps[0].query)).toContain('ORDER BY next_question.sequence, next_question.id');
    expect(String(next.mutation.steps[0].query)).toContain("state = 'In Progress'");

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_live_session_next_migrations', ['schema', 'data']);
    const createSession = yaml('api/survey-detail.yaml').actions.find((action: any) => action.id === 'start_live_session_detail');
    const start = api.actions.find((action: any) => action.id === 'start_live_session_question');
    await repository.executeMutation(createSession.mutation, { id: 'survey-demo-feedback', expected_session_row_version: 1 });
    await repository.executeMutation(start.mutation, { id: 'live-session-feedback', expected_row_version: 2 });
    const advanced = await repository.executeMutation(next.mutation, { id: 'live-session-feedback', expected_row_version: 3 });
    expect(advanced).toMatchObject({ state: 'In Progress', current_question_id: 'question-feedback-comment', current_question_text: 'What can we improve?', current_question_sequence: 2 });
    expect(await repository.query('SELECT current_question_id, row_version FROM survey_live_sessions WHERE id = ?', ['live-session-feedback'])).toEqual([{ current_question_id: 'question-feedback-comment', row_version: 4 }]);
    await expect(repository.executeMutation(next.mutation, { id: 'live-session-feedback', expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_STALE' });
    await repository.run("UPDATE survey_live_sessions SET current_question_id = 'question-feedback-notes', current_question_text = 'Additional comments', row_version = 5 WHERE id = 'live-session-feedback'");
    await expect(repository.executeMutation(next.mutation, { id: 'live-session-feedback', expected_row_version: 5 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_NO_NEXT_QUESTION' });

    await repository.run("UPDATE survey_live_sessions SET state = 'Closed', current_question_id = NULL, row_version = 6 WHERE id = 'live-session-feedback'");
    await expect(repository.executeMutation(next.mutation, { id: 'live-session-feedback', expected_row_version: 6 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_NOT_IN_PROGRESS' });
  });

  test('exposes the permissioned Odoo Test action with deterministic entries', () => {
    const page = yaml('pages/survey-test.yaml');
    const api = yaml('api/survey-test.yaml');
    const testAction = page.actions.find((action: any) => action.id === 'back_to_survey_detail');
    const start = api.actions.find((action: any) => action.id === 'start_survey_test_action');
    const open = api.actions.find((action: any) => action.id === 'start_survey_test');
    expect(page.page).toMatchObject({ id: 'survey-test', route: '/surveys/test' });
    expect(api.page).toEqual({ id: 'survey-test' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['survey_test', 'survey_test_questions']);
    expect(testAction).toMatchObject({ navigate_to: '/surveys/detail', params: { id: '{row.id}' } });
    expect(start).toMatchObject({ permission: 'surveys.write', action: 'surveys.test.start', handler: 'yaml_mutation' });
    expect(start.mutation).toMatchObject({ operation: 'update', table: 'survey_responses', concurrency: false });
    expect(String(start.mutation.guards[0].query)).toContain('EXISTS (SELECT 1 FROM survey_questions');
    expect(String(start.mutation.guards[1].query)).toContain('test_entry = true');
    expect(open).toMatchObject({ type: 'client', permission: 'surveys.write' });
    expect(open.script).toContain('/api/actions/surveys.test.start');
    expect(open.script).toContain('/survey/start/');
    expect(yaml('migrations/20260910240000-009-survey-test-entries.yaml').version).toBe('0.0.10');
    expect(readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8')).toContain('This is a Test Survey Entry.');
  });

  test('duplicates a survey definition with ordered questions and guarded state', async () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const menu = form.action_menu;
    const duplicate = api.actions.find((candidate: any) => candidate.action === 'surveys.records.duplicate');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(menu).toMatchObject({ label: 'Actions', aria_label: 'Actions menu' });
    expect(menu.actions).toContainEqual(expect.objectContaining({ id: 'duplicate_survey_detail', label: 'Duplicate', icon: 'copy' }));
    expect(page.actions.find((candidate: any) => candidate.id === 'duplicate_survey_detail')).toMatchObject({ type: 'client', permission: 'surveys.write' });
    expect(duplicate).toMatchObject({ type: 'server', permission: 'surveys.write', action: 'surveys.records.duplicate', handler: 'yaml_mutation', operation: 'duplicate' });
    expect(String(duplicate.mutation.guards[0].query)).toContain('source_id');
    expect(String(duplicate.mutation.guards[1].query)).toContain("state <> 'Archived'");
    expect(String(duplicate.mutation.guards[2].query)).toContain('row_version = :expected_row_version');
    expect(String(duplicate.mutation.before_steps[1].query)).toContain('response_count');
    expect(String(duplicate.mutation.before_steps[2].query)).toContain('ORDER BY q.sequence, q.id');
    expect(String(duplicate.mutation.before_steps[3].query)).toContain('survey_suggested_values');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_duplicate_migrations', ['schema', 'data']);
    const input = {
      source_id: 'survey-demo-feedback',
      expected_row_version: 1,
      duplicate_id: 'survey-duplicate-feedback-1',
      duplicate_access_token: 'duplicate-feedback-token-2026',
    };
    const result = await repository.executeMutation(duplicate.mutation, input);
    expect(result).toMatchObject({
      id: 'survey-duplicate-feedback-1',
      title: 'Feedback Form (copy)',
      state: 'Draft',
      response_count: 0,
      access_token: 'duplicate-feedback-token-2026',
    });
    expect(await repository.query('SELECT row_version, response_count, state FROM surveys WHERE id = ?', ['survey-demo-feedback'])).toEqual([
      { row_version: 1, response_count: 4, state: 'Published' },
    ]);
    expect(await repository.query('SELECT question_text, question_type, sequence, required FROM survey_questions WHERE survey_id = ? ORDER BY sequence, id', ['survey-duplicate-feedback-1'])).toEqual([
      { question_text: 'How satisfied are you?', question_type: 'Rating', sequence: 1, required: true },
      { question_text: 'What can we improve?', question_type: 'Text', sequence: 2, required: false },
      { question_text: 'How would you rate our service?', question_type: 'Choice', sequence: 3, required: true },
      { question_text: 'Would you recommend us?', question_type: 'Choice', sequence: 4, required: true },
      { question_text: 'Which support channel did you use?', question_type: 'Choice', sequence: 5, required: false },
      { question_text: 'May we contact you for follow-up?', question_type: 'Choice', sequence: 6, required: false },
      { question_text: 'Additional comments', question_type: 'Text', sequence: 7, required: false },
    ]);
    expect((await repository.query('SELECT COUNT(*) AS count FROM survey_suggested_values WHERE question_id LIKE ?', ['survey-duplicate-feedback-1-question-%']))[0].count).toBe(2);

    await expect(repository.executeMutation(duplicate.mutation, { ...input, source_id: 'missing-survey', duplicate_id: 'survey-duplicate-missing' })).rejects.toMatchObject({ status: 404, code: 'SURVEY_DUPLICATE_NOT_FOUND' });
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-feedback'");
    await expect(repository.executeMutation(duplicate.mutation, { ...input, duplicate_id: 'survey-duplicate-archived' })).rejects.toMatchObject({ status: 409, code: 'SURVEY_DUPLICATE_ARCHIVED' });
    await repository.run("UPDATE surveys SET state = 'Published' WHERE id = 'survey-demo-feedback'");
    await expect(repository.executeMutation(duplicate.mutation, { ...input, expected_row_version: 2, duplicate_id: 'survey-duplicate-stale' })).rejects.toMatchObject({ status: 409, code: 'SURVEY_DUPLICATE_STALE' });
    database.close();
  });

  test('opens the token-scoped printable survey from the form Actions menu', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const print = page.actions.find((candidate: any) => candidate.id === 'print_survey_detail');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(form.action_menu.actions).toContainEqual(expect.objectContaining({
      id: 'print_survey_detail',
      label: 'Print Survey',
      permission: 'surveys.read',
    }));
    expect(print).toMatchObject({ type: 'client', permission: 'surveys.read' });
    expect(print.script).toContain("window.open(`/survey/print/${encodeURIComponent(row.access_token)}`");
    expect(print.script).toContain("'_blank'");
    expect(yaml('operations.yaml').operations['survey.public.print.detail'].query).toContain("state IN ('Published', 'Closed')");
  });
});
