import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = () => yaml('api/manufacturing-dashboard.yaml');
const page = () => yaml('pages/manufacturing-dashboard.yaml');
const action = (id: string) => api().actions.find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_picking_dashboard_test', ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_picking_dashboard_test', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing picking dashboard action parity', () => {
  test('maps the Odoo dashboard action to a page/API pair without duplicating the global page', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_production_views.xml', 'utf8');
    const stockSource = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/stock_picking_views.xml', 'utf8');
    const sourceAction = source.slice(source.indexOf('id="mrp_production_action_picking_deshboard"'), source.indexOf('id="mrp_production_action_unreserve_tree"'));
    expect(sourceAction).toContain('<field name="res_model">mrp.production</field>');
    expect(sourceAction).toContain('<field name="view_mode">list,kanban,form</field>');
    expect(sourceAction).toContain("[('picking_type_id', '=', active_id)]");
    expect(stockSource).toContain('name="%(mrp_production_action_picking_deshboard)d"');

    expect(page().datasources).toBeUndefined();
    expect(page().actions).toBeUndefined();
    expect(page().page).toMatchObject({ id: 'manufacturing-picking-dashboard', route: '/manufacturing/manufacturings' });
    expect(page().components[0]).toMatchObject({ source: 'mrp_picking_manufacturings', create_action: 'create_mrp_picking_manufacturing', view_navigation: 'tabs' });
    expect(page().components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form']);
    expect(api().page.id).toBe('manufacturing-picking-dashboard');
    expect(api().datasources[1].meta.source_action).toMatchObject({ external_id: 'mrp_production_action_picking_deshboard', model: 'mrp.production', view_modes: ['list', 'kanban', 'form'] });
    expect(api().datasources[1].query).toContain('p.picking_type_id = :picking_type_id');
    expect(api().datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(api().datasources[1].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/manufacturing/manufacturings', page: 'manufacturing-picking-dashboard', module: 'manufacturing' })]));
  });

  test('filters durable orders by operation type and preserves search, state, company, empty, and transport guards', async () => {
    const { database, repository } = await repositoryForTest();
    const source = api().datasources[1];
    const params = { picking_type_id: 'operation-type-mrp-001', company_name: null, q: null, state: null, priority: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['mo-to-close-001', 'mo-progress-001', 'mo-confirmed-001', 'mo-draft-001']);
    expect((await repository.querySource(source, { ...params, picking_type_id: 'operation-type-mrp-002' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['mo-cancelled-001', 'mo-done-001']);
    expect((await repository.querySource(source, { ...params, state: 'todo' }, 0, 50)).data.map((row: any) => row.state)).toEqual(['To Close', 'In Progress', 'Confirmed', 'Draft']);
    expect((await repository.querySource(source, { ...params, q: 'Wood Panel' }, 0, 50)).data).toMatchObject([{ id: 'mo-progress-001', picking_type_name: 'Manufacturing' }]);
    expect((await repository.querySource(source, { ...params, company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PICKING_MANUFACTURINGS_UNAVAILABLE' });
    database.close();
  });

  test('keeps dashboard creation permissioned and durable across restart', async () => {
    const databasePath = `/tmp/core3-manufacturing-picking-dashboard-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_picking_dashboard_restart_a', ['schema', 'data']);
    const create = action('create_mrp_picking_manufacturing');
    expect(create).toMatchObject({ type: 'server_form', permission: 'manufacturing.write', action: 'manufacturing.productions.create_from_picking_type' });
    const values = { name: 'MO/QA/PICKING/0001', product_id: 'product-qa', product_name: 'QA Assembly', bom_id: null, quantity: 4, planned_date: '2026-01-15', priority: 'Normal', reference: 'QA', company_name: 'My Company (San Francisco)', warehouse_name: 'WH/Stock', origin: 'QA', availability: 'Waiting', locked: false, picking_type_id: 'operation-type-mrp-001', picking_type_name: 'Manufacturing' };
    const created = await firstRepository.executeMutation(create.mutation, { id: 'mo-picking-qa-001', values });
    expect(created).toMatchObject({ id: 'mo-picking-qa-001', picking_type_id: 'operation-type-mrp-001', row_version: 1, state: 'Draft' });
    await expect(firstRepository.executeMutation(create.mutation, { id: 'mo-picking-invalid', values: { ...values, quantity: 0 } })).rejects.toMatchObject({ status: 422, code: 'MRP_PICKING_MANUFACTURING_QUANTITY_INVALID' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_picking_dashboard_restart_b', ['schema', 'data']);
    expect(await secondRepository.query("SELECT picking_type_id, picking_type_name, quantity FROM mrp_productions WHERE id = 'mo-picking-qa-001'")).toEqual([{ picking_type_id: 'operation-type-mrp-001', picking_type_name: 'Manufacturing', quantity: 4 }]);
    second.close();
  });
});
