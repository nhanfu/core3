import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project Activity Plans parity', () => {
  test('registers the Project action and keeps page/API/detail ownership separate', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toContainEqual({ path: '/project-activity-plans', label: 'Activity Plans', icon: 'activity', permission: 'project.manage' });

    const page = yaml('pages/activity-plans.yaml');
    const api = yaml('api/activity-plans.yaml');
    const detail = yaml('pages/activity-plan-detail.yaml');
    const detailApi = yaml('api/activity-plan-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'project-activity-plans', route: '/project-activity-plans', auth: { require: ['project.manage'] } });
    expect(page.components[0].datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'project-activity-plans' });
    expect(detail.page).toMatchObject({ id: 'project-activity-plan-detail', route: '/project-activity-plans/detail' });
    expect(detailApi.page).toEqual({ id: 'project-activity-plan-detail' });
    expect(discovered.pages.get('project-activity-plans')?.config.page.id).toBe('project-activity-plans');
    expect(discovered.pageDatasources.get('project-activity-plans')).toContain('project_activity_plans');
    expect(discovered.pageDatasources.get('project-activity-plan-detail')).toContain('project_activity_plan_detail');
  });

  test('matches Odoo action, view, form, and nested activity contracts', () => {
    const page = yaml('pages/activity-plans.yaml');
    const list = page.components[0];
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'card', 'form']);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Name', 'Applies to', 'Steps Count', 'Company', ' ']);
    expect(list.filters[0]).toMatchObject({ field: 'active', label: 'Status' });
    expect(list.group_by).toEqual([{ field: 'res_model_label', label: 'Model' }]);
    expect(list.row_open_action).toBe('view_project_activity_plan');

    const detail = yaml('pages/activity-plan-detail.yaml');
    expect(detail.components[0].groups[0].fields.map((field: any) => field.label)).toEqual(['Plan Name', 'Model', 'Company', 'Steps Count']);
    expect(detail.components[1].children.slice(0, 7).map((field: any) => field.label)).toEqual(['Activity Type', 'Summary', 'Assignment', 'Assigned to', 'Interval', 'Unit', 'Trigger']);
    expect(detail.components[1].actions[0]).toMatchObject({ id: 'add_project_activity_plan_step', label: 'Add a line' });

    const actions = yaml('api/activity-plans.yaml').actions;
    expect(actions.map((action: any) => action.id)).toEqual([
      'create_project_activity_plan', 'view_project_activity_plan', 'edit_project_activity_plan',
      'archive_project_activity_plan', 'unarchive_project_activity_plan', 'delete_project_activity_plan',
    ]);
    expect(actions[0].mutation.guards.map((guard: any) => guard.code)).toEqual(['PROJECT_ACTIVITY_PLAN_NAME_EXISTS', 'PROJECT_ACTIVITY_PLAN_MODEL_INVALID']);
    expect(actions[3].mutation.concurrency).toEqual({ required: true });
    const detailActions = yaml('api/activity-plan-detail.yaml').actions;
    expect(detailActions.map((action: any) => action.id)).toContain('add_project_activity_plan_step');
    expect(detailActions.map((action: any) => action.id)).toContain('edit_project_activity_plan_step');
    expect(detailActions.map((action: any) => action.id)).toContain('delete_project_activity_plan_step');
  });

  test('returns deterministic active/archived fixtures and stable child/error contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_activity_plans_test_migrations', ['schema', 'data']);

    const source = yaml('api/activity-plans.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(2);
    expect(rows.data.map((row: any) => row.id)).toEqual(['project-activity-plan-kickoff', 'project-activity-plan-follow-up']);
    expect(rows.data[0]).toMatchObject({ name: 'Project Kickoff', res_model_label: 'Project', steps_count: 2 });
    expect((await repository.querySource(source, { q: 'kickoff', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Project Kickoff']);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Project Retrospective']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = yaml('api/activity-plan-detail.yaml');
    const detailRows = await repository.querySource(detail.datasources[0], { id: 'project-activity-plan-kickoff', fixture_state: null }, 0, 1);
    expect(detailRows.data).toMatchObject({ name: 'Project Kickoff', res_model: 'project.project', steps_count: 2 });
    const steps = await repository.querySource(detail.datasources[1], { id: 'project-activity-plan-kickoff', fixture_state: null }, 0, 50);
    expect(steps.data.map((row: any) => row.activity_type_name)).toEqual(['Meeting', 'Email']);
    expect((await repository.querySource(detail.datasources[0], { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(detail.datasources[1], { id: 'project-activity-plan-kickoff', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.permission).toBe('project.manage');
    expect(detail.datasources[0].error_states.transport_error.code).toBe('PROJECT_ACTIVITY_PLAN_DETAIL_UNAVAILABLE');
    expect(detail.datasources[1].error_states.transport_error.code).toBe('PROJECT_ACTIVITY_PLAN_STEPS_UNAVAILABLE');
  });
});
