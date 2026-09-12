import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance equipment category stat actions parity', () => {
  test('binds Odoo category form stat actions to filtered page-owned APIs', () => {
    const page = yaml('pages/category-detail.yaml');
    const detailApi = yaml('api/category-detail.yaml');
    const equipment = yaml('api/equipment.yaml');
    const requests = yaml('api/requests.yaml');

    expect(page.page).toMatchObject({ id: 'maintenance-category-detail', route: '/equipement-categories/detail' });
    expect(page.components[0].stat_buttons).toEqual([
      { id: 'open_maintenance_equipment_from_category', label: 'Equipment', value_field: 'equipment_count', permission: 'maintenance.read' },
      { id: 'open_maintenance_requests_from_category', label: 'Maintenance', value_field: 'maintenance_open_count', permission: 'maintenance.read' },
    ]);
    expect(detailApi.page.id).toBe('maintenance-category-detail');
    expect(detailApi.datasources).toHaveLength(1);
    expect(detailApi.actions.slice(0, 2)).toEqual([
      { id: 'open_maintenance_equipment_from_category', type: 'navigate', permission: 'maintenance.read', navigate_to: '/equipments', params: { category_id: '{row.id}' } },
      { id: 'open_maintenance_requests_from_category', type: 'navigate', permission: 'maintenance.read', navigate_to: '/maintenance-requests', params: { category_id: '{row.id}' } },
    ]);
    expect(equipment.datasources.find((source: any) => source.id === 'maintenance_equipment').query).toContain(':category_id');
    expect(requests.datasources.find((source: any) => source.id === 'maintenance_requests').query).toContain(':category_id');
    expect(yaml('pages/equipment.yaml').components[0].filters).toContainEqual(expect.objectContaining({ field: 'category_id', label: 'Category', options_source: 'maintenance_equipment_category_lookup' }));
    expect(yaml('pages/requests.yaml').components[0].filters).toContainEqual(expect.objectContaining({ field: 'category_id', label: 'Category', options_source: 'maintenance_request_category_lookup' }));
  });

  test('returns deterministic counts and category-filtered equipment and requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_category_stat_actions_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_category_stat_actions_migrations', ['schema', 'data']);

    const category = yaml('api/category-detail.yaml').datasources[0];
    const detail = await repository.querySource(category, { id: 'maintenance-category-computers', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ equipment_count: 2, maintenance_open_count: 2 });

    const equipment = yaml('api/equipment.yaml').datasources.find((source: any) => source.id === 'maintenance_equipment');
    const equipmentRows = await repository.querySource(equipment, { q: null, category_id: 'maintenance-category-computers', state: null }, 0, 50);
    expect(equipmentRows.data.map((row: any) => row.name)).toEqual(['Acer Laptop', 'CNC Mill 01']);

    const requests = yaml('api/requests.yaml').datasources.find((source: any) => source.id === 'maintenance_requests');
    const requestRows = await repository.querySource(requests, { q: null, equipment_id: null, category_id: 'maintenance-category-computers', state: null, priority: null, archived: null, fixture_state: null }, 0, 50);
    expect(requestRows.data).toHaveLength(4);
    expect((await repository.querySource(requests, { q: null, equipment_id: null, category_id: 'maintenance-category-monitors', state: null, priority: null, archived: null, fixture_state: null }, 0, 50)).data).toEqual([]);
  });
});
