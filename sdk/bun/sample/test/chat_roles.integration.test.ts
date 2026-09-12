import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`api/${file}`).actions.find((candidate: any) => candidate.id === id);

describe('Discuss Roles parity', () => {
  test('maps Odoo res_role_action and keeps page/API fragments joined by page.id', () => {
    const page = yaml('pages/roles.yaml');
    const detail = yaml('pages/role-detail.yaml');
    const api = yaml('api/roles.yaml');
    const detailApi = yaml('api/role-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'chat-roles', route: '/chat/roles', auth: { require: ['chat.read'] } });
    expect(detail.page).toMatchObject({ id: 'chat-role-detail', route: '/chat/roles/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(page.components[0].search).toMatchObject({ label: 'Roles Search' });
    expect(page.components[0].filters[0]).toMatchObject({ field: 'my_role', label: 'My Roles' });
    expect(page.components[0].group_by[0]).toMatchObject({ field: 'user_names', label: 'Users' });
    expect(discovered.pageDatasources.get('chat-roles')).toContain('chat_roles');
    expect(discovered.pageDatasources.get('chat-role-detail')).toContain('chat_role_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/chat/roles', page: 'chat-roles', module: 'chat' }),
      expect.objectContaining({ path: '/chat/roles/detail', page: 'chat-role-detail', module: 'chat' }),
    ]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/chat/roles', label: 'Roles', icon: 'users', permission: 'chat.read' });
  });

  test('seeds deterministic roles and supports search, My Roles, create, update, and delete guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_roles_test', ['schema', 'data']);
    const source = yaml('api/roles.yaml').datasources[0];
    const defaultRows = await repository.querySource(source, { q: null, my_role: null, current_user_id: 'user-admin', fixture_state: null }, 0, 50);
    expect(defaultRows.data.map((row: any) => row.name)).toEqual(['Operations Team', 'Support Team']);
    expect((await repository.querySource(source, { q: 'support', my_role: null, current_user_id: 'user-admin', fixture_state: null }, 0, 50)).data[0])
      .toMatchObject({ name: 'Support Team', my_role: true });
    expect((await repository.querySource(source, { q: null, my_role: 'true', current_user_id: 'user-admin', fixture_state: null }, 0, 50)).data)
      .toHaveLength(1);
    expect((await repository.querySource(source, { q: null, my_role: null, current_user_id: 'user-admin', fixture_state: 'empty' }, 0, 50)).data)
      .toEqual([]);

    const create = action('roles.yaml', 'create_chat_role');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Incident Team', user_ids: 'user-admin', user_names: 'Admin User' } });
    expect(created).toMatchObject({ name: 'Incident Team', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'support team' } }))
      .rejects.toMatchObject({ status: 409, code: 'CHAT_ROLE_NAME_EXISTS' });

    const save = action('role-detail.yaml', 'save_chat_role');
    const updated = await repository.executeMutation(save.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Incident Response', user_ids: 'user-disp', user_names: 'Dispatcher User' } });
    expect(updated).toMatchObject({ name: 'Incident Response', row_version: 2 });
    await expect(repository.executeMutation(save.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } }))
      .rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(save.mutation, { id: 'missing-chat-role', expected_row_version: 1, values: { name: 'Missing' } }))
      .rejects.toMatchObject({ status: 404, code: 'CHAT_ROLE_NOT_FOUND' });

    const remove = action('roles.yaml', 'delete_chat_role');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 404, code: 'CHAT_ROLE_NOT_FOUND' });
  });

  test('keeps role reads and writes behind separate Chat permissions', () => {
    expect(yaml('api/roles.yaml').datasources[0].permission).toBe('chat.read');
    for (const id of ['create_chat_role', 'delete_chat_role']) expect(action('roles.yaml', id).permission).toBe('chat.write');
    expect(action('role-detail.yaml', 'save_chat_role').permission).toBe('chat.write');
    expect(yaml('api/role-detail.yaml').datasources[0].permission).toBe('chat.read');
  });
});
