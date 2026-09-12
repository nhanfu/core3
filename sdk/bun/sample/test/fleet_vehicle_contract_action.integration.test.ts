import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet vehicle Contracts stat action parity', () => {
  test('maps the Odoo Contracts stat button and action context', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const actionSource = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_cost_views.xml', 'utf8');
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    const contracts = yaml('pages/contracts.yaml');
    const contractApi = yaml('api/contracts.yaml');
    const stat = page.components[0].stat_buttons.find((entry: any) => entry.id === 'open_fleet_vehicle_contracts');
    const action = api.actions.find((entry: any) => entry.id === 'open_fleet_vehicle_contracts');

    expect(source).toContain('string="Contracts"');
    expect(source).toContain('icon="fa-book"');
    expect(source).toContain("context=\"{'xml_id':'fleet_vehicle_log_contract_action', 'search_default_inactive': not active}\"");
    expect(actionSource).toContain('<field name="name">Contracts</field>');
    expect(actionSource).toContain('<field name="view_mode">list,kanban,form,graph,pivot,activity</field>');
    expect(stat).toEqual({ id: 'open_fleet_vehicle_contracts', label: 'Contracts', value_field: 'contract_count', permission: 'fleet.read' });
    expect(action).toMatchObject({
      type: 'navigate', permission: 'fleet.read', navigate_to: '/fleet/contracts',
      params: { vehicle_id: '{state.id}', search_default_open: true, search_default_inactive: '{state.archived}' },
    });
    expect(contracts.page).toMatchObject({ id: 'fleet-contracts', route: '/fleet/contracts' });
    expect(contractApi.page.id).toBe(contracts.page.id);
    expect(contracts.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'card', 'form', 'graph', 'pivot', 'activity']);
  });

  test('exposes a deterministic count and vehicle-scoped contract rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_contract_action', ['schema', 'data']);
    const detail = yaml('api/vehicle-detail.yaml').datasources[0];
    const contracts = yaml('api/contracts.yaml').datasources.find((entry: any) => entry.id === 'fleet_contracts');

    const vehicle = (await repository.querySource(detail, { id: 'fleet-demo-001' }, 0, 1)).data;
    expect(vehicle.contract_count).toBe(4);
    expect((await repository.querySource(contracts, { q: null, vehicle_id: 'fleet-demo-001', contract_type: null, status: null }, 0, 50)).data).toHaveLength(3);
    expect(detail.query).toContain("c.status <> 'Closed'");
    expect(contracts.query).toContain(':vehicle_id IS NULL OR c.vehicle_id = :vehicle_id');
    database.close();
  });
});
