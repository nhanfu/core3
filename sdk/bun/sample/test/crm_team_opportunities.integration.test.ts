import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('CRM Sales Team opportunities parity', () => {
  test('binds the team stat action to the page/API route', () => {
    const page = yaml('pages/team-opportunities.yaml');
    const api = yaml('api/team-opportunities.yaml');
    const teamPage = yaml('pages/team-detail.yaml');
    const teamApi = yaml('api/team-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'crm-team-opportunities', route: '/crm/team-opportunities', auth: { require: ['crm.read'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('crm-team-opportunities')).toEqual([
      'crm_team_opportunities_context', 'crm_team_opportunities', 'crm_team_opportunity_stages',
      'crm_team_opportunity_salespeople', 'crm_team_opportunity_sources', 'crm_team_opportunity_team_lookup',
    ]);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/crm/team-opportunities', page: 'crm-team-opportunities', module: 'crm' });
    expect(teamPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_crm_team_opportunities', value_field: 'opportunity_count' }));
    expect(action(teamApi, 'view_crm_team_opportunities')).toMatchObject({ type: 'navigate', permission: 'crm.read', navigate_to: '/crm/team-opportunities' });
    expect(page.components[0].default_filters).toEqual({ type: 'opportunity' });
  });

  test('scopes opportunities to a team and persists create, edit, assignment, empty, and failure states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_team_opportunities_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_team_opportunities_test_migrations', ['schema', 'data']);
    const api = yaml('api/team-opportunities.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'crm_team_opportunities');
    const rows = await repository.querySource(source, { team_id: 'crm-team-enterprise', q: null, stage: null, salesperson: null, fixture_state: null }, 0, 50);
    expect(rows.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'crm-team-opportunity-enterprise-001', team_id: 'crm-team-enterprise', stage: 'Qualified' })]));
    expect((await repository.querySource(source, { team_id: 'crm-team-enterprise', q: 'missing', stage: null, salesperson: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { team_id: 'crm-team-enterprise', q: null, stage: null, salesperson: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { team_id: 'crm-team-enterprise', q: null, stage: null, salesperson: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_TEAM_OPPORTUNITIES_FORBIDDEN' });

    const create = action(api, 'create_crm_team_opportunity');
    const created = await repository.executeMutation(create.mutation, { team_id: 'crm-team-enterprise', values: { name: 'Renewal expansion', partner_name: 'Umbrella Health', expected_revenue: 42000, probability: 25, source: 'Referral', expected_closing: '2026-10-01' } });
    expect(created).toMatchObject({ name: 'Renewal expansion', type: 'opportunity', team: 'Enterprise', stage: 'New' });
    const edit = action(api, 'edit_crm_team_opportunity');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, team_id: 'crm-team-enterprise', expected_row_version: 1, values: { name: 'Renewal expansion revised', expected_revenue: 50000, probability: 40, source: 'Referral' } });
    expect(edited).toMatchObject({ name: 'Renewal expansion revised', expected_revenue: 50000, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, team_id: 'crm-team-enterprise', expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const assign = action(api, 'assign_crm_team_opportunity_to_me');
    const assigned = await repository.executeMutation(assign.mutation, { id: created.id, team_id: 'crm-team-enterprise', current_user_name: 'QA Owner' });
    expect(assigned).toMatchObject({ salesperson: 'QA Owner', row_version: 3 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-team-opportunity', team_id: 'crm-team-enterprise', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'CRM_TEAM_OPPORTUNITY_NOT_FOUND' });
    database.close();
  });
});
