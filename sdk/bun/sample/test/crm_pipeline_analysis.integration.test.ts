import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('CRM Pipeline Analysis parity', () => {
  test('maps the Odoo action, menu, views, and page/API boundary', () => {
    const menu = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_menu_views.xml', 'utf8');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/crm/report/crm_opportunity_report_views.xml', 'utf8');
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(menu).toContain('action="crm.crm_opportunity_report_action"');
    expect(source).toContain('<field name="name">Pipeline Analysis</field>');
    expect(source).toContain('<field name="view_mode">graph,pivot,list,form</field>');
    expect(page.page).toMatchObject({ id: 'crm-analysis', route: '/analysis', auth: { require: ['crm.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'crm-analysis' });
    expect(discovered.pageDatasources.get('crm-analysis')).toContain('crm_pipeline_analysis');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/analysis', page: 'crm-analysis', module: 'crm' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'reporting').items).toContainEqual({ path: '/analysis', label: 'Pipeline Analysis', icon: 'chart', permission: 'crm.read' });
    const list = page.components[0];
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(list.views[0]).toMatchObject({ category_field: 'stage', measure_field: 'prorated_revenue' });
    expect(list.views[1].pivot.default).toMatchObject({ rows: ['stage'], columns: ['expected_closing_month'] });
  });

  test('returns deterministic opportunity, filter, empty, and failure states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_pipeline_analysis_migrations', ['schema', 'data']);
    const source = yaml('api/analysis.yaml').datasources.find((entry: any) => entry.id === 'crm_pipeline_analysis');
    const params = { fixture_state: null, q: null, active: 'active', team: null, salesperson: null, expected_closing_period: null };
    const result = await repository.querySource(source, params, 0, 50);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((row: any) => row.type === 'opportunity' && row.active === true)).toBe(true);
    expect(result.data[0]).toHaveProperty('prorated_revenue');
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_PIPELINE_ANALYSIS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'CRM_PIPELINE_ANALYSIS_UNAVAILABLE' });
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, conflict: { status: 409 } });
    await database.close();
  });
});
