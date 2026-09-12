import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project milestone embedded action parity', () => {
  test('joins the presentation and API by the embedded milestone page id', () => {
    const dashboard = yaml('pages/project-dashboard.yaml');
    const dashboardApi = yaml('api/project-dashboard.yaml');
    const detail = yaml('pages/project-milestone-detail.yaml');
    const detailApi = yaml('api/project-milestone-detail.yaml');
    const milestoneList = dashboard.components.find((component: any) => component.source === 'project_dashboard_milestones');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(milestoneList.views.map((view: any) => view.id)).toEqual(['list', 'card', 'form']);
    expect(milestoneList.columns.map((column: any) => column.label)).toEqual([' ', 'Milestone', 'Deadline', 'Status', 'Tasks', ' ']);
    expect(milestoneList.row_open_action).toBe('view_project_milestone');
    expect(milestoneList.form_view).toEqual({ page: 'apps/services/project/pages/project-milestone-detail.yaml', side_panel: true });
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'project_milestone_detail', status_field: 'state', editable: true });
    expect(dashboardApi.page).toEqual({ id: 'project-dashboard' });
    expect(detailApi.page).toEqual({ id: 'project-milestone-detail' });
    expect(discovered.pages.get('project-milestone-detail')?.config.page.route).toBe('/projects/detail/dashboard/milestone');
    expect(discovered.pageDatasources.get('project-milestone-detail')).toEqual(['project_milestone_detail']);
  });

  test('returns stable milestone ordering and enforces CRUD, reached state, and conflicts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_milestones_test_migrations', ['schema', 'data']);
    const dashboard = yaml('api/project-dashboard.yaml');
    const list = dashboard.datasources.find((source: any) => source.id === 'project_dashboard_milestones');
    expect((await repository.querySource(list, { id: 'project-demo-001', q: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ id: 'milestone-demo-001', name: 'Foundation release', due_date: '2026-02-14', is_reached: false, state: 'Open', task_summary: '3 / 0' }]);
    expect((await repository.querySource(list, { id: 'project-demo-001', q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { id: 'project-demo-001', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const create = dashboard.actions.find((action: any) => action.id === 'create_project_milestone');
    const created = await repository.executeMutation(create.mutation, { project_id: 'project-demo-001', values: { project_id: 'project-demo-001', name: 'Launch readiness', due_date: '2026-03-01' } });
    expect(created).toMatchObject({ name: 'Launch readiness', project_id: 'project-demo-001', is_reached: false });
    const update = dashboard.actions.find((action: any) => action.id === 'edit_project_milestone');
    const updated = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Launch readiness review', sequence: 20, due_date: '2026-03-01', is_reached: false, state: 'Open', row_version: 1 } });
    expect(updated).toMatchObject({ name: 'Launch readiness review', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', row_version: 1 } })).rejects.toMatchObject({ status: 409 });
    const mark = dashboard.actions.find((action: any) => action.id === 'mark_project_milestone');
    expect(mark.permission).toBe('project.write');
    const reached = await repository.executeMutation(mark.mutation, { id: created.id, expected_row_version: 2, values: { is_reached: true, state: 'Reached', row_version: 2 } });
    expect(reached).toMatchObject({ is_reached: true, state: 'Reached', row_version: 3 });
    await expect(repository.executeMutation(create.mutation, { project_id: 'project-demo-001', values: { project_id: 'project-demo-001', name: '' } })).rejects.toMatchObject({ status: 422, code: 'PROJECT_MILESTONE_NAME_REQUIRED' });
  });
});
