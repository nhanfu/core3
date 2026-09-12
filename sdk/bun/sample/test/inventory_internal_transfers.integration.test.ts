import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Inventory internal transfers parity', () => {
  test('keeps source menu, page, and API contracts aligned', () => {
    const page = yaml('pages/internal.yaml');
    const api = yaml('api/internal.yaml');
    expect(page.page).toMatchObject({ id: 'internal', route: '/internal' });
    expect(page.page.auth.require).toEqual(['inventory.multi_location']);
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'calendar']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Reference', 'Contact', 'Scheduled Date', 'Source Document', 'Company', 'Status']);
    expect(yaml('manifest.yaml').menu.groups[0].items.map((item: any) => item.label)).toEqual(['Receipts', 'Deliveries', 'Internal', 'Physical Inventory']);
  });

  test('returns deterministic list, empty, and transport-error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'inventory_internal_test_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'inventory_internal_test_schema_migrations', ['schema', 'data']);
    const source = yaml('api/internal.yaml').datasources.find((item: any) => item.id === 'inventory_internal_transfers');
    expect((await repository.querySource(source, { q: null, state: null, scheduled_date: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['WH/INT/00001', 'WH/INT/00002', 'WH/INT/00003', 'WH/INT/00004']);
    expect((await repository.querySource(source, { q: 'WH/INT/00003', state: null, scheduled_date: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ state: 'Done', scheduled_date: '2026-01-18' });
    expect((await repository.querySource(source, { q: null, state: null, scheduled_date: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, state: null, scheduled_date: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_TRANSFER_DATA_UNAVAILABLE' });
  });

  test('does not expose internal transfers to the ordinary read permission', () => {
    expect(yaml('permissions.yaml').permissions).toContain('inventory.multi_location');
    expect(yaml('manifest.yaml').menu.groups[0].items.find((item: any) => item.label === 'Internal')).toMatchObject({ permission: 'inventory.multi_location' });
    expect(yaml('pages/internal.yaml').components[0].actions).toBeUndefined();
  });
});
