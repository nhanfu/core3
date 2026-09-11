import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/job-platforms.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Job Boards Emails parity action', () => {
  test('joins the Odoo Emails list/form page and API by page.id', () => {
    const page = yaml('pages/job-platforms.yaml');
    const api = yaml('api/job-platforms.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'recruitment-job-platforms', route: '/recruitment/emails', auth: { require: ['recruitment.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pages.get('recruitment-job-platforms')?.config.page.id).toBe('recruitment-job-platforms');
    expect(discovered.pageDatasources.get('recruitment-job-platforms')).toEqual(['recruitment_job_platforms']);
    expect(page.components[0]).toMatchObject({ source: 'recruitment_job_platforms', create_action: 'create_recruitment_job_platform', row_open_action: 'edit_recruitment_job_platform' });
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['name', 'email', 'regex', 'id']);
    expect(action('create_recruitment_job_platform').fields.map((field: any) => field.field)).toEqual(['name', 'regex', 'email']);
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/recruitment/emails', label: 'Emails', icon: 'mail', permission: 'recruitment.manage' });
  });

  test('seeds fixed Odoo platforms and supports search, empty, CRUD, validation, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_job_platform_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_job_platform_test_migrations', ['schema', 'data']);

    const source = yaml('api/job-platforms.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data)
      .toMatchObject([
        { name: 'Indeed', email: 'no-reply@indeed.com', regex: '^([^ ]+ [^ ]+)' },
        { name: 'Jobsdb', email: 'cs@jobsdb.com', regex: 'from (.+?) for' },
        { name: 'Linkedin', email: 'jobs-listings@linkedin.com', regex: 'New application:.*from (.*)' },
      ]);
    expect((await repository.querySource(source, { q: 'linkedin', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Linkedin' }]);
    expect((await repository.querySource(source, { q: 'No such board', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'RECRUITMENT_JOB_PLATFORMS_UNAVAILABLE' });

    const create = action('create_recruitment_job_platform');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Workable', email: 'alerts@workable.example', regex: 'Application: (.*)' } });
    expect(created).toMatchObject({ id: 'job-platform-custom-workable', name: 'Workable', email: 'alerts@workable.example', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Duplicate', email: 'ALERTS@WORKABLE.EXAMPLE', regex: '' } }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_JOB_PLATFORM_EMAIL_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid', email: 'not-an-email', regex: '' } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_JOB_PLATFORM_EMAIL_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ', email: 'blank@example.com', regex: '' } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_JOB_PLATFORM_NAME_REQUIRED' });

    const edit = action('edit_recruitment_job_platform');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Workable Updated', email: 'rules@workable.example', regex: 'Candidate: (.*)' } });
    expect(edited).toMatchObject({ name: 'Workable Updated', email: 'rules@workable.example', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', email: 'stale@example.com', regex: '' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-job-platform', expected_row_version: 1, values: { name: 'Missing', email: 'missing@example.com', regex: '' } }))
      .rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_PLATFORM_NOT_FOUND' });

    const remove = action('delete_recruitment_job_platform');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_PLATFORM_NOT_FOUND' });
  });

  test('keeps the installed manager-only action and transport/error contracts explicit', () => {
    const api = yaml('api/job-platforms.yaml');
    expect(api.datasources[0].permission).toBe('recruitment.manage');
    expect(api.datasources[0].error_states).toMatchObject({ forbidden: { status: 403 }, transport_error: { status: 503 } });
    for (const id of ['create_recruitment_job_platform', 'edit_recruitment_job_platform', 'delete_recruitment_job_platform']) {
      expect(action(id).permission, id).toBe('recruitment.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_recruitment_job_platform').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_job_platform').mutation.concurrency.required).toBe(true);
  });
});
