import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/canned-responses.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Discuss canned responses parity batch', () => {
  test('keeps list/detail pages layout-only and joins each API fragment by page.id', () => {
    const listPage = yaml('pages/canned-responses.yaml');
    const detailPage = yaml('pages/canned-response-detail.yaml');
    const listApi = yaml('api/canned-responses.yaml');
    const detailApi = yaml('api/canned-response-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.page.id).toBe('chat-canned-responses');
    expect(detailPage.page.id).toBe('canned-response-detail');
    expect(listPage.page.auth.require).toEqual(['chat.read']);
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form']);
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('chat-canned-responses')).toContain('chat_canned_responses');
    expect(discovered.pageDatasources.get('canned-response-detail')).toContain('chat_canned_response_detail');
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/chat/canned-responses', permission: 'chat.read' })]));
  });

  test('supports deterministic search, visibility, empty state, CRUD, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'chat_canned_response_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'chat_canned_response_test_migrations', ['schema', 'data']);

    const source = yaml('api/canned-responses.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, visibility: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.shortcut))
      .toEqual(['::bye', '::hello']);
    expect((await repository.querySource(source, { q: 'missing', visibility: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, visibility: 'private', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, visibility: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_canned_response');
    const created = await repository.executeMutation(create.mutation, { values: { source: 'follow-up', substitution: 'I will follow up shortly.', authorized_groups: '', is_shared: false } });
    expect(created).toMatchObject({ id: 'chat-canned-follow-up', source: 'follow-up', is_shared: false });
    await expect(repository.executeMutation(create.mutation, { values: { source: 'follow-up', substitution: 'Duplicate' } }))
      .rejects.toMatchObject({ status: 409, code: 'CHAT_CANNED_RESPONSE_SHORTCUT_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { source: 'bad shortcut', substitution: 'Invalid' } }))
      .rejects.toMatchObject({ status: 422, code: 'CHAT_CANNED_RESPONSE_SHORTCUT_INVALID' });

    const edit = action('edit_canned_response');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { source: 'follow-up', substitution: 'I will follow up today.', authorized_groups: 'Role / User', is_shared: true } });
    expect(edited).toMatchObject({ substitution: 'I will follow up today.', is_shared: true });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { source: 'follow-up', substitution: 'Stale edit' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const remove = action('delete_canned_response');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'follow-up', visibility: null, fixture_state: null }, 0, 50)).data).toEqual([]);
  });

  test('keeps read/write permissions and transport error contracts explicit', () => {
    const api = yaml('api/canned-responses.yaml');
    expect(api.datasources[0].permission).toBe('chat.read');
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'CHAT_CANNED_RESPONSES_UNAVAILABLE' });
    for (const id of ['create_canned_response', 'edit_canned_response', 'delete_canned_response']) {
      expect(action(id).permission, id).toBe('chat.write');
      expect(action(id).mutation, id).toBeDefined();
    }
    const migration = readFileSync(join(serviceRoot, 'migrations/20260910190000-007-chat-canned-responses.yaml'), 'utf8');
    expect(migration).not.toMatch(/CURRENT_TIMESTAMP|gen_random_uuid|random_uuid/i);
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['chat.read', 'chat.write']));
  });
});
