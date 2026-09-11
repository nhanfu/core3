import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('Live Chat Canned Responses action parity', () => {
  test('maps Odoo mail.mail_canned_response_action and joins layout/API fragments by page.id', () => {
    const page = yaml('pages/canned-responses.yaml');
    const detailPage = yaml('pages/canned-response-detail.yaml');
    const api = yaml('api/canned-responses.yaml');
    const detailApi = yaml('api/canned-response-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({
      id: 'livechat-canned-responses',
      route: '/livechat/canned-responses',
      breadcrumb: ['Website', 'Live Chat', 'Configuration', 'Canned Responses'],
      auth: { require: ['livechat.read'] },
    });
    expect(detailPage.page).toMatchObject({ id: 'livechat-canned-response-detail', route: '/livechat/canned-responses/detail' });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page).toEqual({ id: page.page.id });
    expect(detailApi.page).toEqual({ id: detailPage.page.id });
    expect(discovered.pageDatasources.get('livechat-canned-responses')).toContain('livechat_canned_responses');
    expect(discovered.pageDatasources.get('livechat-canned-response-detail')).toContain('livechat_canned_response_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/canned-responses', page: 'livechat-canned-responses', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/canned-responses/detail', page: 'livechat-canned-response-detail', module: 'livechat' }),
    ]));
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/livechat/canned-responses', label: 'Canned Responses', icon: 'message', permission: 'livechat.read' });
    expect(page.components[0]).toMatchObject({ source: 'livechat_canned_responses', create_action: 'create_livechat_canned_response', row_open_action: 'view_livechat_canned_response', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_canned_response_detail', title_field: 'source', editable: true });
  });

  test('seeds deterministic Odoo responses and covers search, visibility, empty, missing, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_canned_response_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_canned_response_test_migrations', ['schema', 'data']);

    const source = yaml('api/canned-responses.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, visibility: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.shortcut))
      .toEqual(['::hello', '::bye']);
    expect((await repository.querySource(source, { q: 'follow', visibility: null, fixture_state: 'private' }, 0, 50)).data[0])
      .toMatchObject({ shortcut: '::follow_up', is_shared: false });
    expect((await repository.querySource(source, { q: null, visibility: 'private', fixture_state: 'private' }, 0, 50)).data.map((row: any) => row.source))
      .toEqual(['follow_up']);
    expect((await repository.querySource(source, { q: 'missing', visibility: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, visibility: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, visibility: null, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, visibility: null, fixture_state: 'forbidden' }, 0, 50))
      .rejects.toMatchObject({ status: 403, code: 'LIVECHAT_CANNED_RESPONSES_FORBIDDEN' });
    await expect(repository.querySource(source, { q: null, visibility: null, fixture_state: 'transport_error' }, 0, 50))
      .rejects.toMatchObject({ status: 503, code: 'LIVECHAT_CANNED_RESPONSES_UNAVAILABLE' });

    const detail = yaml('api/canned-response-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-canned-hello', fixture_state: null }, 0, 1))
      .toMatchObject({ data: { shortcut: '::hello', substitution: 'Hello, how may I help you?' } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-canned-response', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    await expect(repository.querySource(detail, { id: 'livechat-canned-hello', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'LIVECHAT_CANNED_RESPONSE_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('supports write CRUD with validation, duplicate, missing, and optimistic guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_canned_response_mutation_test_migrations', ['schema', 'data']);

    const create = action('api/canned-responses.yaml', 'create_livechat_canned_response');
    const created = await repository.executeMutation(create.mutation, { values: { source: 'follow_up_today', substitution: 'I will follow up today.', authorized_groups: '', is_shared: false } });
    expect(created).toMatchObject({ id: 'livechat-canned-follow_up_today', source: 'follow_up_today', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { source: 'hello', substitution: 'Duplicate' } }))
      .rejects.toMatchObject({ status: 409, code: 'LIVECHAT_CANNED_RESPONSE_SHORTCUT_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { source: 'bad shortcut', substitution: 'Invalid' } }))
      .rejects.toMatchObject({ status: 422, code: 'LIVECHAT_CANNED_RESPONSE_SHORTCUT_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { source: 'empty', substitution: '   ' } }))
      .rejects.toMatchObject({ status: 422, code: 'LIVECHAT_CANNED_RESPONSE_SUBSTITUTION_REQUIRED' });

    const edit = action('api/canned-responses.yaml', 'edit_livechat_canned_response');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { source: 'follow_up_today', substitution: 'I will follow up today.', authorized_groups: 'Internal User', is_shared: true } });
    expect(edited).toMatchObject({ id: created.id, row_version: 2, is_shared: true, authorized_groups: 'Internal User' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { source: 'follow_up_today', substitution: 'Stale edit' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-livechat-canned-response', expected_row_version: 1, values: { source: 'missing', substitution: 'Missing' } }))
      .rejects.toMatchObject({ status: 404, code: 'LIVECHAT_CANNED_RESPONSE_NOT_FOUND' });

    const remove = action('api/canned-responses.yaml', 'delete_livechat_canned_response');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 404, code: 'LIVECHAT_CANNED_RESPONSE_NOT_FOUND' });
    database.close();
  });

  test('keeps read/write permissions and source readonly metadata explicit', () => {
    const api = yaml('api/canned-responses.yaml');
    const detailApi = yaml('api/canned-response-detail.yaml');
    expect(api.datasources[0]).toMatchObject({
      permission: 'livechat.read',
      error_states: {
        forbidden: { status: 403, code: 'LIVECHAT_CANNED_RESPONSES_FORBIDDEN' },
        transport_error: { status: 503, code: 'LIVECHAT_CANNED_RESPONSES_UNAVAILABLE' },
      },
    });
    expect(detailApi.datasources[0].permission).toBe('livechat.read');
    for (const id of ['create_livechat_canned_response', 'edit_livechat_canned_response', 'delete_livechat_canned_response']) {
      expect(action('api/canned-responses.yaml', id).permission, id).toBe('livechat.write');
      expect(action('api/canned-responses.yaml', id).handler, id).toBe('yaml_mutation');
    }
    expect(action('api/canned-responses.yaml', 'edit_livechat_canned_response').mutation.concurrency).toEqual({ required: true });
    expect(action('api/canned-responses.yaml', 'delete_livechat_canned_response').mutation.guards)
      .toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 })]));
    expect(yaml('pages/canned-response-detail.yaml').components[0].groups[0].fields)
      .toEqual(expect.arrayContaining([expect.objectContaining({ field: 'is_shared', readonly: true }), expect.objectContaining({ field: 'is_editable', readonly: true })]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['livechat.read', 'livechat.write']));
  });
});
