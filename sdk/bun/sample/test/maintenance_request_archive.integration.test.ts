import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance Request cancel and reopen parity', () => {
  test('binds Odoo Cancel and Reopen Request to page-owned APIs', () => {
    const page = yaml('pages/request-detail.yaml');
    const detail = yaml('api/request-detail.yaml');
    const list = yaml('api/requests.yaml');
    expect(page.page).toMatchObject({ id: 'maintenance-request-detail', route: '/maintenance-requests/detail' });
    expect(page.components[0].header_actions.map((action: any) => action.label)).toEqual(['Cancel', 'Reopen Request', 'Update kanban state']);
    expect(page.components[0]).not.toHaveProperty('query');
    expect(detail.page.id).toBe('maintenance-request-detail');
    expect(list.page.id).toBe('maintenance-requests');
    expect(detail.datasources[0].query).toContain('archived');
    for (const source of [list, detail]) {
      expect(source.actions.filter((action: any) => action.id.includes('archive_maintenance_request') || action.id.includes('reopen_maintenance_request')).every((action: any) => action.permission === 'maintenance.write')).toBe(true);
    }
  });

  test('archives and reopens deterministically with permission, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_request_archive_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_request_archive_migrations', ['schema', 'data']);
    const api = yaml('api/requests.yaml');
    const source = api.datasources.find((item: any) => item.id === 'maintenance_requests');
    expect((await repository.querySource(source, { q: null, equipment_id: null, category_id: null, state: null, priority: null, archived: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-demo-001', 'maintenance-demo-002', 'maintenance-demo-003', 'maintenance-demo-004']);
    const archive = api.actions.find((item: any) => item.id === 'archive_maintenance_request');
    const reopen = api.actions.find((item: any) => item.id === 'reopen_maintenance_request');
    await expect(repository.executeMutation(archive.mutation, { id: 'missing-request', expected_row_version: 1, values: { archived: true } })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
    await expect(repository.executeMutation(archive.mutation, { id: 'maintenance-demo-001', expected_row_version: 0, values: { archived: true } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archived = await repository.executeMutation(archive.mutation, { id: 'maintenance-demo-001', expected_row_version: 1, values: { archived: true } });
    expect(archived).toMatchObject({ id: 'maintenance-demo-001', archived: true, row_version: 2 });
    expect((await repository.querySource(source, { q: null, equipment_id: null, category_id: null, state: null, priority: null, archived: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-demo-001']);
    const reopened = await repository.executeMutation(reopen.mutation, { id: 'maintenance-demo-001', expected_row_version: 2, values: { archived: false } });
    expect(reopened).toMatchObject({ id: 'maintenance-demo-001', archived: false, row_version: 3 });
  });
});
