import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = () => yaml('api/production-scraps.yaml');
const action = (id: string) => api().actions.find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const migrations = join(serviceRoot, 'migrations');
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_production_scraps_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_production_scraps_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Order Scraps stat action parity', () => {
  test('maps action_see_move_scrap to a page/API pair with source modes and the MO launcher', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/models/mrp_production.py', 'utf8');
    const scrapSource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_scrap_views.xml', 'utf8');
    expect(source).toContain('def action_see_move_scrap(self):');
    expect(source).toContain("action['domain'] = [('production_id', '=', self.id)]");
    expect(scrapSource).toContain('id="action_stock_scrap"');
    expect(scrapSource).toContain('<field name="view_mode">list,form,kanban,pivot,graph</field>');

    const page = yaml('pages/production-scraps.yaml');
    const detail = yaml('pages/manufacturing-detail.yaml');
    const detailApi = yaml('api/manufacturing-order-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'manufacturing-production-scraps', route: '/manufacturing-orders/detail/scraps' });
    expect(page.components[0]).toMatchObject({ source: 'mrp_production_scraps', create_action: 'create_mrp_production_scrap', row_open_action: 'view_mrp_production_scrap', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'kanban', 'pivot', 'graph']);
    expect(api().page.id).toBe('manufacturing-production-scraps');
    expect(api().datasources.map((source: any) => source.id)).toEqual(['mrp_production_scrap_states', 'mrp_production_scrap_products', 'mrp_production_scraps']);
    expect(() => validatePageDefinition(api(), { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api().actions }, { allowExternalSources: true })).not.toThrow();
    expect(detail.components[0].stat_buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_production_scraps', label: 'Scraps', value_field: 'scrap_count' }),
    ]));
    expect(detailApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_production_scraps', navigate_to: '/manufacturing-orders/detail/scraps' }),
    ]));
  });

  test('scopes durable scraps by Manufacturing Order and company, with empty, missing, and transport states', async () => {
    const { database, repository } = await repositoryForTest();
    const list = api().datasources.find((source: any) => source.id === 'mrp_production_scraps');
    const params = { id: 'mo-done-001', q: null, state: null, product_name: null, fixture_state: null };
    expect((await repository.querySource(list, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['scrap-table-done']);
    expect((await repository.querySource(list, { ...params, id: 'mo-progress-001' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['scrap-panel-draft']);
    expect((await repository.querySource(list, { ...params, id: 'mo-done-001', q: 'not found' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCTION_SCRAPS_UNAVAILABLE' });
    database.close();
  });

  test('creates only in the selected MO and guards stale/delete transitions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_mrp_production_scrap');
    const remove = action('delete_mrp_production_scrap');
    const values = {
      production_id: 'mo-progress-001', name: 'SCRAP/2026/0099', date_done: '2026-01-21', product_id: 'product-furn-7023',
      product_name: '[FURN_7023] Wood Panel', scrap_qty: 1, product_uom: 'Units', source_location: 'WH/Stock',
      scrap_location: 'Virtual Locations/Scrap', company_name: 'My Company (San Francisco)', state: 'Draft',
      origin: 'MO/2026/0003', production_name: 'MO/2026/0003', lot_name: null, should_replenish: false, note: 'QA fixture',
    };
    const created = await repository.executeMutation(create.mutation, { ...values });
    expect(created).toMatchObject({ name: 'SCRAP/2026/0099', production_id: 'mo-progress-001', row_version: 1, state: 'Draft' });
    await expect(repository.executeMutation(create.mutation, { ...values, name: 'SCRAP/2026/0100', production_id: 'missing-mo' })).rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCTION_SCRAPS_PRODUCTION_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { ...values, name: 'SCRAP/2026/0101', scrap_qty: 0 })).rejects.toMatchObject({ status: 422, code: 'MRP_PRODUCTION_SCRAP_REQUIRED_FIELDS' });
    await expect(repository.executeMutation(remove.mutation, { id: 'scrap-panel-draft', production_id: 'mo-progress-001', expected_row_version: 0 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove.mutation, { id: 'scrap-scrap-2026-0099', production_id: 'mo-progress-001', expected_row_version: 1 });
    await expect(repository.executeMutation(remove.mutation, { id: 'scrap-scrap-2026-0099', production_id: 'mo-progress-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCTION_SCRAP_NOT_FOUND' });
    database.close();
  });
});
