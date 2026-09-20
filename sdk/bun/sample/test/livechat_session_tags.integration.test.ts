import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/session-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Live Chat conversation tag assignment', () => {
  test('joins the session detail page/API and preserves the Odoo update-tags route contract', () => {
    const page = yaml('pages/session-detail.yaml');
    const api = yaml('api/session-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('livechat-session-detail');
    expect(page.components[0].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'tag_names', label: 'Conversation Tags' }),
    ]));
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining([
      'livechat_session_detail', 'livechat_session_tag_options', 'livechat_session_tags',
    ]));
    for (const [id, method] of [['add_livechat_session_tag', 'ADD'], ['remove_livechat_session_tag', 'DELETE']]) {
      expect(action(id), id).toMatchObject({
        type: 'server_form', permission: 'livechat.write', action: '/im_livechat/conversation/update_tags',
        params: { method },
      });
      expect(action(id).fields).toEqual([
        { field: 'tag_id', label: 'Tag', type: 'select', options_source: 'livechat_session_tag_options', required: true },
      ]);
      expect(action(id).mutation.guards).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE', status: 403 }),
        expect.objectContaining({ code: 'LIVECHAT_SESSION_TAG_STALE', status: 409 }),
      ]));
    }
  });

  test('seeds idempotent assignments and exposes selected tag options and detail names', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_session_tags_seed_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_session_tags_seed_test', ['schema', 'data']);

    const detail = yaml('api/session-detail.yaml').datasources.find((source: any) => source.id === 'livechat_session_detail');
    const options = yaml('api/session-detail.yaml').datasources.find((source: any) => source.id === 'livechat_session_tag_options');
    const tags = yaml('api/session-detail.yaml').datasources.find((source: any) => source.id === 'livechat_session_tags');
    expect((await repository.querySource(detail, { id: 'livechat-session-demo-001', fixture_state: null, view_scope: 'all', current_user_id: 'livechat-agent' }, 0, 1)).data).toMatchObject({
      id: 'livechat-session-demo-001', tag_names: 'Billing, Urgent',
    });
    expect((await repository.querySource(options, { id: 'livechat-session-demo-001', fixture_state: null }, 0, 50)).data).toEqual([
      { value: 'livechat-tag-billing', id: 'livechat-tag-billing', label: 'Billing', name: 'Billing', color: 4, selected: true },
      { value: 'livechat-tag-follow-up', id: 'livechat-tag-follow-up', label: 'Follow-up', name: 'Follow-up', color: 7, selected: false },
      { value: 'livechat-tag-urgent', id: 'livechat-tag-urgent', label: 'Urgent', name: 'Urgent', color: 2, selected: true },
      { value: 'livechat-tag-vip', id: 'livechat-tag-vip', label: 'VIP', name: 'VIP', color: 10, selected: false },
    ]);
    expect((await repository.querySource(tags, { id: 'livechat-session-demo-001', fixture_state: null }, 0, 50)).data.filter((row: any) => row.selected).map((row: any) => row.name)).toEqual(['Billing', 'Urgent']);
    expect(await repository.query("SELECT COUNT(*) AS count FROM livechat_session_tag_rel")).toEqual([{ count: 3 }]);
    expect((await repository.querySource(tags, { id: 'livechat-session-demo-001', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('adds and removes tags with operator scope, optimistic guards, and atomic persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_session_tags_mutation_test', ['schema', 'data']);
    const add = action('add_livechat_session_tag');
    const remove = action('remove_livechat_session_tag');

    const added = await repository.executeMutation(add.mutation, {
      id: 'livechat-session-demo-001', tag_id: 'livechat-tag-vip', expected_row_version: 1,
      view_scope: 'assigned', current_user_id: 'livechat-agent', values: { tag_id: 'livechat-tag-vip' },
    });
    expect(added).toMatchObject({ id: 'livechat-session-demo-001' });
    expect(await repository.query('SELECT row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-001'])).toEqual([{ row_version: 2 }]);
    expect(await repository.query('SELECT session_id, tag_id FROM livechat_session_tag_rel WHERE session_id = ? ORDER BY tag_id', ['livechat-session-demo-001'])).toEqual([
      { session_id: 'livechat-session-demo-001', tag_id: 'livechat-tag-billing' },
      { session_id: 'livechat-session-demo-001', tag_id: 'livechat-tag-urgent' },
      { session_id: 'livechat-session-demo-001', tag_id: 'livechat-tag-vip' },
    ]);
    await expect(repository.executeMutation(add.mutation, {
      id: 'livechat-session-demo-001', tag_id: 'livechat-tag-vip', expected_row_version: 2,
      view_scope: 'assigned', current_user_id: 'livechat-agent', values: { tag_id: 'livechat-tag-vip' },
    })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_TAG_ALREADY_ADDED' });
    await expect(repository.executeMutation(add.mutation, {
      id: 'livechat-session-demo-001', tag_id: 'livechat-tag-follow-up', expected_row_version: 1,
      view_scope: 'assigned', current_user_id: 'livechat-agent', values: { tag_id: 'livechat-tag-follow-up' },
    })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_TAG_STALE' });
    await expect(repository.executeMutation(add.mutation, {
      id: 'livechat-session-demo-001', tag_id: 'livechat-tag-follow-up', expected_row_version: 2,
      view_scope: 'assigned', current_user_id: 'other-livechat-agent', values: { tag_id: 'livechat-tag-follow-up' },
    })).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE' });

    const removed = await repository.executeMutation(remove.mutation, {
      id: 'livechat-session-demo-001', tag_id: 'livechat-tag-billing', expected_row_version: 2,
      view_scope: 'assigned', current_user_id: 'livechat-agent', values: { tag_id: 'livechat-tag-billing' },
    });
    expect(removed).toMatchObject({ id: 'livechat-session-demo-001' });
    expect(await repository.query('SELECT row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-001'])).toEqual([{ row_version: 3 }]);
    await expect(repository.executeMutation(remove.mutation, {
      id: 'livechat-session-demo-001', tag_id: 'livechat-tag-billing', expected_row_version: 3,
      view_scope: 'assigned', current_user_id: 'livechat-agent', values: { tag_id: 'livechat-tag-billing' },
    })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_TAG_NOT_ASSIGNED' });
    expect(await repository.query('SELECT tag_id FROM livechat_session_tag_rel WHERE session_id = ? ORDER BY tag_id', ['livechat-session-demo-001'])).toEqual([
      { tag_id: 'livechat-tag-urgent' },
      { tag_id: 'livechat-tag-vip' },
    ]);
    database.close();
  });

  test('retains conversation tags across a file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-livechat-session-tags-${crypto.randomUUID()}.duckdb`;
    const migrationName = `livechat_session_tags_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action('add_livechat_session_tag').mutation, {
        id: 'livechat-session-demo-002', tag_id: 'livechat-tag-vip', expected_row_version: 1,
        view_scope: 'assigned', current_user_id: 'livechat-agent', values: { tag_id: 'livechat-tag-vip' },
      });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT tag_id FROM livechat_session_tag_rel WHERE session_id = ?', ['livechat-session-demo-002'])).toEqual([{ tag_id: 'livechat-tag-vip' }]);
      expect(await secondRepository.query('SELECT row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-002'])).toEqual([{ row_version: 2 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
