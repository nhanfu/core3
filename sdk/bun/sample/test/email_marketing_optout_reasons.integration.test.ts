import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => [yaml('api/optout-reasons.yaml'), yaml('api/optout-reason-detail.yaml')]
  .flatMap((api: any) => api.actions ?? []).find((candidate: any) => candidate.id === id);

describe('Email Marketing opt-out reasons parity action', () => {
  test('keeps the page layout-only and joins API fragments by page.id', () => {
    const listPage = yaml('pages/optout-reasons.yaml');
    const detailPage = yaml('pages/email-optout-reason-detail.yaml');
    const listApi = yaml('api/optout-reasons.yaml');
    const detailApi = yaml('api/optout-reason-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.page.id).toBe('email-optout-reasons');
    expect(detailPage.page.id).toBe('email-optout-reason-detail');
    expect(listPage.page.auth.require).toEqual(['email_marketing.manage']);
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('email-optout-reasons')).toContain('email_optout_reasons');
    expect(discovered.pageDatasources.get('email-optout-reason-detail')).toContain('email_optout_reason_detail');
    expect(yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/email-optout-reasons', permission: 'email_marketing.manage' })]));
  });

  test('supports deterministic search, empty state, CRUD, duplicate, validation, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_optout_reason_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_optout_reason_test_migrations', ['schema', 'data']);

    const source = yaml('api/optout-reasons.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => row.name)).toEqual([
      'I never subscribed to this list',
      'I changed my mind',
      'I receive too many emails from this list',
      'The content of these emails is not relevant to me',
      'Other',
    ]);
    expect((await repository.querySource(source, { q: 'changed', fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['email-optout-changed-mind']);
    expect((await repository.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_email_optout_reason');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Quarterly digest', sequence: 5, is_feedback: true } });
    expect(created).toMatchObject({ id: 'email-optout-quarterly-digest', name: 'Quarterly digest', sequence: 5, is_feedback: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'quarterly DIGEST' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_OPTOUT_REASON_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_OPTOUT_REASON_NAME_REQUIRED' });

    const edit = action('edit_email_optout_reason');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Quarterly digest', sequence: 6, is_feedback: false } });
    expect(edited).toMatchObject({ name: 'Quarterly digest', sequence: 6, is_feedback: false, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await expect(repository.executeMutation(edit.mutation, { id: 'email-optout-missing', expected_row_version: 1, values: { name: 'Missing' } }))
      .rejects.toMatchObject({ status: 404, code: 'EMAIL_OPTOUT_REASON_NOT_FOUND' });
    const remove = action('delete_email_optout_reason');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'Quarterly', fixture_state: null }, 0, 50)).data).toEqual([]);
  });

  test('keeps permissions and transport error contracts explicit and deterministic', () => {
    const api = yaml('api/optout-reasons.yaml');
    const detailApi = yaml('api/optout-reason-detail.yaml');
    expect(api.datasources[0].permission).toBe('email_marketing.manage');
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMAIL_OPTOUT_REASONS_UNAVAILABLE' });
    expect(detailApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMAIL_OPTOUT_REASON_UNAVAILABLE' });
    for (const id of ['create_email_optout_reason', 'create_email_optout_reason_inline', 'edit_email_optout_reason', 'update_email_optout_reason_inline', 'edit_email_optout_reason_detail', 'delete_email_optout_reason']) {
      expect(action(id), id).toBeDefined();
      expect(action(id).permission, id).toBe('email_marketing.manage');
      expect(action(id).mutation, id).toBeDefined();
    }
    const migration = readFileSync(join(serviceRoot, 'migrations/20260910250000-003-email-optout-reasons.yaml'), 'utf8');
    expect(migration).not.toMatch(/CURRENT_TIMESTAMP|gen_random_uuid|random_uuid/i);
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['email_marketing.read', 'email_marketing.write', 'email_marketing.manage']));
  });
});
