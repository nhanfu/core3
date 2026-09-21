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

describe('CRM team overdue opportunities parity', () => {
  test('binds the Odoo overdue action to a team-scoped page and API', () => {
    const page = yaml('pages/team-overdue-opportunities.yaml');
    const api = yaml('api/team-overdue-opportunities.yaml');
    const teamPage = yaml('pages/team-detail.yaml');
    const teamApi = yaml('api/team-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'crm-team-overdue-opportunities', route: '/crm/team-overdue-opportunities', auth: { require: ['crm.read'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get(page.page.id)).toEqual([
      'crm_team_overdue_opportunities_context', 'crm_team_overdue_opportunities',
      'crm_team_overdue_opportunity_stages', 'crm_team_overdue_opportunity_salespeople',
    ]);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/crm/team-overdue-opportunities', page: page.page.id, module: 'crm' });
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['Kanban', 'List', 'Graph', 'Calendar', 'Pivot']);
    expect(teamPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_crm_team_overdue_opportunities', value_field: 'overdue_opportunity_count' }));
    expect(action(teamApi, 'view_crm_team_overdue_opportunities')).toMatchObject({ type: 'navigate', permission: 'crm.read', navigate_to: '/crm/team-overdue-opportunities' });
    expect(String(api.datasources.find((source: any) => source.id === 'crm_team_overdue_opportunities').query)).toContain("l.stage NOT IN ('Won', 'Lost')");
    expect(String(api.datasources.find((source: any) => source.id === 'crm_team_overdue_opportunities').query)).toContain('l.expected_closing <');
  });

  test('filters open overdue opportunities, enforces access boundaries, and survives restart', async () => {
    const databasePath = `/tmp/core3-crm-team-overdue-opportunities-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_team_overdue_opportunities_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_team_overdue_opportunities_test_migrations', ['schema', 'data']);

    const api = yaml('api/team-overdue-opportunities.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'crm_team_overdue_opportunities');
    const params = { team_id: 'crm-team-enterprise', as_of: '2026-09-22', salesperson: null, q: null, fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'crm-team-overdue-enterprise-001', attention: 'Overdue', team_id: 'crm-team-enterprise' })]));
    expect(rows.data).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'crm-team-opportunity-enterprise-001' })]));
    expect((await repository.querySource(source, { ...params, as_of: '2026-09-17' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_TEAM_OVERDUE_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, team_id: 'missing-team' }, 0, 50)).resolves.toMatchObject({ data: [] });
    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, 'crm_team_overdue_opportunities_test_migrations', ['schema', 'data']);
    const restartedRows = await restartedRepository.querySource(source, params, 0, 50);
    expect(restartedRows.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'crm-team-overdue-enterprise-001', name: 'Enterprise renewal follow-up' })]));
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});
