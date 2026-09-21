import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Fleet manufacturer Models stat action parity', () => {
  test('maps Odoo action_brand_model to a permissioned filtered Models route', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_model_brand.py', 'utf8');
    expect(source).toContain('def action_brand_model(self):');
    expect(source).toContain("'view_mode': 'list,form'");
    expect(source).toContain("'res_model': 'fleet.vehicle.model'");
    expect(source).toContain("'search_default_brand_id': self.id");
    expect(source).toContain("'default_brand_id': self.id");

    const page = yaml('pages/manufacturer-detail.yaml');
    const api = yaml('api/manufacturer-detail.yaml');
    const modelsPage = yaml('pages/models.yaml');
    const modelsApi = yaml('api/models.yaml');
    expect(api.page.id).toBe(page.page.id);
    expect(modelsApi.page.id).toBe(modelsPage.page.id);
    expect(page.components[0].stat_buttons).toContainEqual({ id: 'view_fleet_manufacturer_models', label: 'Models', value_field: 'model_count', permission: 'fleet.read' });
    expect(action(api, 'view_fleet_manufacturer_models')).toEqual({
      id: 'view_fleet_manufacturer_models',
      type: 'navigate',
      permission: 'fleet.read',
      navigate_to: '/fleet/config/models',
      params: { brand_id: '{state.id}' },
    });
    expect(modelsPage.components[0].filters).toContainEqual({ field: 'brand_id', label: 'Manufacturer', options_source: 'fleet_model_manufacturers' });
    expect(modelsApi.datasources.find((entry: any) => entry.id === 'fleet_models').query).toContain(':brand_id');

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('fleet-manufacturer-detail')).toContain('fleet_manufacturer_detail');
    expect(discovered.pageDatasources.get('fleet-models')).toContain('fleet_models');
  });

  test('filters durable Models by the selected manufacturer after migration replay', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_manufacturer_models_action', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_manufacturer_models_action', ['schema', 'data']);

    const source = yaml('api/models.yaml').datasources.find((entry: any) => entry.id === 'fleet_models');
    const ford = await repository.querySource(source, { q: null, brand_id: 'fleet-brand-020', active: null, contains_vehicle: null, vehicle_type: null, category_id: null, fixture_state: null }, 0, 50);
    expect(ford.data).toMatchObject([{ id: 'fleet-model-001', brand_id: 'fleet-brand-020', brand_name: 'Ford', name: 'Focus' }]);
    expect(ford.data).toHaveLength(1);

    const nissan = await repository.querySource(source, { q: null, brand_id: 'fleet-brand-046', active: null, contains_vehicle: null, vehicle_type: null, category_id: null, fixture_state: null }, 0, 50);
    expect(nissan.data).toMatchObject([{ brand_id: 'fleet-brand-046', brand_name: 'Nissan', name: 'Micra' }]);
    expect(nissan.data).toHaveLength(1);
    database.close();
  });
});
