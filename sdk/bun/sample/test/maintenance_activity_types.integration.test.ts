import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance Activity Types parity', () => {
  test('registers the group-restricted source action and separates page/API/detail contracts', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toContainEqual({ path: '/maintenance-activity-types', label: 'Activity Types', icon: 'activity', permission: 'maintenance.settings' });

    const page = yaml('pages/activity-types.yaml');
    const api = yaml('api/activity-types.yaml');
    const detail = yaml('pages/activity-type-detail.yaml');
    const detailApi = yaml('api/activity-type-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'maintenance-activity-types', route: '/maintenance-activity-types', auth: { require: ['maintenance.settings'] } });
    expect(page.components[0].datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'maintenance-activity-types' });
    expect(detail.page).toMatchObject({ id: 'maintenance-activity-type-detail', route: '/maintenance-activity-types/detail' });
    expect(detailApi.page).toEqual({ id: 'maintenance-activity-type-detail' });
    expect(discovered.pages.get('maintenance-activity-types')?.config.page.id).toBe('maintenance-activity-types');
    expect(discovered.pageDatasources.get('maintenance-activity-types')).toContain('maintenance_activity_types');
    expect(discovered.pageDatasources.get('maintenance-activity-type-detail')).toContain('maintenance_activity_type_detail');
  });

  test('matches the observed Odoo list/form surface and protects standard rows', () => {
    const page = yaml('pages/activity-types.yaml');
    const list = page.components[0];
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card', 'form']);
    expect(list.columns.map((column: any) => column.label)).toEqual([' ', 'Name', 'Default Summary', 'Planned in', 'Type', ' ']);
    expect(list.row_open_action).toBe('view_maintenance_activity_type');
    expect(list.row_double_click_action).toBe('view_maintenance_activity_type');
    const detail = yaml('pages/activity-type-detail.yaml').components[0];
    expect(detail.groups.map((group: any) => group.title)).toEqual(['Activity Settings', 'Next Activity']);
    expect(detail.notebook.tabs[0].label).toBe('Default Note');
    const actions = yaml('api/activity-types.yaml').actions;
    expect(actions.map((action: any) => action.id)).toEqual([
      'create_maintenance_activity_type', 'view_maintenance_activity_type', 'edit_maintenance_activity_type',
      'archive_maintenance_activity_type', 'restore_maintenance_activity_type', 'delete_maintenance_activity_type',
    ]);
    expect(actions.every((action: any) => action.permission === 'maintenance.settings')).toBe(true);
    expect(actions[0].mutation.guards).toHaveLength(2);
    expect(actions[3].mutation.concurrency).toEqual({ required: true });
    expect(actions[5].mutation.guards[0].code).toBe('MAINTENANCE_ACTIVITY_TYPE_PROTECTED');
  });

  test('returns deterministic fixtures, filters, empty/not-found states, and manager-only sources', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_activity_types_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_activity_types_test_migrations', ['schema', 'data']);
    const source = yaml('api/activity-types.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(6);
    expect(rows.data.map((row: any) => row.name)).toEqual(['To-Do', 'Email', 'Call', 'Meeting', 'Maintenance Request', 'Document']);
    expect(rows.data[0]).toMatchObject({ summary: 'To-Do', planned_in: '5 days', delay_from_label: 'after previous activity deadline' });
    expect((await repository.querySource(source, { q: 'request', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Maintenance Request']);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = yaml('api/activity-type-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect(source.permission).toBe('maintenance.settings');
    expect(detail.permission).toBe('maintenance.settings');
    expect(source.error_states.transport_error.code).toBe('MAINTENANCE_ACTIVITY_TYPES_UNAVAILABLE');
  });
});
