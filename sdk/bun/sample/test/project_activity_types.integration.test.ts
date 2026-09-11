import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project Activity Types parity', () => {
  test('registers the source action and keeps page/API/detail contracts separate', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toContainEqual({ path: '/project-activity-types', label: 'Activity Types', icon: 'activity', permission: 'project.manage' });

    const page = yaml('pages/activity-types.yaml');
    const api = yaml('api/activity-types.yaml');
    const detail = yaml('pages/activity-type-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-activity-types', route: '/project-activity-types', auth: { require: ['project.manage'] } });
    expect(api.page).toEqual({ id: 'project-activity-types' });
    expect(detail.page).toMatchObject({ id: 'activity-type-detail', route: '/project-activity-types/detail' });
    expect(discovered.pages.get('project-activity-types')?.config.page.id).toBe('project-activity-types');
    expect(discovered.pageDatasources.get('project-activity-types')).toContain('project_activity_types');
    expect(discovered.pageDatasources.get('activity-type-detail')).toContain('project_activity_type_detail');
  });

  test('matches Odoo list, mobile kanban, form sections, fields, and guards', () => {
    const page = yaml('pages/activity-types.yaml');
    const list = page.components[0];
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'card', 'form']);
    expect(list.columns.map((column: any) => column.label)).toEqual([' ', 'Name', 'Default Summary', 'Planned in', 'Type', ' ']);
    expect(list.form_view).toBeUndefined();
    expect(list.row_open_action).toBe('view_project_activity_type');
    expect(list.row_double_click_action).toBe('view_project_activity_type');
    expect(list.filters[0]).toMatchObject({ field: 'active', label: 'Status' });
    const detail = yaml('pages/activity-type-detail.yaml').components[0];
    expect(detail.groups.map((group: any) => group.title)).toEqual(['Activity Settings', 'Next Activity']);
    expect(detail.notebook.tabs[0].label).toBe('Default Note');
    const actions = yaml('api/activity-types.yaml').actions;
    expect(actions.map((action: any) => action.id)).toEqual([
      'create_project_activity_type', 'view_project_activity_type', 'edit_project_activity_type', 'archive_project_activity_type',
      'unarchive_project_activity_type', 'delete_project_activity_type',
    ]);
    expect(actions[1]).toMatchObject({
      id: 'view_project_activity_type',
      type: 'navigate',
      navigate_to: '/project-activity-types/detail',
      params: { id: '{row.id}' },
    });
    expect(actions[2]).toMatchObject({
      id: 'edit_project_activity_type',
      type: 'navigate',
      navigate_to: '/project-activity-types/detail',
    });
    expect(actions[0].mutation.guards).toHaveLength(2);
    expect(actions[3].mutation.concurrency).toEqual({ required: true });
    expect(actions[3].mutation.guards[0].code).toBe('PROJECT_ACTIVITY_TYPE_PROTECTED');
    expect(actions[5].mutation.guards[0].code).toBe('PROJECT_ACTIVITY_TYPE_PROTECTED');
  });

  test('returns deterministic active fixtures, filters, empty/not-found states, and stable permissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_activity_types_test_migrations', ['schema', 'data']);
    const source = yaml('api/activity-types.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(5);
    expect(rows.data.map((row: any) => row.id)).toEqual([
      'project-activity-type-todo', 'project-activity-type-email', 'project-activity-type-call',
      'project-activity-type-meeting', 'project-activity-type-document',
    ]);
    expect(rows.data[0]).toMatchObject({ name: 'To-Do', summary: 'To-Do', planned_in: '5 days', delay_from_label: 'after previous activity deadline' });
    expect((await repository.querySource(source, { q: 'call', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Call']);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = yaml('api/activity-type-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect(source.permission).toBe('project.manage');
    expect(detail.permission).toBe('project.manage');
    expect(source.error_states.transport_error.code).toBe('PROJECT_ACTIVITY_TYPES_UNAVAILABLE');
    expect(detail.error_states.transport_error.code).toBe('PROJECT_ACTIVITY_TYPE_DETAIL_UNAVAILABLE');
  });
});
