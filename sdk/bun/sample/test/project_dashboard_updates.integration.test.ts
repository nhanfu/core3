import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project Dashboard and Updates parity', () => {
  test('keeps the embedded Dashboard action and update form API-owned by page id', () => {
    const projectPage = yaml('pages/project-detail.yaml');
    const projectApi = yaml('api/project-detail.yaml');
    const dashboardPage = yaml('pages/project-dashboard.yaml');
    const dashboardApi = yaml('api/project-dashboard.yaml');
    const updatePage = yaml('pages/project-update-detail.yaml');
    const updateApi = yaml('api/project-update-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(projectPage.datasources).toBeUndefined();
    expect(projectPage.components[0].stat_buttons).toEqual([
      { id: 'open_project_dashboard', label: 'Dashboard', value_field: 'update_summary', permission: 'project.read' },
    ]);
    expect(projectApi.page).toEqual({ id: 'project-detail' });
    expect(projectApi.actions[0]).toMatchObject({ id: 'open_project_dashboard', navigate_to: '/projects/detail/dashboard' });
    expect(dashboardPage.datasources).toBeUndefined();
    expect(dashboardApi.page).toEqual({ id: 'project-dashboard' });
    expect(updatePage.datasources).toBeUndefined();
    expect(updateApi.page).toEqual({ id: 'project-update-detail' });
    expect(discovered.pages.get('project-dashboard')?.config.page.route).toBe('/projects/detail/dashboard');
    expect(discovered.pageDatasources.get('project-dashboard')).toEqual([
      'project_dashboard_stats', 'project_dashboard_updates', 'project_dashboard_milestones',
    ]);
    expect(discovered.pageDatasources.get('project-update-detail')).toEqual(['project_update_detail']);
  });

  test('matches Odoo Dashboard view order, labels, update fields, and permissions', () => {
    const page = yaml('pages/project-dashboard.yaml');
    const updateList = page.components.find((component: any) => component.source === 'project_dashboard_updates');
    const updateDetail = yaml('pages/project-update-detail.yaml').components[0];
    expect(page.components.map((component: any) => component.type)).toEqual(['StatRow', 'ListView', 'ListView']);
    expect(updateList.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'form']);
    expect(updateList.views[0].group_by).toBe('');
    expect(updateList.columns.map((column: any) => column.label)).toEqual(['Name', 'Author', 'Date', 'Progress', 'Status', ' ']);
    expect(updateList.filters[0]).toMatchObject({ field: 'status', label: 'Status' });
    expect(updateList.row_open_action).toBe('view_project_update');
    expect(updateList.form_view).toEqual({ page: 'apps/services/project/pages/project-update-detail.yaml', side_panel: true });
    expect(updateDetail).toMatchObject({ type: 'OdooFormView', source: 'project_update_detail', editable: true, status_field: 'status' });
    expect(updateDetail.groups.flatMap((group: any) => group.fields).map((field: any) => field.label)).toEqual([
      'Project', 'Author', 'Status', 'Progress', 'Date', 'Tasks', 'Description', 'Record version',
    ]);
    expect(yaml('api/project-dashboard.yaml').actions.map((action: any) => action.id)).toEqual([
      'create_project_update', 'view_project_update', 'edit_project_update', 'delete_project_update',
    ]);
    expect(yaml('api/project-update-detail.yaml').actions.map((action: any) => action.id)).toEqual([
      'back_to_project_dashboard', 'edit_project_update', 'delete_project_update',
    ]);
    expect(yaml('api/project-dashboard.yaml').actions[0].permission).toBe('project.write');
    expect(yaml('api/project-dashboard.yaml').actions[2].mutation.concurrency).toEqual({ required: true });
    expect(yaml('api/project-dashboard.yaml').actions[3].mutation.operation).toBe('delete');
  });

  test('returns deterministic dashboard data and enforces update CRUD validation/conflicts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_dashboard_updates_test_migrations', ['schema', 'data']);
    const dashboard = yaml('api/project-dashboard.yaml');
    const stats = dashboard.datasources.find((source: any) => source.id === 'project_dashboard_stats');
    const updates = dashboard.datasources.find((source: any) => source.id === 'project_dashboard_updates');
    const statsResult = await repository.querySource(stats, { id: 'project-demo-001', fixture_state: null }, 0, 1);
    expect(statsResult.data).toMatchObject({ name: 'Core3 Implementation', task_summary: '3 / 7', hours: 82 });
    const updateResult = await repository.querySource(updates, { id: 'project-demo-001', q: null, status: null, fixture_state: null }, 0, 50);
    expect(updateResult.data.map((row: any) => row.id)).toEqual(['project-update-001', 'project-update-002']);
    expect(updateResult.data[0]).toMatchObject({ name: 'Construction', status: 'on_track', progress: 30, user_name: 'Mitchell Admin', date: '2026-01-15' });
    expect((await repository.querySource(updates, { id: 'project-demo-001', q: 'approval', status: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['project-update-002']);
    expect((await repository.querySource(updates, { id: 'project-demo-001', q: null, status: 'at_risk', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(updates, { id: 'project-demo-001', q: null, status: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = dashboard.actions.find((action: any) => action.id === 'create_project_update');
    const created = await repository.executeMutation(create.mutation, {
      project_id: 'project-demo-001',
      values: { project_id: 'project-demo-001', name: 'Release Review', status: 'at_risk', progress: 72, date: '2026-01-15', description: 'Review the release checklist.' },
    });
    expect(created).toMatchObject({ project_id: 'project-demo-001', name: 'Release Review', status: 'at_risk', progress: 72 });
    const update = dashboard.actions.find((action: any) => action.id === 'edit_project_update');
    const updated = await repository.executeMutation(update.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { name: 'Release Review Complete', status: 'done', progress: 100, date: '2026-01-15', description: 'Review completed.', row_version: 1 },
    });
    expect(updated).toMatchObject({ id: created.id, name: 'Release Review Complete', status: 'done', progress: 100, row_version: 2 });
    await expect(repository.executeMutation(update.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { name: 'Stale', status: 'done', progress: 100, date: '2026-01-15', description: '', row_version: 1 },
    })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(create.mutation, {
      project_id: 'project-demo-001',
      values: { project_id: 'project-demo-001', name: '', status: 'on_track', progress: 10 },
    })).rejects.toMatchObject({ status: 422, code: 'PROJECT_UPDATE_NAME_REQUIRED' });
    const remove = dashboard.actions.find((action: any) => action.id === 'delete_project_update');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2, values: { row_version: 2 } });
    expect((await repository.querySource(updates, { id: 'project-demo-001', q: 'Release Review', status: null, fixture_state: null }, 0, 50)).data).toEqual([]);
  });
});
