import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/appraisals');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('Appraisals parity slice', () => {
  test('joins page contracts to API fragments and exposes visible view tabs', () => {
    const listPage = yaml('pages/reviews.yaml');
    const detailPage = yaml('pages/review-detail.yaml');
    const cyclesPage = yaml('pages/cycles.yaml');
    const analysisPage = yaml('pages/analysis.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(yaml('api/reviews.yaml').page.id).toBe(listPage.page.id);
    expect(yaml('api/review-detail.yaml').page.id).toBe(detailPage.page.id);
    expect(yaml('api/cycles.yaml').page.id).toBe(cyclesPage.page.id);
    expect(yaml('api/analysis.yaml').page.id).toBe(analysisPage.page.id);
    expect(yaml('api/reviews.yaml').datasources.map((source: any) => source.id)).toEqual(['appraisal_states', 'appraisal_cycles_lookup', 'appraisals']);
    expect(yaml('api/analysis.yaml').datasources.map((source: any) => source.id)).toEqual(['appraisal_analysis_totals', 'appraisal_analysis_states']);
    expect(listPage.components[0].view_navigation).toBe('tabs');
    expect(listPage.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Kanban']);
    expect(action('api/reviews.yaml', 'view_appraisal')).toMatchObject({ navigate_to: '/appraisal-detail', params: { id: '{row.id}' } });
    expect(action('api/review-detail.yaml', 'edit_appraisal_detail').mutation.concurrency).toEqual({ required: true });
  });

  test('seeds every workflow state and supports guarded CRUD with persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'appraisals_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'appraisals_test_migrations', ['schema', 'data']);

    const listSource = yaml('api/reviews.yaml').datasources.find((source: any) => source.id === 'appraisals');
    const seeded = await repository.querySource(listSource, { q: null, state: null }, 0, 50);
    expect(seeded.data.map((row: any) => row.state).sort()).toEqual(['Cancelled', 'Completed', 'Draft', 'In Progress', 'Manager Review']);

    const create = action('api/reviews.yaml', 'create_appraisal');
    const values = {
      name: 'APR/2026/QA-001', cycle_id: 'cycle-demo-001', cycle_name: 'Annual Review 2026',
      employee_id: 'employee-qa-001', employee_name: 'QA Appraisal', manager_name: 'People Manager',
      job_title: 'QA Analyst', goals: 'Improve release confidence', self_rating: null, manager_rating: null,
      summary: null, feedback: null, due_date: '2026-12-15',
    };
    const created = await repository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ id: 'appraisal-custom-apr-2026-qa-001', name: 'APR/2026/QA-001', state: 'Draft', row_version: 1 });

    const edit = action('api/reviews.yaml', 'edit_appraisal');
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { ...values, self_rating: 'Meets', summary: 'Updated during review.' },
    });
    expect(edited).toMatchObject({ self_rating: 'Meets', summary: 'Updated during review.', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { ...values, self_rating: 'Exceeds' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const workflow = yaml('pages/appraisal-workflow.yaml').workflow;
    const start = workflow.transitions.find((transition: any) => transition.id === 'start');
    const started = await repository.executeMutation(start.mutation, { id: created.id });
    expect(started).toMatchObject({ state: 'In Progress', row_version: 3 });
    const submit = workflow.transitions.find((transition: any) => transition.id === 'submit');
    const submitted = await repository.executeMutation(submit.mutation, { id: created.id });
    expect(submitted).toMatchObject({ state: 'Manager Review', row_version: 4 });

    const complete = workflow.transitions.find((transition: any) => transition.id === 'complete');
    await expect(repository.executeMutation(complete.mutation, { id: created.id })).rejects.toMatchObject({ status: 409, code: 'APPRAISAL_MANAGER_RATING_REQUIRED' });
    const managerRated = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 4,
      values: { ...values, self_rating: 'Meets', manager_rating: 'Meets' },
    });
    expect(managerRated.row_version).toBe(5);
    const completed = await repository.executeMutation(complete.mutation, { id: created.id });
    expect(completed).toMatchObject({ state: 'Completed', row_version: 6 });

    const deleteAction = action('api/reviews.yaml', 'delete_appraisal');
    await expect(repository.executeMutation(deleteAction.mutation, { id: created.id, expected_row_version: 6 })).rejects.toMatchObject({ status: 404, code: 'APPRAISAL_NOT_DELETABLE' });
    const cancelled = await repository.querySource(listSource, { q: null, state: 'Cancelled' }, 0, 50);
    await repository.executeMutation(deleteAction.mutation, { id: cancelled.data[0].id, expected_row_version: cancelled.data[0].row_version });
    expect((await repository.querySource(listSource, { q: null, state: 'Cancelled' }, 0, 50)).data).toHaveLength(0);
  });
});
