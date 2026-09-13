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

  test('persists extended fields and rejects invalid, duplicate, stale, or cross-company edits atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_equipment_extended_edit_migrations', ['schema', 'data']);

    const action = yaml('api/equipment.yaml').actions.find((candidate: any) => candidate.id === 'edit_maintenance_equipment');
    const detailAction = yaml('api/equipment-detail.yaml').actions.find((candidate: any) => candidate.id === 'edit_maintenance_equipment_detail');
    expect(action.permission).toBe('maintenance.manage');
    expect(detailAction.permission).toBe('maintenance.manage');
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_COMPANY_SCOPE_REQUIRED', status: 403 }),
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_WARRANTY_DATE_INVALID', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_NAME_EXISTS', status: 409 }),
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_NOT_FOUND', status: 404 }),
    ]));
    expect(detailAction.mutation.guards.map((guard: any) => guard.code)).toEqual(action.mutation.guards.map((guard: any) => guard.code));

    const values = {
      name: 'Acer Laptop Extended', serial_number: 'ACER-002-UPDATED', model: 'TravelMate X',
      vendor_reference: 'VENDOR-ACER', category: 'Computers', location: 'Office 3', owner: 'Demo User',
      technician: 'Alex Chen', team: 'Subcontractor', preventive_interval_days: 120,
      next_preventive_date: '2026-08-20', warranty_date: '2027-08-20', cost: 975.25,
      description: 'Extended-field edit persisted by the Maintenance parity contract.',
    };
    const edited = await repository.executeMutation(action.mutation, {
      id: 'equipment-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values,
    });
    expect(edited).toMatchObject({ id: 'equipment-demo-002', name: values.name, serial_number: values.serial_number, model: values.model, cost: 975.25, row_version: 2 });
    expect(new Date(edited.warranty_date).toISOString()).toBe('2027-08-20T00:00:00.000Z');

    const [persisted] = await repository.query('SELECT name, serial_number, model, location, preventive_interval_days, next_preventive_date, warranty_date, cost, description, row_version FROM maintenance_equipment WHERE id = ?', ['equipment-demo-002']);
    expect(persisted).toMatchObject({ name: values.name, serial_number: values.serial_number, model: values.model, location: values.location, preventive_interval_days: values.preventive_interval_days, cost: values.cost, description: values.description, row_version: 2 });
    expect(new Date(persisted.next_preventive_date).toISOString()).toBe('2026-08-20T00:00:00.000Z');
    expect(new Date(persisted.warranty_date).toISOString()).toBe('2027-08-20T00:00:00.000Z');

    const snapshot = persisted;
    await expect(repository.executeMutation(action.mutation, {
      id: 'equipment-demo-002', expected_row_version: 2, current_company_name: 'Core3 Demo Company',
      values: { ...values, warranty_date: '2026-02-31', location: 'Should not be written' },
    })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_EQUIPMENT_WARRANTY_DATE_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'equipment-demo-002', expected_row_version: 2, current_company_name: 'Core3 Demo Company',
      values: { ...values, name: 'CNC Mill 01', location: 'Should not be written' },
    })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_EQUIPMENT_NAME_EXISTS' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'missing-equipment', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values,
    })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_EQUIPMENT_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'equipment-demo-002', expected_row_version: 2, current_company_name: 'Other Company', values,
    })).rejects.toMatchObject({ status: 403, code: 'MAINTENANCE_EQUIPMENT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'equipment-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values,
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const [unchanged] = await repository.query('SELECT name, location, warranty_date, row_version FROM maintenance_equipment WHERE id = ?', ['equipment-demo-002']);
    expect(unchanged).toMatchObject({ name: snapshot.name, location: snapshot.location, row_version: 2 });
    expect(new Date(unchanged.warranty_date).toISOString()).toBe('2027-08-20T00:00:00.000Z');
    database.close();
  });
});
