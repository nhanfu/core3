import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/tags.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Live Chat conversation tags parity', () => {
  test('keeps list/detail presentation separate and joins API fragments by page.id', () => {
    const listPage = yaml('pages/tags.yaml');
    const detailPage = yaml('pages/tag-detail.yaml');
    const listApi = yaml('api/tags.yaml');
    const detailApi = yaml('api/tag-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'livechat-tags', route: '/livechat/tags' });
    expect(detailPage.page).toMatchObject({ id: 'tag-detail', route: '/livechat/tags/detail' });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('livechat-tags')).toContain('livechat_tags');
    expect(discovered.pageDatasources.get('tag-detail')).toContain('livechat_tag_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/tags', page: 'livechat-tags', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/tags/detail', page: 'tag-detail', module: 'livechat' }),
    ]));
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/livechat/tags', label: 'Tags', icon: 'tag', permission: 'livechat.read' });
  });

  test('seeds deterministic tags and supports search, empty state, CRUD, duplicate, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_tags_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_tags_test_migrations', ['schema', 'data']);

    const source = yaml('api/tags.yaml').datasources.find((item: any) => item.id === 'livechat_tags');
    const rows = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Billing', 'Follow-up', 'Urgent', 'VIP']);
    expect(rows.data.find((row: any) => row.name === 'Urgent')).toMatchObject({ id: 'livechat-tag-urgent', color: 2, row_version: 1 });
    expect((await repository.querySource(source, { q: 'billing', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Billing']);
    expect((await repository.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);

    const create = action('create_livechat_tag');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Escalated', color: 9 } });
    expect(created).toMatchObject({ name: 'Escalated', color: 9, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'escalated', color: 3 } }))
      .rejects.toMatchObject({ status: 409, code: 'LIVECHAT_TAG_NAME_EXISTS' });

    const edit = action('edit_livechat_tag');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Escalated Customer', color: 8 } });
    expect(edited).toMatchObject({ name: 'Escalated Customer', color: 8, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Tag', color: 1 } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const detail = yaml('api/tag-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: created.id, fixture_state: null }, 0, 1)).toMatchObject({ data: { id: created.id, name: 'Escalated Customer', color: 8 } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-tag', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });

    await repository.executeMutation(action('delete_livechat_tag').mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'Escalated', fixture_state: null }, 0, 50)).data).toEqual([]);
  });

  test('keeps permissions, error contracts, and mutation concurrency explicit', () => {
    const list = yaml('pages/tags.yaml').components[0];
    const detail = yaml('pages/tag-detail.yaml').components[0];
    const api = yaml('api/tags.yaml');
    expect(list.inline_edit).toMatchObject({ create_action: 'create_livechat_tag', update_action: 'edit_livechat_tag' });
    expect(list.inline_edit.fields.map((field: any) => field.field)).toEqual(['name', 'color']);
    expect(list.columns.find((column: any) => column.field === 'color')).toMatchObject({ type: 'ColorCell' });
    expect(detail.header_actions.map((item: any) => item.id)).toEqual(['back_to_livechat_tags', 'edit_livechat_tag', 'delete_livechat_tag']);
    expect(api.datasources.find((item: any) => item.id === 'livechat_tags')).toMatchObject({ permission: 'livechat.read', error_states: { transport_error: { status: 503, code: 'LIVECHAT_TAGS_UNAVAILABLE' } } });
    for (const id of ['create_livechat_tag', 'edit_livechat_tag', 'delete_livechat_tag']) {
      expect(action(id).permission, id).toBe('livechat.write');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
      expect(action(id).mutation.concurrency?.required !== false, id).toBe(true);
    }
    expect(action('edit_livechat_tag').mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 }), expect.objectContaining({ status: 409 })]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['livechat.read', 'livechat.write']));
  });
});
