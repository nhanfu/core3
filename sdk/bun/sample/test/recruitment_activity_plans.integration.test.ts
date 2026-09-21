import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = yaml('api/activity-plans.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Activity Plans parity action', () => {
  test('joins the Odoo Recruitment Plans list, kanban, and form contract by page.id', () => {
    const page = yaml('pages/activity-plans.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'recruitment-activity-plans', route: '/recruitment/activity-plans', auth: { require: ['recruitment.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pages.get('recruitment-activity-plans')?.config.page.id).toBe('recruitment-activity-plans');
    expect(discovered.pageDatasources.get('recruitment-activity-plans')).toEqual(['recruitment_activity_plans']);
    expect(page.components[0]).toMatchObject({ source: 'recruitment_activity_plans', create_action: 'create_recruitment_activity_plan', row_open_action: 'edit_recruitment_activity_plan', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['name', 'res_model_label', 'steps_count', 'company_name', 'active_label', 'id']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/recruitment/activity-plans', label: 'Activity Plans', permission: 'recruitment.manage' })]));
  });

  test('seeds durable Recruitment plans and guards search, step shape, archive/restore, CRUD, and stale state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_activity_plans_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_activity_plans_test_migrations', ['schema', 'data']);
    const source = api.datasources[0];

    const active = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(active.data.map((row: any) => row.name)).toEqual(['Interview Loop', 'Onboarding']);
    expect(active.data.find((row: any) => row.name === 'Onboarding')).toMatchObject({ res_model_label: 'Applicants', steps_count: 3, active: true });
    expect(JSON.parse(active.data.find((row: any) => row.name === 'Onboarding').steps_json)).toHaveLength(3);
    expect((await repository.querySource(source, { q: 'interview', active: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Interview Loop', steps_count: 2 }]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Candidate Screening']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const steps = JSON.stringify([{ sequence: 1, activity_type: 'Email', summary: 'Send a follow-up', responsible_type: 'on_demand', delay_count: 1, delay_unit: 'days', delay_from: 'after_plan_date' }]);
    const create = action('create_recruitment_activity_plan');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Reference Check', res_model: 'hr.applicant', company_name: 'Visible to all', steps_json: steps, active: true } });
    expect(created).toMatchObject({ name: 'Reference Check', res_model: 'hr.applicant', active: true });
    expect((await repository.querySource(source, { q: 'Reference Check', active: null, fixture_state: null }, 0, 50)).data[0].steps_count).toBe(1);
    await expect(repository.executeMutation(create.mutation, { values: { name: 'reference check', res_model: 'hr.applicant', steps_json: '[]' } }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_ACTIVITY_PLAN_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Other Model', res_model: 'crm.lead', steps_json: '[]' } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_ACTIVITY_PLAN_MODEL_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Broken Steps', res_model: 'hr.applicant', steps_json: '{"summary":"not an array"}' } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_ACTIVITY_PLAN_STEPS_INVALID' });

    const edit = action('edit_recruitment_activity_plan');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Reference Check Updated', res_model: 'hr.applicant', company_name: 'Visible to all', steps_json: steps } });
    expect(edited).toMatchObject({ name: 'Reference Check Updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit', res_model: 'hr.applicant', steps_json: steps } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await repository.executeMutation(action('archive_recruitment_activity_plan').mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(source, { q: 'Reference Check Updated', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await repository.executeMutation(action('restore_recruitment_activity_plan').mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect((await repository.querySource(source, { q: 'Reference Check Updated', active: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    await repository.executeMutation(action('delete_recruitment_activity_plan').mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(action('delete_recruitment_activity_plan').mutation, { id: 'missing-activity-plan', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_ACTIVITY_PLAN_NOT_FOUND' });
    database.close();
  });

  test('persists an archived plan and its activity steps across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-recruitment-activity-plans-'));
    const databasePath = join(directory, 'activity-plans.duckdb');
    const migrationName = `recruitment_activity_plans_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database = await DuckDbDatabase.open(databasePath);
    let repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await repository.executeMutation(action('archive_recruitment_activity_plan').mutation, { id: 'activity-plan-onboarding', expected_row_version: 1, values: { active: false } });
    database.close();

    database = await DuckDbDatabase.open(databasePath);
    repository = new YamlRepository(database);
    const source = api.datasources[0];
    const persisted = (await repository.querySource(source, { q: 'Onboarding', active: 'archived', fixture_state: null }, 0, 50)).data;
    expect(persisted).toMatchObject([{ name: 'Onboarding', active: false, row_version: 2, steps_count: 3 }]);
    expect(JSON.parse(persisted[0].steps_json)[1]).toMatchObject({ activity_type: 'Interview', delay_count: 2 });
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('keeps manager permissions, error states, workflow guards, and concurrency explicit', () => {
    expect(api.datasources[0].permission).toBe('recruitment.manage');
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    for (const id of ['create_recruitment_activity_plan', 'edit_recruitment_activity_plan', 'archive_recruitment_activity_plan', 'restore_recruitment_activity_plan', 'delete_recruitment_activity_plan']) {
      expect(action(id).permission, id).toBe('recruitment.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_recruitment_activity_plan').mutation.concurrency.required).toBe(true);
    expect(action('archive_recruitment_activity_plan').mutation.concurrency.required).toBe(true);
    expect(action('restore_recruitment_activity_plan').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_activity_plan').mutation.concurrency.required).toBe(true);
  });
});
