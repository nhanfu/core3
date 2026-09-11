import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/expertise.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Live Chat Expertise action parity', () => {
  test('maps Odoo action 770 and keeps page/API fragments joined by page.id', () => {
    const page = yaml('pages/expertise.yaml');
    const detailPage = yaml('pages/expertise-detail.yaml');
    const api = yaml('api/expertise.yaml');
    const detailApi = yaml('api/expertise-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'livechat-expertise', route: '/livechat/expertise', breadcrumb: ['Website', 'Live Chat', 'Configuration', 'Expertise'] });
    expect(detailPage.page).toMatchObject({ id: 'livechat-expertise-detail', route: '/livechat/expertise/detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(detailApi.page).toEqual({ id: detailPage.page.id });
    expect(discovered.pageDatasources.get('livechat-expertise')).toContain('livechat_expertises');
    expect(discovered.pageDatasources.get('livechat-expertise-detail')).toContain('livechat_expertise_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/expertise', page: 'livechat-expertise', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/expertise/detail', page: 'livechat-expertise-detail', module: 'livechat' }),
    ]));
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/livechat/expertise', label: 'Expertise', icon: 'users', permission: 'livechat.read' });
    expect(page.components[0]).toMatchObject({ source: 'livechat_expertises', create_action: 'create_livechat_expertise', row_open_action: 'edit_livechat_expertise' });
    expect(detailPage.components[0].groups[0].fields.map((field: any) => field.label)).toEqual(['Name', 'Operators']);
  });

  test('seeds deterministic expertise and exercises search, empty, CRUD, duplicate, missing, in-use, and stale paths', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_expertise_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_expertise_test_migrations', ['schema', 'data']);

    const source = yaml('api/expertise.yaml').datasources.find((item: any) => item.id === 'livechat_expertises');
    const detail = yaml('api/expertise-detail.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'livechat-expertise-discuss', name: 'Discuss', operator_names: 'Mitchell Admin', row_version: 1 }),
      expect.objectContaining({ id: 'livechat-expertise-livechat', name: 'Livechat', operator_names: 'Mitchell Admin', row_version: 1 }),
    ]);
    expect((await repository.querySource(source, { q: 'live', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Livechat']);
    expect((await repository.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detail, { id: 'livechat-expertise-discuss', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Discuss', operator_names: 'Mitchell Admin' } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-expertise', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });

    const create = action('create_livechat_expertise');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Technical Support', operator_names: 'Mitchell Admin, Maya Chen' } });
    expect(created).toMatchObject({ name: 'Technical Support', operator_names: 'Mitchell Admin, Maya Chen', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'technical support' } })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_EXPERTISE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_EXPERTISE_NAME_REQUIRED' });

    const edit = action('edit_livechat_expertise');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Technical Support', operator_names: 'Maya Chen' } });
    expect(edited).toMatchObject({ name: 'Technical Support', operator_names: 'Maya Chen', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Expertise' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-livechat-expertise', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_EXPERTISE_NOT_FOUND' });

    await expect(repository.executeMutation(action('delete_livechat_expertise').mutation, { id: 'livechat-expertise-discuss', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_EXPERTISE_IN_USE' });
    await repository.executeMutation(action('delete_livechat_expertise').mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'Technical', fixture_state: null }, 0, 50)).data).toEqual([]);
  });

  test('keeps Odoo labels, manager-only writes, and transport/permission contracts explicit', () => {
    const page = yaml('pages/expertise.yaml').components[0];
    const api = yaml('api/expertise.yaml');
    expect(page.search).toEqual({ label: 'Search', placeholder: 'Search...' });
    expect(page.columns.map((column: any) => column.label)).toEqual(['Name', 'Operators']);
    expect(api.datasources.find((item: any) => item.id === 'livechat_expertises')).toMatchObject({ permission: 'livechat.read', error_states: { transport_error: { status: 503, code: 'LIVECHAT_EXPERTISE_UNAVAILABLE' } } });
    for (const id of ['create_livechat_expertise', 'edit_livechat_expertise', 'delete_livechat_expertise']) {
      expect(action(id).permission, id).toBe('livechat.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_livechat_expertise').mutation.concurrency).toEqual({ required: true });
    expect(action('delete_livechat_expertise').mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 }), expect.objectContaining({ status: 409 })]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['livechat.read', 'livechat.manage']));
  });
});
