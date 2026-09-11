import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apis = () => [yaml('api/blacklist.yaml'), yaml('api/blacklist-detail.yaml')];
const action = (id: string) => apis().flatMap((api: any) => api.actions ?? []).find((candidate: any) => candidate.id === id);

describe('Email Marketing blacklisted email addresses parity action', () => {
  test('keeps page and API contracts separate and exposes the source menu action', () => {
    const listPage = yaml('pages/blacklist.yaml');
    const detailPage = yaml('pages/email-blacklist-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.page).toMatchObject({ id: 'email-blacklist', route: '/email-blacklist' });
    expect(detailPage.page).toMatchObject({ id: 'email-blacklist-detail', route: '/email-blacklist/detail' });
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual(['Blacklist Date', 'Email', ' ']);
    expect(yaml('api/blacklist.yaml').page.id).toBe(listPage.page.id);
    expect(yaml('api/blacklist-detail.yaml').page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('email-blacklist')).toContain('email_blacklist_records');
    expect(discovered.pageDatasources.get('email-blacklist-detail')).toContain('email_blacklist_detail');
    expect(yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/email-blacklist', label: 'Blacklisted Email Addresses' })]));
  });

  test('supports deterministic active and archived reads plus guarded CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_blacklist_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_blacklist_test_migrations', ['schema', 'data']);

    const source = yaml('api/blacklist.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.email))
      .toEqual(['legacy@example.com', 'info@example.com', 'elsa.ericson@example.com']);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.email))
      .toEqual(['legacy@example.com']);
    expect((await repository.querySource(source, { q: 'elsa', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['email-blacklist-elsa-ericson']);
    expect((await repository.querySource(source, { q: 'missing', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_email_blacklist');
    const created = await repository.executeMutation(create.mutation, { values: { email: 'blocked@example.com' } });
    expect(created).toMatchObject({ id: 'email-blacklist-blocked-example-com', email: 'blocked@example.com', active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { email: 'BLOCKED@example.com' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_BLACKLIST_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { email: 'not-an-email' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_BLACKLIST_EMAIL_INVALID' });

    const edit = action('edit_email_blacklist');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { email: 'blocked-again@example.com' } });
    expect(edited).toMatchObject({ email: 'blocked-again@example.com', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { email: 'stale@example.com' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const remove = action('unblacklist_email_detail');
    const unblacklisted = await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(unblacklisted).toMatchObject({ active: false, row_version: 3 });
    const restore = action('blacklist_email_detail');
    const blacklisted = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(blacklisted).toMatchObject({ active: true, row_version: 4 });

    const detail = yaml('api/blacklist-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: created.id, fixture_state: null }, 0, 1)).data).toMatchObject({ email: 'blocked-again@example.com', active: true });
    await expect(repository.executeMutation(edit.mutation, { id: 'email-blacklist-missing', expected_row_version: 1, values: { email: 'missing@example.com' } }))
      .rejects.toMatchObject({ status: 404, code: 'EMAIL_BLACKLIST_NOT_FOUND' });
  });

  test('keeps read/write permissions and transport contracts explicit', () => {
    const api = yaml('api/blacklist.yaml');
    const detailApi = yaml('api/blacklist-detail.yaml');
    expect(api.datasources[0].permission).toBe('email_marketing.read');
    expect(detailApi.datasources[0].permission).toBe('email_marketing.read');
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMAIL_BLACKLIST_UNAVAILABLE' });
    expect(detailApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMAIL_BLACKLIST_DETAIL_UNAVAILABLE' });
    for (const id of ['create_email_blacklist', 'edit_email_blacklist', 'blacklist_email_detail', 'unblacklist_email_detail', 'delete_email_blacklist']) {
      expect(action(id), id).toBeDefined();
      expect(action(id).permission, id).toBe('email_marketing.write');
      expect(action(id).mutation, id).toBeDefined();
    }
  });
});
