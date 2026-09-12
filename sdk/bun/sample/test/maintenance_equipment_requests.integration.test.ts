import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance equipment request stat action parity', () => {
  test('joins the equipment form stat action and request filter by page id', () => {
    const detailPage = yaml('pages/equipment-detail.yaml');
    const detailApi = yaml('api/equipment-detail.yaml');
    const requestPage = yaml('pages/requests.yaml');
    const requestApi = yaml('api/requests.yaml');
    const form = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const stat = form.stat_buttons.find((button: any) => button.id === 'open_maintenance_requests_from_equipment');
    const action = detailApi.actions.find((candidate: any) => candidate.id === stat.id);
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(detailPage.datasources).toBeUndefined();
    expect(requestPage.datasources).toBeUndefined();
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(requestApi.page.id).toBe(requestPage.page.id);
    expect(discovered.pageDatasources.get('equipment-detail')).toContain('maintenance_equipment_detail');
    expect(discovered.pageDatasources.get('maintenance-requests')).toContain('maintenance_requests');
    expect(stat).toEqual({ id: 'open_maintenance_requests_from_equipment', label: 'Maintenance', value_field: 'maintenance_open_count', permission: 'maintenance.read' });
    expect(action).toMatchObject({ type: 'navigate', permission: 'maintenance.read', navigate_to: '/maintenance-requests', params: { equipment_id: '{row.id}' } });
    expect(detailApi.datasources[0].query).toContain('maintenance_open_count');
    expect(requestApi.datasources.find((source: any) => source.id === 'maintenance_requests').query).toContain(':equipment_id');
    expect(requestPage.components[0].filters).toContainEqual({ field: 'equipment_id', label: 'Equipment', options_source: 'maintenance_equipment_lookup' });
  });

  test('serves deterministic request counts, filtered rows, empty, and missing equipment states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'maintenance_equipment_request_stat_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'maintenance_equipment_request_stat_migrations', ['schema', 'data']);

    const detail = yaml('api/equipment-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'equipment-demo-002', fixture_state: null }, 0, 1)).data).toMatchObject({
      id: 'equipment-demo-002',
      name: 'Acer Laptop',
      maintenance_open_count: 1,
    });
    await expect(repository.querySource(detail, { id: 'equipment-demo-002', fixture_state: 'not_found' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_EQUIPMENT_NOT_FOUND' });
    expect((await repository.querySource(detail, { id: 'equipment-missing', fixture_state: null }, 0, 1)).data).toEqual({});

    const requests = yaml('api/requests.yaml').datasources.find((source: any) => source.id === 'maintenance_requests');
    const filtered = await repository.querySource(requests, {
      q: null, equipment_id: 'equipment-demo-002', state: null, priority: null, archived: null, fixture_state: null,
    }, 0, 50);
    expect(filtered.data.map((row: any) => row.id)).toEqual(['maintenance-demo-002', 'maintenance-demo-004']);
    expect((await repository.querySource(requests, {
      q: null, equipment_id: 'equipment-demo-002', state: null, priority: null, archived: null, fixture_state: 'empty',
    }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(requests, {
      q: 'no such request', equipment_id: 'equipment-demo-002', state: null, priority: null, archived: null, fixture_state: null,
    }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(requests, {
      q: null, equipment_id: 'equipment-demo-002', state: null, priority: null, archived: null, fixture_state: 'transport_error',
    }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MAINTENANCE_REQUESTS_UNAVAILABLE' });

    database.close();
  });

  test('keeps the equipment stat and filtered request action read-protected', () => {
    const detailApi = yaml('api/equipment-detail.yaml');
    const requestApi = yaml('api/requests.yaml');
    expect(detailApi.datasources[0].permission).toBe('maintenance.read');
    expect(detailApi.actions[0]).toEqual({ id: 'open_maintenance_requests_from_equipment', type: 'navigate', permission: 'maintenance.read', navigate_to: '/maintenance-requests', params: { equipment_id: '{row.id}' } });
    expect(requestApi.datasources.find((source: any) => source.id === 'maintenance_requests').permission).toBe('maintenance.read');
  });
});
