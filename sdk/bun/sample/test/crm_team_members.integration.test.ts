import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('CRM Teams Members action parity', () => {
  test('maps the technical standalone action to a page/API/menu contract', () => {
    const page = yaml('pages/team-members.yaml');
    const api = yaml('api/team-members.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'crm-team-members', route: '/crm/team-members', auth: { require: ['crm.manage'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('crm-team-members')).toEqual(['crm_team_members', 'crm_team_member_team_lookup']);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/crm/team-members', page: 'crm-team-members', module: 'crm' });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/crm/team-members', label: 'Teams Members', icon: 'users', permission: 'crm.manage' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'crm_team_members', create_action: 'create_crm_team_member_configuration' });
    expect(action(api, 'create_crm_team_member_configuration')).toMatchObject({ permission: 'crm.manage', operation: 'create' });
    expect(action(api, 'toggle_crm_team_member_configuration')).toMatchObject({ permission: 'crm.manage', operation: 'update' });
  });

  test('covers populated, search, active/archive, empty, duplicate, and toggle persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'crm_team_members_action_migrations', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'crm_team_members_action_migrations', ['schema', 'data']);
    const api = yaml('api/team-members.yaml');
    const source = api.datasources[0];
    expect((await repository.querySource(source, { q: null, active: 'all', fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ team_name: 'Enterprise', user_name: 'Dispatcher User', active: true }),
    ]));
    expect((await repository.querySource(source, { q: 'North', active: 'all', fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([expect.objectContaining({ team_name: 'North America' })]));
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: 'all', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: 'all', fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_TEAM_MEMBERS_FORBIDDEN' });

    const create = action(api, 'create_crm_team_member_configuration');
    const created = await repository.executeMutation(create.mutation, { values: { team_id: 'crm-team-enterprise', user_name: 'Maya Chen', active: true } });
    expect(created).toMatchObject({ team_id: 'crm-team-enterprise', user_name: 'Maya Chen', active: true });
    await expect(repository.executeMutation(create.mutation, { values: { team_id: 'crm-team-enterprise', user_name: 'maya chen', active: true } })).rejects.toMatchObject({ status: 409, code: 'CRM_TEAM_MEMBER_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { team_id: 'missing-team', user_name: 'Missing' } })).rejects.toMatchObject({ status: 422, code: 'CRM_TEAM_MEMBER_TEAM_INVALID' });
    const toggle = action(api, 'toggle_crm_team_member_configuration');
    const toggled = await repository.executeMutation(toggle.mutation, { id: created.id });
    expect(toggled).toMatchObject({ id: created.id, active: false });
    await expect(repository.executeMutation(toggle.mutation, { id: 'missing-member' })).rejects.toMatchObject({ status: 404, code: 'CRM_TEAM_MEMBER_NOT_FOUND' });
  });
});
