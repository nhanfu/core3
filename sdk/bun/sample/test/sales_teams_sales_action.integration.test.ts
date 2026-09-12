import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const sampleRoot = join(import.meta.dir, '..');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(sampleRoot, file), 'utf8')) as any;

describe('Sales Teams Sales action parity', () => {
  test('binds the Odoo Sales Orders > Sales Teams action to its own page/API pair', () => {
    const manifest = yaml('services/order/manifest.yaml');
    const page = yaml('services/order/pages/sale-sales-teams.yaml');
    const api = yaml('services/order/api/sale-sales-teams.yaml');
    const orders = manifest.menu.groups.find((group: any) => group.id === 'orders');
    const discovered = discoverPages(sampleRoot);

    expect(orders.items).toContainEqual({ path: '/order/sales-teams', label: 'Sales Teams', icon: 'users', permission: 'crm.manage' });
    expect(page.page).toMatchObject({ id: 'sale-sales-teams', route: '/order/sales-teams', auth: { require: ['crm.manage'] } });
    expect(api.page).toEqual({ id: 'sale-sales-teams' });
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/order/sales-teams', page: 'sale-sales-teams', module: 'order' });
    expect(discovered.pageDatasources.get('sale-sales-teams')).toEqual(['sale_sales_teams']);
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['Kanban', 'Form']);
    expect(page.components[0].form_view.page).toContain('crm/pages/team-detail.yaml');
    expect(api.datasources[0].query).toContain('crm_teams');
    expect(api.datasources[0].query).toContain('target_revenue_display');
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'SALES_TEAMS_UNAVAILABLE' });
  });

  test('keeps deterministic team cards and filters empty-safe', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(sampleRoot, 'services/crm/migrations'), undefined, 'sales_teams_sales_action_test', ['schema', 'data']);
    const source = yaml('services/order/api/sale-sales-teams.yaml').datasources[0];

    const rows = await repository.querySource(source, { q: null, active: 'active' }, 0, 50);
    expect(rows.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Enterprise', leader: 'Admin User', target_revenue_display: '$1,000,000.00' }),
      expect.objectContaining({ name: 'North America', leader: 'Dispatcher User', target_revenue_display: '$500,000.00' }),
    ]));
    expect((await repository.querySource(source, { q: 'missing', active: 'active' }, 0, 50)).data).toEqual([]);
  });
});
