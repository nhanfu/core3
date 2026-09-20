import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Surveys results print report', () => {
  test('keeps the Odoo results print action in the page/API contract', () => {
    const page = yaml('pages/survey-results.yaml');
    const api = yaml('api/survey-results.yaml');
    const print = api.actions.find((action: any) => action.action === 'surveys.results.print');

    expect(page.page.id).toBe('survey-results');
    expect(api.page).toEqual({ id: 'survey-results' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'survey_results_header' });
    expect(page.components[0].header_actions).toContainEqual({ id: 'print_survey_results', label: 'Print', permission: 'surveys.read', variant: 'primary' });
    expect(api.datasources.map((source: any) => source.id)).toContain('survey_results_print_runs');
    expect(print).toMatchObject({ type: 'server', permission: 'surveys.read', operation: 'report', handler: 'yaml_mutation' });
    expect(print.mutation).toMatchObject({ operation: 'insert', table: 'survey_results_print_runs' });
    expect(print.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 403, code: 'SURVEY_RESULTS_PRINT_ACTOR' }),
      expect.objectContaining({ status: 422, code: 'SURVEY_RESULTS_FILTER_INVALID' }),
    ]));
  });

  test('records a filtered print run and preserves it across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-results-print-'));
    const path = join(directory, 'surveys.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'surveys_results_print_runs', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'surveys_results_print_runs', ['schema', 'data']);

    const api = yaml('api/survey-results.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'survey_results_print_runs');
    const mutation = api.actions.find((action: any) => action.action === 'surveys.results.print').mutation;
    const initial = await repository.querySource(source, { survey_id: 'survey-demo-feedback' }, 0, 50);
    expect(initial.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'survey-results-print-demo-feedback-1', response_count: 4, question_count: 7 }),
    ]));

    const printed = await repository.executeMutation(mutation, {
      survey_id: 'survey-demo-feedback', survey_name: 'Feedback Form', requested_by: 'Admin User', current_user_name: 'Admin User',
      completion_status: 'Completed', result_status: 'Passed',
    });
    expect(printed).toMatchObject({
      id: 'survey-results-print-survey-demo-feedback-2', survey_id: 'survey-demo-feedback', survey_name: 'SURVEY/FEEDBACK',
      completion_status: 'Completed', result_status: 'Passed', response_count: 1, question_count: 7,
      generated_at: '2026-01-15 00:00:00',
    });
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    const rows = await reopened.querySource(source, { survey_id: 'survey-demo-feedback' }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual([
      'survey-results-print-survey-demo-feedback-2', 'survey-results-print-demo-feedback-1',
    ]);
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects missing, actor-mismatched, and invalid-filter print requests atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'surveys_results_print_guards', ['schema', 'data']);
    const mutation = yaml('api/survey-results.yaml').actions.find((action: any) => action.action === 'surveys.results.print').mutation;
    const valid = { survey_id: 'survey-demo-feedback', survey_name: 'Feedback Form', requested_by: 'Admin User', current_user_name: 'Admin User', completion_status: 'all', result_status: 'all' };

    await expect(repository.executeMutation(mutation, { ...valid, survey_id: 'missing-survey' })).rejects.toMatchObject({ status: 404, code: 'SURVEY_RESULTS_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { ...valid, requested_by: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'SURVEY_RESULTS_PRINT_ACTOR' });
    await expect(repository.executeMutation(mutation, { ...valid, result_status: 'Unknown' })).rejects.toMatchObject({ status: 422, code: 'SURVEY_RESULTS_FILTER_INVALID' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM survey_results_print_runs WHERE survey_id = 'survey-demo-feedback'")).at(0)?.count).toBe(1);
    database.close();
  });

  test('keeps the print migration deterministic and replay-safe', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260920170000-019-survey-results-print-runs.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
