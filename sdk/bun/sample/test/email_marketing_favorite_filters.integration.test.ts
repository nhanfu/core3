import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiFiles = ['api/favorite-filters.yaml', 'api/favorite-filter-detail.yaml'];
const action = (id: string) => apiFiles.map(yaml).flatMap((api: any) => api.actions ?? []).find((candidate: any) => candidate.id === id);

describe('Email Marketing Favorite Filters parity action', () => {
  test('keeps layout and API fragments separate and joins them by page.id', () => {
    const listPage = yaml('pages/favorite-filters.yaml');
    const detailPage = yaml('pages/favorite-filter-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.page.id).toBe('email-favorite-filters');
    expect(detailPage.page.id).toBe('favorite-filter-detail');
    expect(listPage.page.auth.require).toEqual(['email_marketing.read']);
    expect(listPage.components[0].default_filters).toEqual({ saved_by_me: 'true' });
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(yaml('api/favorite-filters.yaml').page.id).toBe(listPage.page.id);
    expect(yaml('api/favorite-filter-detail.yaml').page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('email-favorite-filters')).toContain('email_favorite_filters');
    expect(discovered.pageDatasources.get('favorite-filter-detail')).toContain('email_favorite_filter_detail');
    expect(yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/email-favorite-filters', permission: 'email_marketing.read' })]));
  });

  test('seeds deterministic filters, supports search/group filters, and is idempotent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_favorite_filters_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_favorite_filters_test_migrations', ['schema', 'data']);
    const source = yaml('api/favorite-filters.yaml').datasources.find((candidate: any) => candidate.id === 'email_favorite_filters');

    expect((await repository.querySource(source, { q: null, saved_by_me: null, recipient_model: null, fixture_state: null }, 0, 50)).data)
      .toMatchObject([
        { id: 'email-filter-account-managers', saved_by_me: false, recipient_model: 'res.users' },
        { id: 'email-filter-active-newsletter', saved_by_me: true, recipient_model: 'res.partner' },
        { id: 'email-filter-bounced-mailing-contacts', recipient_model: 'mailing.contact' },
        { id: 'email-filter-vip-contacts', recipient_model: 'res.partner' },
      ]);
    expect((await repository.querySource(source, { q: null, saved_by_me: 'true', recipient_model: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['email-filter-active-newsletter', 'email-filter-bounced-mailing-contacts', 'email-filter-vip-contacts']);
    expect((await repository.querySource(source, { q: 'bounced', saved_by_me: null, recipient_model: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['email-filter-bounced-mailing-contacts']);
    expect((await repository.querySource(source, { q: null, saved_by_me: null, recipient_model: 'res.partner', fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['email-filter-active-newsletter', 'email-filter-vip-contacts']);
    expect((await repository.querySource(source, { q: null, saved_by_me: null, recipient_model: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });

  test('covers create, update, delete, required/model/duplicate guards, and stale rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_favorite_filters_crud_migrations', ['schema', 'data']);

    const create = action('create_email_favorite_filter');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Quarterly contacts', recipient_model: 'res.partner', recipient_model_label: 'Contacts', mailing_domain: 'Quarterly buyers' } });
    expect(created).toMatchObject({ id: 'email-filter-quarterly-contacts', name: 'Quarterly contacts', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'quarterly CONTACTS', recipient_model: 'res.partner', mailing_domain: 'Duplicate' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_FAVORITE_FILTER_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ', recipient_model: 'res.partner', mailing_domain: 'Missing name' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_FAVORITE_FILTER_REQUIRED_FIELDS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Unsupported', recipient_model: 'crm.lead', mailing_domain: 'Invalid model' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_FAVORITE_FILTER_MODEL_UNSUPPORTED' });

    const edit = action('edit_email_favorite_filter');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Quarterly contacts', recipient_model: 'mailing.contact', recipient_model_label: 'Mailing Contacts', mailing_domain: 'Subscribed quarterly contacts' } });
    expect(edited).toMatchObject({ recipient_model: 'mailing.contact', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit', recipient_model: 'res.partner', mailing_domain: 'Stale' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'email-filter-missing', expected_row_version: 1, values: { name: 'Missing', recipient_model: 'res.partner', mailing_domain: 'Missing' } }))
      .rejects.toMatchObject({ status: 404, code: 'EMAIL_FAVORITE_FILTER_NOT_FOUND' });

    await repository.executeMutation(action('delete_email_favorite_filter').mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(yaml('api/favorite-filters.yaml').datasources.find((candidate: any) => candidate.id === 'email_favorite_filters'), { q: 'Quarterly', saved_by_me: null, recipient_model: null, fixture_state: null }, 0, 50)).data).toEqual([]);
  });

  test('keeps permission and transport/error boundaries explicit', () => {
    const api = yaml('api/favorite-filters.yaml');
    const detailApi = yaml('api/favorite-filter-detail.yaml');
    expect(api.datasources.find((candidate: any) => candidate.id === 'email_favorite_filters').permission).toBe('email_marketing.read');
    expect(api.datasources.find((candidate: any) => candidate.id === 'email_favorite_filters').error_states.transport_error).toMatchObject({ status: 503, code: 'EMAIL_FAVORITE_FILTERS_UNAVAILABLE' });
    expect(detailApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMAIL_FAVORITE_FILTER_UNAVAILABLE' });
    for (const id of ['create_email_favorite_filter', 'edit_email_favorite_filter', 'edit_email_favorite_filter_detail', 'delete_email_favorite_filter']) {
      expect(action(id), id).toBeDefined();
      expect(action(id).permission, id).toBe('email_marketing.write');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(api.actions.some((candidate: any) => candidate.id === 'send_email_favorite_filter')).toBe(false);
    expect(readFileSync(join(serviceRoot, 'migrations/20260911160000-013-email-favorite-filters.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['email_marketing.read', 'email_marketing.write', 'email_marketing.manage']));
  });
});
