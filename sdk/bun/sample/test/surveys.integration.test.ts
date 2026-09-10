import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

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
    expect(form.stat_buttons.map((button: any) => button.value_field)).toEqual(['certified_count', 'participant_count']);
    expect(page.actions.find((action: any) => action.id === 'survey_participant_stats_detail').params).toEqual({ survey_id: '{row.id}' });
    expect(yaml('api/survey-detail.yaml').datasources[0].query).toContain('certified_count');
    expect(yaml('migrations/20260910193000-004-survey-participant-fixtures.yaml').type.postgres.up).toContain('participant-certification-4');
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
});
