import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('CRM team Assign Leads parity CRM-TEAM-ASSIGN-LEADS-001', () => {
  test('maps the Odoo team header action to the team-detail page/API join', () => {
    const page = yaml('pages/team-detail.yaml');
    const api = yaml('api/team-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const assign = action(api, 'assign_crm_team_leads');

    expect(page.page).toMatchObject({ id: 'team-detail', auth: { require: ['crm.read'] } });
    expect(api.page).toEqual({ id: 'team-detail' });
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/team-detail', page: 'team-detail', module: 'crm' });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: 'assign_crm_team_leads',
      label: 'Assign Leads',
      permission: 'crm.manage',
    }));
    expect(assign).toMatchObject({
      type: 'server',
      action: 'crm.teams.assign_leads',
      permission: 'crm.manage',
      params: { id: '{state.crm_team_detail.id}' },
    });
    expect(assign.mutation.steps[0].query).toContain('ROW_NUMBER() OVER');
    expect(assign.mutation.steps[0].query).toContain("type = 'opportunity'");
  });

  test('assigns open unassigned team leads round-robin, converts them, guards team state, and survives restart', async () => {
    const databasePath = `/tmp/core3-crm-team-assign-leads-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_team_assign_leads_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_team_assign_leads_test_migrations', ['schema', 'data']);

    const api = yaml('api/team-detail.yaml');
    const assign = action(api, 'assign_crm_team_leads');
    const before = await repository.query("SELECT id, type, salesperson, row_version FROM crm_leads WHERE id LIKE 'crm-team-assign-enterprise-%' ORDER BY id");
    expect(before).toEqual([
      { id: 'crm-team-assign-enterprise-001', type: 'lead', salesperson: '', row_version: 1 },
      { id: 'crm-team-assign-enterprise-002', type: 'lead', salesperson: '', row_version: 1 },
      { id: 'crm-team-assign-enterprise-003', type: 'lead', salesperson: '', row_version: 1 },
    ]);

    const assigned = await repository.executeMutation(assign.mutation, { id: 'crm-team-enterprise' });
    expect(assigned).toMatchObject({ id: 'crm-team-enterprise', name: 'Enterprise' });
    expect(await repository.query("SELECT id, type, salesperson, row_version FROM crm_leads WHERE id LIKE 'crm-team-assign-enterprise-%' ORDER BY id")).toEqual([
      { id: 'crm-team-assign-enterprise-001', type: 'opportunity', salesperson: 'Admin User', row_version: 2 },
      { id: 'crm-team-assign-enterprise-002', type: 'opportunity', salesperson: 'Dispatcher User', row_version: 2 },
      { id: 'crm-team-assign-enterprise-003', type: 'opportunity', salesperson: 'Admin User', row_version: 2 },
    ]);

    await expect(repository.executeMutation(assign.mutation, { id: 'missing-team' })).rejects.toMatchObject({ status: 409, code: 'CRM_TEAM_ASSIGN_LEADS_INVALID_TEAM' });
    await repository.query("UPDATE crm_teams SET active = false WHERE id = 'crm-team-enterprise'");
    await expect(repository.executeMutation(assign.mutation, { id: 'crm-team-enterprise' })).rejects.toMatchObject({ status: 409, code: 'CRM_TEAM_ASSIGN_LEADS_INVALID_TEAM' });
    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, 'crm_team_assign_leads_test_migrations', ['schema', 'data']);
    expect(await restartedRepository.query("SELECT id, type, salesperson, row_version FROM crm_leads WHERE id LIKE 'crm-team-assign-enterprise-%' ORDER BY id")).toEqual([
      { id: 'crm-team-assign-enterprise-001', type: 'opportunity', salesperson: 'Admin User', row_version: 2 },
      { id: 'crm-team-assign-enterprise-002', type: 'opportunity', salesperson: 'Dispatcher User', row_version: 2 },
      { id: 'crm-team-assign-enterprise-003', type: 'opportunity', salesperson: 'Admin User', row_version: 2 },
    ]);
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});
