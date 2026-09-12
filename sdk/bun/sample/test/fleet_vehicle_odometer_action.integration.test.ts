import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet vehicle Odometer stat action parity', () => {
  test('maps the Odoo vehicle stat action to the existing Odometers surface', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    const odometers = yaml('pages/odometers.yaml');
    const odometerApi = yaml('api/odometers.yaml');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/security/ir.model.access.csv', 'utf8');

    expect(source).toContain("context=\"{'xml_id':'fleet_vehicle_odometer_action'}\"");
    expect(source).toContain('string="Odometer"');
    expect(source).toContain('invisible="vehicle_type != \'car\'"');
    expect(source).toContain('<field name="view_mode">list,form,graph</field>');
    expect(access).toContain('fleet_vehicle_odometer_access_right,fleet_vehicle_odometer_access_right,model_fleet_vehicle_odometer,fleet_group_user,1,1,1,1');
    expect(page.components[0].stat_buttons).toContainEqual({
      id: 'open_fleet_vehicle_odometers', label: 'Odometer', value_field: 'odometer_count',
      permission: 'fleet.read', show_if: "state.vehicle_type === 'car'",
    });
    expect(api.actions.find((entry: any) => entry.id === 'open_fleet_vehicle_odometers')).toMatchObject({
      type: 'navigate', permission: 'fleet.read', navigate_to: '/fleet/odometers',
      params: { vehicle_id: '{state.id}' },
    });
    expect(odometers.page).toMatchObject({ id: 'fleet-odometers', route: '/fleet/odometers' });
    expect(odometerApi.page.id).toBe(odometers.page.id);
    expect(odometerApi.datasources.find((entry: any) => entry.id === 'fleet_odometers').permission).toBe('fleet.read');
    expect(odometers.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'graph']);
    expect(odometers.components[0].columns.map((column: any) => column.label)).toEqual(['Date', 'Vehicle', 'Driver', 'Odometer Value', 'Unit']);
  });

  test('exposes a deterministic vehicle odometer count and scoped rows', () => {
    const detail = yaml('api/vehicle-detail.yaml').datasources[0];
    const list = yaml('api/odometers.yaml').datasources.find((entry: any) => entry.id === 'fleet_odometers');
    expect(detail.query).toContain('AS odometer_count');
    expect(list.query).toContain(':vehicle_id IS NULL OR o.vehicle_id = :vehicle_id');
    expect(list.query).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
