import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/refuse-reasons.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Refuse Reasons parity action', () => {
  test('joins the Odoo list/form page and API by page.id', () => {
    const page = yaml('pages/refuse-reasons.yaml');
    const api = yaml('api/refuse-reasons.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'recruitment-refuse-reasons', route: '/recruitment/refuse-reasons', auth: { require: ['recruitment.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pages.get('recruitment-refuse-reasons')?.config.page.id).toBe('recruitment-refuse-reasons');
    expect(discovered.pageDatasources.get('recruitment-refuse-reasons')).toContain('recruitment_refuse_reasons');
    expect(page.components[0]).toMatchObject({ source: 'recruitment_refuse_reasons', create_action: 'create_recruitment_refuse_reason', row_open_action: 'edit_recruitment_refuse_reason' });
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['sequence', 'name', 'template_name', 'active_label', 'id']);
    expect(action('create_recruitment_refuse_reason').fields.map((field: any) => field.field)).toEqual(['name', 'template_name', 'sequence']);
    expect(action('edit_recruitment_refuse_reason').fields.map((field: any) => field.field)).toEqual(['name', 'template_name', 'sequence']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/recruitment/refuse-reasons', label: 'Refuse Reasons', permission: 'recruitment.manage' })]));
  });

  test('seeds Odoo reasons and supports search, empty, CRUD, validation, archive, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_refuse_reason_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_refuse_reason_test_migrations', ['schema', 'data']);

    const source = yaml('api/refuse-reasons.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Refused by applicant: salary', 'Refused by applicant: job fit', 'Does not fit the job requirements', 'Job already fulfilled', 'Duplicate', 'Spam']);
    expect((await repository.querySource(source, { q: 'salary', active: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Refused by applicant: salary', template_name: 'Recruitment: Not interested anymore' }]);
    expect((await repository.querySource(source, { q: 'No such reason', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Legacy archived reason', active: false }]);

    const create = action('create_recruitment_refuse_reason');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Not eligible for relocation', template_name: 'Recruitment: Refuse', sequence: 20, active: true } });
    expect(created).toMatchObject({ id: 'refuse-reason-custom-not-eligible-for-relocation', name: 'Not eligible for relocation', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'not eligible for relocation', sequence: 21 } }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_REFUSE_REASON_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ', sequence: 21 } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_REFUSE_REASON_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad sequence', sequence: 0 } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_REFUSE_REASON_SEQUENCE_INVALID' });

    const edit = action('edit_recruitment_refuse_reason');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Not eligible for relocation updated', template_name: 'Recruitment: Not interested anymore', sequence: 21, active: true } });
    expect(edited).toMatchObject({ name: 'Not eligible for relocation updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale reason', sequence: 22 } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-refuse-reason', expected_row_version: 1, values: { name: 'Missing', sequence: 22 } }))
      .rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_REFUSE_REASON_NOT_FOUND' });

    const archive = action('archive_recruitment_refuse_reason');
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(source, { q: 'Not eligible', active: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([{ active: false, row_version: 3 }]);
    const restore = action('restore_recruitment_refuse_reason');
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    const remove = action('delete_recruitment_refuse_reason');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 }))
      .rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_REFUSE_REASON_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, { id: 'refuse-reason-duplicate', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_REFUSE_REASON_IN_USE' });
  });

  test('links refused applicants to active reasons through the guarded refusal form', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_refuse_reason_applicant_test_migrations', ['schema', 'data']);
    const detail = yaml('api/applicant-detail.yaml');
    const record = await repository.querySource(detail.datasources[0], { id: 'applicant-demo-004', fixture_state: null }, 0, 1);
    expect(record.data).toMatchObject({ stage: 'Rejected', archived: true, refuse_reason_id: 'refuse-reason-duplicate', refuse_reason_name: 'Duplicate', refused_date: '2026-01-15' });
    expect(detail.datasources.find((source: any) => source.id === 'recruitment_applicant_refuse_reason_lookup').permission).toBe('recruitment.read');
    const refuse = detail.actions.find((candidate: any) => candidate.id === 'reject_applicant_detail');
    expect(refuse).toMatchObject({ type: 'server_form', permission: 'recruitment.manage', operation: 'refuse' });
    const refused = await repository.executeMutation(refuse.mutation, { id: 'applicant-demo-002', expected_row_version: 1, values: { refuse_reason_id: 'refuse-reason-spam' } });
    expect(refused).toMatchObject({ stage: 'Rejected', archived: true, refuse_reason_id: 'refuse-reason-spam', row_version: 2 });
    await expect(repository.executeMutation(refuse.mutation, { id: 'applicant-demo-003', expected_row_version: 1, values: { refuse_reason_id: 'missing-refuse-reason' } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_REFUSE_REASON_INVALID' });
    await expect(repository.executeMutation(refuse.mutation, { id: 'applicant-demo-002', expected_row_version: 1, values: { refuse_reason_id: 'refuse-reason-spam' } }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_REFUSE_STALE' });
  });

  test('keeps every catalog and refusal mutation manager-only with transport/error contracts', () => {
    const api = yaml('api/refuse-reasons.yaml');
    expect(api.datasources[0].permission).toBe('recruitment.manage');
    expect(api.datasources[0].error_states).toMatchObject({ forbidden: { status: 403 }, transport_error: { status: 503 } });
    for (const id of ['create_recruitment_refuse_reason', 'edit_recruitment_refuse_reason', 'archive_recruitment_refuse_reason', 'restore_recruitment_refuse_reason', 'delete_recruitment_refuse_reason']) {
      expect(action(id).permission, id).toBe('recruitment.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_recruitment_refuse_reason').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_refuse_reason').mutation.concurrency.required).toBe(true);
    expect(yaml('pages/refuse-reasons.yaml').page.auth.require).toEqual(['recruitment.manage']);
  });
});
