import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance equipment lifecycle parity', () => {
  test('keeps Odoo equipment views and page/API actions separated', () => {
    const page = yaml('pages/equipment-detail.yaml');
    const api = yaml('api/equipment-detail.yaml');
    const listApi = yaml('api/equipment.yaml');
    expect(page.page).toMatchObject({ id: 'equipment-detail', route: '/equipments/detail' });
    expect(page.components[0]).not.toHaveProperty('query');
    expect(page.components[0].header_actions.map((action: any) => action.label)).toEqual(['Edit', 'Archive', 'Reopen', 'Delete']);
    expect(api.page).toEqual({ id: 'equipment-detail' });
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'open_maintenance_requests_from_equipment',
      'edit_maintenance_equipment_detail',
      'archive_maintenance_equipment_detail',
      'reopen_maintenance_equipment_detail',
      'delete_maintenance_equipment_detail',
    ]);
    expect(listApi.actions.map((action: any) => action.id)).toEqual([
      'create_maintenance_equipment',
      'edit_maintenance_equipment',
      'archive_maintenance_equipment',
      'reopen_maintenance_equipment',
      'delete_maintenance_equipment',
    ]);
    expect(listApi.actions.filter((action: any) => action.type !== 'navigate').every((action: any) => action.permission === 'maintenance.manage')).toBe(true);
    expect(api.actions.slice(1).every((action: any) => action.permission === 'maintenance.manage')).toBe(true);
  });

  test('supports deterministic edit, archive, reopen, concurrency, and linked-delete guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_equipment_lifecycle_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_equipment_lifecycle_migrations', ['schema', 'data']);

    const list = yaml('api/equipment.yaml').datasources[0];
    const rows = await repository.querySource(list, { q: null, state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['equipment-demo-002', 'equipment-demo-003', 'equipment-demo-001']);

    const actions = yaml('api/equipment.yaml').actions;
    const action = (id: string) => actions.find((item: any) => item.id === id);
    const edited = await repository.executeMutation(action('edit_maintenance_equipment').mutation, {
      id: 'equipment-demo-002',
      expected_row_version: 1,
      values: { name: 'Acer Laptop Pro', model: 'TravelMate X' },
    });
    expect(edited).toMatchObject({ id: 'equipment-demo-002', name: 'Acer Laptop Pro', model: 'TravelMate X', row_version: 2 });
    await expect(repository.executeMutation(action('edit_maintenance_equipment').mutation, {
      id: 'equipment-demo-002', expected_row_version: 1, values: { name: 'Stale Acer' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archived = await repository.executeMutation(action('archive_maintenance_equipment').mutation, { id: 'equipment-demo-002', expected_row_version: 2, values: { archived: true, state: 'Archived' } });
    expect(archived).toMatchObject({ archived: true, state: 'Archived', row_version: 3 });
    const reopened = await repository.executeMutation(action('reopen_maintenance_equipment').mutation, { id: 'equipment-demo-002', expected_row_version: 3, values: { archived: false, state: 'Active' } });
    expect(reopened).toMatchObject({ archived: false, state: 'Active', row_version: 4 });

    await expect(repository.executeMutation(action('delete_maintenance_equipment').mutation, { id: 'equipment-demo-002', expected_row_version: 4 })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_EQUIPMENT_IN_USE' });
    const deleted = await repository.executeMutation(action('delete_maintenance_equipment').mutation, { id: 'equipment-demo-003', expected_row_version: 1 });
    expect(deleted).toMatchObject({ id: 'equipment-demo-003' });
    expect((await repository.querySource(list, { q: null, state: 'Archived' }, 0, 50)).data).toEqual([]);
  });
});
