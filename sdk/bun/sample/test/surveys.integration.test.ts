import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys parity catalog and workflow', () => {
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
});
