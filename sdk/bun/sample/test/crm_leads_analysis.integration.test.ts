import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('CRM Leads Analysis parity', () => {
  test('maps Odoo Leads Analysis action and preserves the page/API boundary', () => {
    const menuSource = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_menu_views.xml', 'utf8');
    const actionSource = readFileSync('/home/nhanjs/projects/odoo/addons/crm/report/crm_opportunity_report_views.xml', 'utf8');
    const page = yaml('pages/leads-analysis.yaml');
    const api = yaml('api/leads-analysis.yaml');
    const reporting = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'reporting');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(menuSource).toContain('name="Leads"');
    expect(menuSource).toContain('action="crm.crm_opportunity_report_action_lead"');
    expect(actionSource).toContain('<field name="name">Leads Analysis</field>');
    expect(actionSource).toContain('<field name="view_mode">graph,pivot,list</field>');
    expect(actionSource).toContain("'search_default_filter_create_date': 1");
    expect(page.page).toMatchObject({ id: 'crm-leads-analysis', route: '/leads-analysis', auth: { require: ['crm.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'crm-leads-analysis' });
    expect(discovered.pageDatasources.get('crm-leads-analysis')).toContain('crm_leads_analysis');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/leads-analysis', page: 'crm-leads-analysis', module: 'crm' })]));
    expect(reporting.items).toContainEqual({ path: '/leads-analysis', label: 'Leads', icon: 'chart', permission: 'crm.read' });
    const agent = yaml('../ai/agent.yaml');
    expect(agent.context_paths).toContain('services/crm/pages/leads-analysis.yaml');
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(page.components[0].views[1].pivot.default).toMatchObject({ rows: ['created_month'], columns: ['team'] });
  });

  test('returns deterministic default, filtered, empty, and failure states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_leads_analysis_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_leads_analysis_migrations', ['schema', 'data']);
    const source = yaml('api/leads-analysis.yaml').datasources.find((entry: any) => entry.id === 'crm_leads_analysis');
    const params = { fixture_state: null, q: null, record_type: null, active: null, won_status: null, team: null, salesperson: null, creation_period: 'year' };
    const result = await repository.querySource(source, params, 0, 50);
    expect(result.data.map((row: any) => row.id)).toEqual(['crm-forecast-004', 'crm-forecast-003', 'crm-forecast-002', 'crm-forecast-001', 'crm-demo-002', 'crm-demo-001', 'crm-leads-analysis-archived']);
    expect(result.data[0]).toMatchObject({ name: 'Retail Rollout', record_type: 'opportunity', created_month: '2026-06', record_count: 1 });
    expect((await repository.querySource(source, { ...params, record_type: 'lead' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['crm-demo-002', 'crm-leads-analysis-archived']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_LEADS_ANALYSIS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'CRM_LEADS_ANALYSIS_UNAVAILABLE' });
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, conflict: { status: 409 } });
    await database.close();
  });
});
