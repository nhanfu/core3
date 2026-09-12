import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance Equipment Categories delete action parity', () => {
  test('binds the Odoo category action and delete affordance to page-owned APIs', () => {
    const page = yaml('pages/categories.yaml');
    const detail = yaml('pages/category-detail.yaml');
    const api = yaml('api/categories.yaml');
    const detailApi = yaml('api/category-detail.yaml');

    expect(yaml('manifest.yaml').menu.groups[3].items[1]).toMatchObject({ path: '/equipement-categories', label: 'Equipment Categories', permission: 'maintenance.manage' });
    expect(page.page).toMatchObject({ id: 'maintenance-categories', route: '/equipement-categories' });
    expect(detail.page).toMatchObject({ id: 'maintenance-category-detail', route: '/equipement-categories/detail' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(api.page.id).toBe('maintenance-categories');
    expect(detailApi.page.id).toBe('maintenance-category-detail');
    expect(api.actions.find((action: any) => action.id === 'delete_maintenance_category')).toMatchObject({ permission: 'maintenance.manage', operation: 'delete' });
    expect(detailApi.actions.find((action: any) => action.id === 'delete_maintenance_category_detail')).toMatchObject({ permission: 'maintenance.manage', operation: 'delete' });
    expect(detail.components[0].header_actions.map((action: any) => action.label)).toEqual(['Edit', 'Delete']);
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(detailApi.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 }, transport_error: { status: 503 } });
  });

  test('supports deterministic CRUD state reads, permission errors, linked-record 409, not-found 404, and stale 409 guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_category_delete_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_category_delete_migrations', ['schema', 'data']);

    const listApi = yaml('api/categories.yaml');
    const source = listApi.datasources[0];
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Computers', 'Monitors', 'Phones', 'Printers', 'Software']);
    expect((await repository.querySource(source, { q: null, active: 'active', fixture_state: null }, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'MAINTENANCE_CATEGORIES_FORBIDDEN' });

    const action = listApi.actions.find((item: any) => item.id === 'delete_maintenance_category');
    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-category-computers', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_CATEGORY_IN_USE' });
    await expect(repository.executeMutation(action.mutation, { id: 'missing-maintenance-category', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_CATEGORY_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-category-phones', expected_row_version: 0 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const deleted = await repository.executeMutation(action.mutation, { id: 'maintenance-category-phones', expected_row_version: 1 });
    expect(deleted).toMatchObject({ id: 'maintenance-category-phones', expected_row_version: 1 });
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Computers', 'Monitors', 'Printers', 'Software']);
  });
});
