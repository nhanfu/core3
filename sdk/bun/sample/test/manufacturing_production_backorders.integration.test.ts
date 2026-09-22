import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = () => yaml('api/production-backorders.yaml');

async function repositoryForTest(databasePath = ':memory:', migrationName = `manufacturing_production_backorders_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Order Backorders stat action parity', () => {
  test('maps action_view_mrp_production_backorders to a page/API pair without inventing a menu', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/models/mrp_production.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_production_views.xml', 'utf8');
    expect(source).toContain('def action_view_mrp_production_backorders(self):');
    expect(source).toContain("backorder_ids = self.production_group_id.production_ids.ids");
    expect(source).toContain("'name': _\(\"Backorder MO's\"\)");
    expect(view).toContain('name="action_view_mrp_production_backorders"');
    expect(view).toContain('mrp_production_backorder_count');

    const page = yaml('pages/production-backorders.yaml');
    const detail = yaml('pages/manufacturing-detail.yaml');
    const detailApi = yaml('api/manufacturing-order-detail.yaml');
    expect(page.page).toMatchObject({ id: 'manufacturing-production-backorders', route: '/manufacturing-orders/detail/backorders' });
    expect(page.components[0]).toMatchObject({ source: 'mrp_production_backorders', row_open_action: 'view_mrp_production_backorder', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(page.components[0].create_action).toBeUndefined();
    expect(api().page.id).toBe('manufacturing-production-backorders');
    expect(api().datasources[0]).toMatchObject({ id: 'mrp_production_backorders', single: false, permission: 'manufacturing.read' });
    expect(api().datasources[0].query).toContain('b.backorder_group_id = selected.backorder_group_id');
    expect(api().datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(() => validatePageDefinition(api(), { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api().actions }, { allowExternalSources: true })).not.toThrow();
    expect(detail.components[0].stat_buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_production_backorders', label: 'Backorders', value_field: 'backorder_count' }),
    ]));
    expect(detailApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_production_backorders', navigate_to: '/manufacturing-orders/detail/backorders' }),
    ]));
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing-orders/detail/backorders', page: 'manufacturing-production-backorders', module: 'manufacturing' }),
    ]));
  });

  test('returns the selected durable backorder group with search, filters, empty, and transport guards', async () => {
    const { database, repository } = await repositoryForTest();
    const source = api().datasources[0];
    const params = { id: 'mo-progress-001', q: null, state: null, priority: null, company_name: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['mo-progress-001', 'mo-to-close-001', 'mo-done-001']);
    expect((await repository.querySource(source, { ...params, id: 'mo-draft-001' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, q: 'Drawer' }, 0, 50)).data).toMatchObject([{ id: 'mo-to-close-001', product_name: '[FURN_8855] Drawer' }]);
    expect((await repository.querySource(source, { ...params, state: 'Done' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['mo-done-001']);
    expect((await repository.querySource(source, { ...params, priority: 'Urgent' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCTION_BACKORDERS_UNAVAILABLE' });
    database.close();
  });

  test('keeps the backorder group durable across restart and exposes only read access', async () => {
    const databasePath = `/tmp/core3-manufacturing-backorders-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath, `manufacturing_backorders_restart_a_${crypto.randomUUID().replaceAll('-', '_')}`);
    expect(await first.repository.query("SELECT backorder_group_id FROM mrp_productions WHERE id = 'mo-progress-001'")).toEqual([{ backorder_group_id: 'backorder-group-001' }]);
    first.database.close();
    const second = await repositoryForTest(databasePath, `manufacturing_backorders_restart_b_${crypto.randomUUID().replaceAll('-', '_')}`);
    expect(await second.repository.query("SELECT COUNT(*) AS count FROM mrp_productions WHERE backorder_group_id = 'backorder-group-001'")).toEqual([{ count: 3 }]);
    expect(api().datasources[0].permission).toBe('manufacturing.read');
    expect(api().actions).toEqual([expect.objectContaining({ id: 'view_mrp_production_backorder', permission: 'manufacturing.read' })]);
    second.database.close();
  });
});
