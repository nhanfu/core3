import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet Vehicles visual contract', () => {
  test('preserves the Odoo child-menu and default action order', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const costSource = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_cost_views.xml', 'utf8');
    const manifest = yaml('manifest.yaml');
    const items = manifest.menu.groups.find((group: any) => group.id === 'vehicles').items;
    expect(items.map((item: any) => item.label)).toEqual(['Fleet', 'Contracts', 'Services', 'Odometers']);
    expect(source).toMatch(/id="fleet_vehicle_menu"[^>]*sequence="0"/s);
    expect(costSource).toMatch(/id="fleet_vehicle_log_contract_menu"[^>]*sequence="2"/s);
    expect(costSource).toMatch(/id="fleet_vehicle_log_services_menu"[^>]*sequence="3"/s);
    expect(source).toMatch(/id=['"]fleet_vehicle_odometer_menu['"][^>]*sequence="10"/s);

    const page = yaml('pages/vehicles.yaml').components[0];
    expect(page.views.map((view: any) => view.id)).toEqual(['kanban', 'list']);
    expect(source).toContain('<field name="view_mode">kanban,list,form,pivot,activity</field>');
  });
});
