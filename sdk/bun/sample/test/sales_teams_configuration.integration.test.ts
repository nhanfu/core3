import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const sampleRoot = join(import.meta.dir, '..');
const crmRoot = join(sampleRoot, 'services/crm');
const yaml = (root: string, file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((candidate: any) => candidate.id === id);

describe('Sales Teams configuration action parity', () => {
  test('maps Odoo Sales Configuration -> Sales Teams to the CRM-owned list/detail forms', () => {
    const manifest = yaml(crmRoot, 'manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    const listPage = yaml(crmRoot, 'pages/teams.yaml');
    const listApi = yaml(crmRoot, 'api/teams.yaml');
    const detailPage = yaml(crmRoot, 'pages/team-detail.yaml');
    const detailApi = yaml(crmRoot, 'api/team-detail.yaml');
    const discovered = discoverPages(sampleRoot);
    const routes = discoverPageRoutes(discovered);

    expect(configuration.items).toContainEqual({ path: '/crm/teams', label: 'Sales Teams', icon: 'users', permission: 'crm.manage' });
    expect(listPage.page).toMatchObject({ id: 'teams', auth: { require: ['crm.read'] } });
    expect(listApi.page).toEqual({ id: 'teams' });
    expect(detailPage.page).toMatchObject({ id: 'team-detail', auth: { require: ['crm.read'] } });
    expect(detailApi.page).toEqual({ id: 'team-detail' });
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('teams')).toEqual(expect.arrayContaining(['crm_teams', 'crm_team_member_configuration']));
    expect(discovered.pageDatasources.get('team-detail')).toEqual(expect.arrayContaining(['crm_team_detail', 'crm_team_members_detail']));
    expect(routes).toContainEqual({ path: '/teams', page: 'teams', module: 'crm' });
    expect(routes).toContainEqual({ path: '/crm/teams', page: 'teams', module: 'crm' });
    expect(routes).toContainEqual({ path: '/team-detail', page: 'team-detail', module: 'crm' });

    expect(listPage.components[0]).toMatchObject({
      type: 'ListView', source: 'crm_teams', create_action: 'create_crm_team',
      row_open_action: 'view_crm_team', row_double_click_action: 'view_crm_team',
    });
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'card']);
    expect(listPage.components[0].filters[0]).toMatchObject({ field: 'active', label: 'Status' });
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'crm_team_detail' });
    expect(action(listApi, 'create_crm_team')).toMatchObject({ permission: 'crm.manage', operation: 'create' });
    expect(action(listApi, 'edit_crm_team')).toMatchObject({ permission: 'crm.manage', operation: 'update' });
    expect(action(detailApi, 'archive_crm_team_detail')).toMatchObject({ permission: 'crm.manage', operation: 'archive' });
  });

  test('keeps deterministic team fixtures and guards the manager CRUD lifecycle', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(crmRoot, 'migrations'), undefined, 'sales_teams_configuration_test_migrations', ['schema', 'data']);

    const listApi = yaml(crmRoot, 'api/teams.yaml');
    const rows = await repository.querySource(listApi.datasources.find((source: any) => source.id === 'crm_teams'), { q: null, active: 'active', fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['crm-team-enterprise', 'crm-team-north-america']);
    expect(rows.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'crm-team-enterprise', name: 'Enterprise', leader: 'Admin User', email_alias: 'enterprise' }),
      expect.objectContaining({ id: 'crm-team-north-america', name: 'North America', leader: 'Dispatcher User', email_alias: 'north-america' }),
    ]));
    expect((await repository.querySource(listApi.datasources.find((source: any) => source.id === 'crm_teams'), { q: 'North', active: 'active', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['North America']);
    expect((await repository.querySource(listApi.datasources.find((source: any) => source.id === 'crm_teams'), { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([]);

    const create = action(listApi, 'create_crm_team');
    const created = await repository.executeMutation(create.mutation, {
      name: 'Mid-Market', leader: 'Sales Manager', email_alias: 'mid-market', target_revenue: 250000, use_leads: true,
    });
    expect(created).toMatchObject({ name: 'Mid-Market', active: true });
    await expect(repository.executeMutation(create.mutation, { name: 'Mid-Market', email_alias: 'another-alias' })).rejects.toMatchObject({ status: 409 });

    const update = action(listApi, 'edit_crm_team');
    const updated = await repository.executeMutation(update.mutation, {
      id: 'crm-team-enterprise', name: 'Enterprise Growth', leader: 'Admin User', email_alias: 'enterprise', target_revenue: 1100000, use_leads: true,
    });
    expect(updated).toMatchObject({ name: 'Enterprise Growth', target_revenue: 1100000 });
    expect((await repository.query("SELECT team FROM crm_leads WHERE id = 'crm-demo-002'"))[0].team).toBe('Enterprise Growth');

    const archive = action(listApi, 'archive_crm_team');
    await repository.executeMutation(archive.mutation, { id: created.id });
    expect((await repository.query('SELECT active FROM crm_teams WHERE id = ?', [created.id]))[0].active).toBe(false);
    await expect(repository.executeMutation(update.mutation, {
      id: created.id, name: 'Mid-Market Updated', leader: 'Sales Manager', email_alias: 'mid-market', target_revenue: 250000, use_leads: true,
    })).rejects.toMatchObject({ status: 409 });

    expect(create.permission).toBe('crm.manage');
    expect(update.permission).toBe('crm.manage');
    expect(archive.permission).toBe('crm.manage');
    expect(String(update.mutation.guards[0].message)).toContain('active sales teams');
    expect(String(create.mutation.guards[1].message)).toContain('Email alias');
  });
});
