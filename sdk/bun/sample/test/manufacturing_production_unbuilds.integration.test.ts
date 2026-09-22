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
const api = () => yaml('api/production-unbuilds.yaml');

async function repositoryForTest(databasePath = ':memory:', migrationName = `manufacturing_production_unbuilds_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Order Unbuilds stat action parity', () => {
  test('maps action_view_mrp_production_unbuilds to a page/API pair and MO stat action', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/models/mrp_production.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_production_views.xml', 'utf8');
    const unbuildView = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_unbuild_views.xml', 'utf8');
    expect(source).toContain('def action_view_mrp_production_unbuilds(self):');
    expect(source).toContain("action['domain'] = [('mo_id', '=', self.id)]");
    expect(source).toContain("context['default_mo_id'] = self.id");
    expect(view).toContain('name="action_view_mrp_production_unbuilds"');
    expect(view).toContain('unbuild_count');
    expect(unbuildView).toContain('<field name="view_mode">list,kanban,form,activity</field>');

    const page = yaml('pages/production-unbuilds.yaml');
    const detail = yaml('pages/manufacturing-detail.yaml');
    const detailApi = yaml('api/manufacturing-order-detail.yaml');
    expect(page.page).toMatchObject({ id: 'manufacturing-production-unbuilds', route: '/manufacturing-orders/detail/unbuilds' });
    expect(page.components[0]).toMatchObject({ source: 'mrp_production_unbuilds', create_action: 'create_mrp_production_unbuild', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'activity']);
    expect(api().page.id).toBe('manufacturing-production-unbuilds');
    expect(api().datasources[2]).toMatchObject({ id: 'mrp_production_unbuilds', permission: 'manufacturing.read', workflow: 'mrp_unbuild_orders' });
    expect(api().datasources[2].meta.source_action).toMatchObject({ external_id: 'action_view_mrp_production_unbuilds', model: 'mrp.unbuild', view_modes: ['list', 'kanban', 'form', 'activity'] });
    expect(api().datasources[2].query).toContain('p.id = :id');
    expect(api().datasources[2].query).toContain('p.company_name = u.company_name');
    expect(api().datasources[2].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 }, transport_error: { status: 503 } });
    expect(() => validatePageDefinition(api(), { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api().actions }, { allowExternalSources: true })).not.toThrow();
    expect(detail.components[0].stat_buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_production_unbuilds', label: 'Unbuilds', value_field: 'unbuild_count' }),
    ]));
    expect(detailApi.datasources[0].query).toContain('AS unbuild_count');
    expect(detailApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_production_unbuilds', navigate_to: '/manufacturing-orders/detail/unbuilds' }),
    ]));
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing-orders/detail/unbuilds', page: 'manufacturing-production-unbuilds', module: 'manufacturing' }),
    ]));
  });

  test('scopes durable rows by Manufacturing Order and company with source filters and error states', async () => {
    const { database, repository } = await repositoryForTest();
    const source = api().datasources[2];
    const params = { id: 'mo-done-001', q: null, state: null, product_name: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'unbuild-desk-done', 'unbuild-panel-draft', 'unbuild-table-draft',
    ]);
    expect((await repository.querySource(source, { ...params, id: 'mo-to-close-001' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['unbuild-drawer-done']);
    expect((await repository.querySource(source, { ...params, q: 'LOT-DESK' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['unbuild-desk-done']);
    expect((await repository.querySource(source, { ...params, state: 'Done' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['unbuild-desk-done']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCTION_UNBUILDS_UNAVAILABLE' });
    database.close();
  });

  test('keeps the scope index durable and guards create/delete with write access and row state', async () => {
    const databasePath = `/tmp/core3-manufacturing-unbuilds-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath, `manufacturing_unbuilds_restart_a_${crypto.randomUUID().replaceAll('-', '_')}`);
    expect(await first.repository.query("SELECT COUNT(*) AS count FROM mrp_unbuild_orders WHERE mo_id = 'mo-done-001' AND company_name = 'My Company (San Francisco)'"))
      .toEqual([{ count: 3 }]);
    expect(await first.repository.query("SELECT COUNT(*) AS count FROM duckdb_indexes() WHERE index_name = 'idx_mrp_unbuild_orders_mo_company_state'"))
      .toEqual([{ count: 1 }]);
    first.database.close();

    const second = await repositoryForTest(databasePath, `manufacturing_unbuilds_restart_b_${crypto.randomUUID().replaceAll('-', '_')}`);
    const create = api().actions.find((action: any) => action.id === 'create_mrp_production_unbuild');
    const remove = api().actions.find((action: any) => action.id === 'delete_mrp_production_unbuild');
    const values = {
      name: 'UB/2026/0099', product_id: 'product-furn-9666', product_name: '[FURN_9666] Table',
      bom_id: 'bom-table-odoo', bom_name: '[FURN_9666] Table BoM', mo_id: 'mo-done-001', mo_name: 'MO/2026/0005',
      product_qty: 1, product_uom: 'Units', source_location: 'WH/Stock', destination_location: 'WH/Stock',
      company_name: 'My Company (San Francisco)', state: 'Draft', activity_state: 'planned', move_count: 0,
    };
    const created = await second.repository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ id: 'unbuild-ub-2026-0099', mo_id: 'mo-done-001', row_version: 1, state: 'Draft' });
    await expect(second.repository.executeMutation(create.mutation, { values: { ...values, mo_id: 'mo-to-close-001', company_name: 'Core3 Vietnam' } }))
      .rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCTION_UNBUILDS_MO_NOT_FOUND' });
    await expect(second.repository.executeMutation(remove.mutation, { id: 'unbuild-desk-done', mo_id: 'mo-done-001', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'MRP_UNBUILD_DONE_DELETE' });
    await second.repository.executeMutation(remove.mutation, { id: 'unbuild-ub-2026-0099', mo_id: 'mo-done-001', expected_row_version: 1 });
    expect(api().datasources[2].permission).toBe('manufacturing.read');
    expect(api().actions.filter((action: any) => action.id !== 'view_mrp_production_unbuild').every((action: any) => action.permission === 'manufacturing.write')).toBe(true);
    second.database.close();
  });
});
