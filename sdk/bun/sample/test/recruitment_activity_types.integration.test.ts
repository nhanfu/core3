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
const api = yaml('api/activity-types.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Activity Types parity action', () => {
  test('joins the Odoo Activity Types list, kanban, and form contract by page.id', () => {
    const page = yaml('pages/activity-types.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'recruitment-activity-types', route: '/recruitment/activity-types', auth: { require: ['recruitment.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pages.get('recruitment-activity-types')?.config.page.id).toBe('recruitment-activity-types');
    expect(discovered.pageDatasources.get('recruitment-activity-types')).toEqual(['recruitment_activity_types']);
    expect(page.components[0]).toMatchObject({ source: 'recruitment_activity_types', create_action: 'create_recruitment_activity_type', row_open_action: 'edit_recruitment_activity_type', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['sequence', 'name', 'summary', 'delay_label', 'delay_from_label', 'res_model_label', 'active', 'id']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/recruitment/activity-types', label: 'Activity Types', permission: 'recruitment.read' })]));
  });

  test('seeds deterministic applicant-scoped types and guards search, archive/restore, CRUD, chaining, in-use, and stale state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_activity_types_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_activity_types_test_migrations', ['schema', 'data']);
    const source = api.datasources[0];

    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Email', 'Call', 'Interview', 'To Do']);
    expect((await repository.querySource(source, { q: 'interview', active: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Interview', delay_label: '5 days', res_model_label: 'Applicants' }]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Upload Document']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_recruitment_activity_type');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Reference Check', summary: 'Verify references', category: 'default', default_user: 'Recruitment Officer', delay_count: 3, delay_unit: 'days', delay_from: 'previous_activity', res_model: 'hr.applicant', chaining_type: 'suggest', triggered_next_activity: '', suggested_next_activities: 'Offer', default_note: '', active: true } });
    expect(created).toMatchObject({ name: 'Reference Check', delay_count: 3, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'reference check', delay_count: 1, delay_unit: 'days', delay_from: 'previous_activity', category: 'default', chaining_type: 'suggest', triggered_next_activity: '', suggested_next_activities: '' } }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_ACTIVITY_TYPE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Broken', delay_count: 1, delay_unit: 'days', delay_from: 'previous_activity', category: 'default', chaining_type: 'trigger', triggered_next_activity: '', suggested_next_activities: '' } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_ACTIVITY_TYPE_CHAIN_INVALID' });

    const edit = action('edit_recruitment_activity_type');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Reference Check Updated', summary: 'Verify references', category: 'default', default_user: 'Recruitment Officer', delay_count: 4, delay_unit: 'days', delay_from: 'previous_activity', res_model: 'hr.applicant', chaining_type: 'suggest', triggered_next_activity: '', suggested_next_activities: 'Offer', default_note: '' } });
    expect(edited).toMatchObject({ name: 'Reference Check Updated', delay_count: 4, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit', delay_count: 4, delay_unit: 'days', delay_from: 'previous_activity', category: 'default', chaining_type: 'suggest', triggered_next_activity: '', suggested_next_activities: '' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archive = action('archive_recruitment_activity_type');
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(source, { q: 'Reference Check Updated', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    const restore = action('restore_recruitment_activity_type');
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect((await repository.querySource(source, { q: 'Reference Check Updated', active: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);

    await expect(repository.executeMutation(action('delete_recruitment_activity_type').mutation, { id: 'activity-type-email', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_ACTIVITY_TYPE_IN_USE' });
    await repository.executeMutation(action('delete_recruitment_activity_type').mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(action('delete_recruitment_activity_type').mutation, { id: 'missing-activity-type', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_ACTIVITY_TYPE_NOT_FOUND' });
    database.close();
  });

  test('persists activity type state across a file-backed database restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-recruitment-activity-types-'));
    const databasePath = join(directory, 'activity-types.duckdb');
    const migrationName = `recruitment_activity_types_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database = await DuckDbDatabase.open(databasePath);
    let repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await repository.executeMutation(action('archive_recruitment_activity_type').mutation, { id: 'activity-type-call', expected_row_version: 1, values: { active: false } });
    database.close();

    database = await DuckDbDatabase.open(databasePath);
    repository = new YamlRepository(database);
    const source = api.datasources[0];
    expect((await repository.querySource(source, { q: 'Call', active: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Call', active: false, row_version: 2 }]);
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('keeps read and write permissions, error states, and guarded mutations explicit', () => {
    expect(api.datasources[0].permission).toBe('recruitment.read');
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    for (const id of ['create_recruitment_activity_type', 'edit_recruitment_activity_type', 'archive_recruitment_activity_type', 'restore_recruitment_activity_type', 'delete_recruitment_activity_type']) {
      expect(action(id).permission, id).toBe('recruitment.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_recruitment_activity_type').mutation.concurrency.required).toBe(true);
    expect(action('archive_recruitment_activity_type').mutation.concurrency.required).toBe(true);
    expect(action('restore_recruitment_activity_type').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_activity_type').mutation.concurrency.required).toBe(true);
  });
});
