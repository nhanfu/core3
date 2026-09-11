import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('CRM Forecast bounded parity', () => {
  test('maps Odoo Forecast action 412 and keeps page/API contracts joined by page.id', () => {
    const odooMenu = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_menu_views.xml', 'utf8');
    const odooViews = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_lead_views.xml', 'utf8');
    const page = yaml('pages/forecast.yaml');
    const api = yaml('api/forecast.yaml');
    const list = page.components[0];
    const source = api.datasources.find((entry: any) => entry.id === 'crm_forecast_opportunities');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(odooMenu).toContain('name="Forecast"');
    expect(odooMenu).toContain('action="crm.action_opportunity_forecast"');
    expect(odooViews).toContain('<record id="crm_lead_action_forecast" model="ir.actions.act_window">');
    expect(odooViews).toContain('<field name="view_mode">kanban,graph,pivot,list,form</field>');
    expect(odooViews).toContain('name="forecast" string="Upcoming Closings"');
    expect(page.page).toMatchObject({ id: 'forecast', route: '/forecast', auth: { require: ['crm.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page).toEqual({ id: 'forecast' });
    expect(discovered.pageDatasources.get('forecast')).toContain('crm_forecast_opportunities');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/forecast', page: 'forecast', module: 'crm' }),
    ]));
    expect(list).toMatchObject({ type: 'ListView', source: 'crm_forecast_opportunities', default_filters: { forecast_scope: 'upcoming', salesperson: 'Admin User' } });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card']);
    expect(list.views[1]).toMatchObject({ label: 'Kanban', group_by: 'expected_closing' });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Opportunity', 'Customer', 'Salesperson', 'Sales Team', 'Stage', 'Expected Closing', 'Probability', 'Prorated Revenue']);
    expect(source.permission).toBe('crm.read');
    expect(source.error_states).toMatchObject({
      forbidden: { status: 403, code: 'CRM_FORECAST_FORBIDDEN' },
      transport_error: { status: 503, code: 'CRM_FORECAST_UNAVAILABLE' },
    });
    expect(String(source.query)).toContain("type = 'opportunity'");
    expect(String(source.query)).toContain('expected_closing >= DATE');
    expect(String(source.query)).toContain(':fixture_state');
    expect(readFileSync(join(serviceRoot, 'migrations/20260911194000-020-forecast-fixtures.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'reporting').items)
      .toContainEqual({ path: '/forecast', label: 'Forecast', icon: 'chart', permission: 'crm.read' });
  });

  test('seeds deterministic upcoming opportunities and protects read/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'crm_forecast_acceptance_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'crm_forecast_acceptance_migrations', ['schema', 'data']);
    const source = yaml('api/forecast.yaml').datasources[0];
    const params = { q: null, forecast_scope: 'upcoming', salesperson: 'Admin User', team: null, fixture_state: null };

    const initial = await repository.querySource(source, params, 0, 50);
    expect(initial.data.map((row: any) => row.id)).toEqual([
      'crm-demo-001', 'crm-forecast-001', 'crm-forecast-002', 'crm-forecast-003', 'crm-forecast-004',
    ]);
    expect(initial.data[0]).toMatchObject({ name: 'Website renewal opportunity', expected_closing: '2026-09-15', prorated_revenue: 28800 });
    expect(initial.data.at(-1)).toMatchObject({ name: 'Retail Rollout', expected_closing: '2026-12-04', prorated_revenue: 60800 });

    const searched = await repository.querySource(source, { ...params, q: 'Warehouse' }, 0, 50);
    expect(searched.data).toHaveLength(1);
    expect(searched.data[0]).toMatchObject({ id: 'crm-forecast-002', team: 'Enterprise', probability: 65 });
    expect((await repository.querySource(source, { ...params, team: 'North America' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['crm-demo-001', 'crm-forecast-001', 'crm-forecast-003']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, q: 'missing', fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_FORECAST_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'CRM_FORECAST_UNAVAILABLE' });
    expect(source.permission).toBe('crm.read');
    await database.close();
  });
});
