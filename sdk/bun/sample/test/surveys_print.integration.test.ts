import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import SurveysModule from '../services/surveys/module';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const surveyToken = 'feedback-survey-token-2026';
const answerToken = 'feedback-answer-token-2026';

function serviceForPrint() {
  return {
    async call(operation: string, request: Record<string, unknown> = {}) {
      if (operation === 'survey.public.detail') return { survey: [] };
      if (operation === 'survey.public.print.detail') {
        return request.access_token === surveyToken
          ? { survey: [{ id: 'survey-demo-feedback', title: 'Feedback Form', state: 'Published' }] }
          : { survey: [] };
      }
      if (operation === 'survey.public.print.questions') {
        return { questions: [{ id: 'question-feedback-rating', question_text: 'How satisfied are you?', sequence: 1, question_type: 'Rating', required: true, answer_options: '1,5' }] };
      }
      if (operation === 'survey.public.print.response') {
        return request.access_token === answerToken
          ? { response: [{ id: 'print-response', survey_id: 'survey-demo-feedback', state: 'Submitted', answer_data: '{"question-feedback-rating":"5"}' }] }
          : { response: [] };
      }
      return {};
    },
  };
}

async function printRequest(path: string, init: RequestInit = {}) {
  const module = new SurveysModule() as any;
  return module.handlePublicRoute(new Request(`http://core3.test${path}`, init), new URL(`http://core3.test${path}`), serviceForPrint());
}

describe('Surveys public print contract', () => {
  test('declares token-scoped printable operations and deterministic response seed', () => {
    const operations = yaml('operations.yaml').operations;
    expect(operations['survey.public.print.detail'].query).toContain("state IN ('Published', 'Closed')");
    expect(operations['survey.public.print.detail'].query).not.toContain('certification');
    expect(operations['survey.public.print.questions'].query).toContain('survey_id = :survey_id');
    expect(operations['survey.public.print.response'].query).toContain('access_token = :access_token');
    expect(yaml('migrations/20260910250000-010-survey-print-answers.yaml').version).toBe('0.0.11');
    expect(yaml('migrations/20260910250000-010-survey-print-answers.yaml').type.postgres.up).toContain('print-response-survey-demo-feedback');
  });

  test('returns a blank printable survey when no answer token is supplied', async () => {
    const response = await printRequest(`/api/public/surveys/${surveyToken}/print?review=1`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ survey: { id: 'survey-demo-feedback' }, answer: null, review: true });
  });

  test('returns a submitted answer only when its token belongs to the survey', async () => {
    const response = await printRequest(`/api/public/surveys/${surveyToken}/print?answer_token=${answerToken}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ answer: { state: 'Submitted', survey_id: 'survey-demo-feedback' } });

    const wrongSurvey = await printRequest(`/api/public/surveys/${surveyToken}/print?answer_token=wrong-answer-token-2026`);
    expect(wrongSurvey.status).toBe(404);
  });

  test('keeps invalid and non-read print requests explicit', async () => {
    const invalid = await printRequest(`/api/public/surveys/${surveyToken}/print?answer_token=bad`);
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error).toContain('valid answer token');

    const method = await printRequest(`/api/public/surveys/${surveyToken}/print`, { method: 'POST' });
    expect(method.status).toBe(405);

    const missing = await printRequest('/api/public/surveys/not-a-survey-token-2026/print');
    expect(missing.status).toBe(404);
  });

  test('registers the print route and responsive print states in the browser surface', () => {
    const app = readFileSync(join(import.meta.dir, '../public/app.ts'), 'utf8');
    const component = readFileSync(join(import.meta.dir, '../public/components/PublicSurveyPrint.ts'), 'utf8');
    expect(app).toContain('survey\\/print\\/');
    expect(app).toContain('PublicSurveyPrint.ts');
    expect(component).toContain('window.print()');
    expect(component).toContain('This survey has no questions yet.');
    expect(component).toContain('@media print');
  });
});
