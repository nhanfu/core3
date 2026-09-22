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

describe('CRM Sales Team leads parity', () => {
  test('binds the source-backed team Leads stat action to the page/API route', () => {
    const page = yaml('pages/team-leads.yaml');
    const api = yaml('api/team-leads.yaml');
    const teamPage = yaml('pages/team-detail.yaml');
    const teamApi = yaml('api/team-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'crm-team-leads', route: '/crm/team-leads', auth: { require: ['crm.read'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('crm-team-leads')).toEqual([
      'crm_team_leads_context', 'crm_team_leads', 'crm_team_lead_stages',
      'crm_team_lead_salespeople', 'crm_team_lead_sources', 'crm_team_lead_team_lookup',
    ]);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/crm/team-leads', page: 'crm-team-leads', module: 'crm' });
    expect(teamPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_crm_team_leads', value_field: 'lead_count' }));
    expect(teamApi.datasources.find((entry: any) => entry.id === 'crm_team_detail').query).toContain('lead_count');
    expect(action(teamApi, 'view_crm_team_leads')).toMatchObject({ type: 'navigate', permission: 'crm.read', navigate_to: '/crm/team-leads' });
    expect(page.components[0].default_filters).toEqual({ type: 'lead' });
  });

  test('scopes leads to a team and persists create, edit, assignment, guards, and restart visibility', async () => {
    const databasePath = `/tmp/core3-crm-team-leads-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_team_leads_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_team_leads_test_migrations', ['schema', 'data']);
    const api = yaml('api/team-leads.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'crm_team_leads');
    const rows = await repository.querySource(source, { team_id: 'crm-team-enterprise', q: null, stage: null, salesperson: null, fixture_state: null }, 0, 50);
    expect(rows.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'crm-team-lead-enterprise-001', team_id: 'crm-team-enterprise', type: 'lead' })]));
    expect(rows.data).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'crm-team-lead-north-001' })]));
    expect((await repository.querySource(source, { team_id: 'crm-team-enterprise', q: 'missing', stage: null, salesperson: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { team_id: 'crm-team-enterprise', q: null, stage: null, salesperson: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { team_id: 'crm-team-enterprise', q: null, stage: null, salesperson: null, fixture_state: 'forbidden' })).rejects.toMatchObject({ status: 403, code: 'CRM_TEAM_LEADS_FORBIDDEN' });

    const create = action(api, 'create_crm_team_lead');
    const created = await repository.executeMutation(create.mutation, { team_id: 'crm-team-enterprise', values: { name: 'Enterprise compliance inquiry', partner_name: 'Umbrella Health', expected_revenue: 31000, probability: 20, source: 'Website', expected_closing: '2026-11-01' } });
    expect(created).toMatchObject({ name: 'Enterprise compliance inquiry', type: 'lead', team: 'Enterprise', stage: 'New' });
    const edit = action(api, 'edit_crm_team_lead');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, team_id: 'crm-team-enterprise', expected_row_version: 1, values: { name: 'Enterprise compliance inquiry revised', expected_revenue: 36000, probability: 30, source: 'Website' } });
    expect(edited).toMatchObject({ name: 'Enterprise compliance inquiry revised', expected_revenue: 36000, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, team_id: 'crm-team-enterprise', expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const assign = action(api, 'assign_crm_team_lead_to_me');
    const assigned = await repository.executeMutation(assign.mutation, { id: created.id, team_id: 'crm-team-enterprise', current_user_name: 'Dispatcher User' });
    expect(assigned).toMatchObject({ salesperson: 'Dispatcher User', row_version: 3 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-team-lead', team_id: 'crm-team-enterprise', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'CRM_TEAM_LEAD_NOT_FOUND' });
    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, 'crm_team_leads_test_migrations', ['schema', 'data']);
    const restartedRows = await restartedRepository.querySource(source, { team_id: 'crm-team-enterprise', q: 'compliance inquiry revised', stage: null, salesperson: null, fixture_state: null }, 0, 50);
    expect(restartedRows.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id, name: 'Enterprise compliance inquiry revised', salesperson: 'Dispatcher User', row_version: 3, team_id: 'crm-team-enterprise' })]));
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});
