import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Project task detail/form parity', () => {
  test('joins the list-to-detail route and keeps the task page presentation-only', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = yaml('pages/tasks.yaml');
    const page = yaml('pages/project-task-detail.yaml');
    const api = yaml('api/task-detail.yaml');
    const form = page.components[0];

    expect(list.components[0]).toMatchObject({ row_open_action: 'view_task', row_double_click_action: 'view_task' });
    expect(list.actions).toContainEqual(expect.objectContaining({ id: 'view_task', navigate_to: '/tasks/detail', permission: 'project.read' }));
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-task-detail', route: '/tasks/detail', auth: { require: ['project.read'] } });
    expect(api.page).toEqual({ id: 'project-task-detail' });
    expect(discovered.pages.get('project-task-detail')?.config.page.id).toBe('project-task-detail');
    expect(discovered.pageDatasources.get('project-task-detail')).toContain('project_task_detail');
    expect(discovered.pages.get('project-task-detail')?.config.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'edit_task', action: 'project.tasks.update' }),
      expect.objectContaining({ id: 'start_task', action: 'project.tasks.start' }),
    ]));

    expect(form).toMatchObject({ type: 'OdooFormView', source: 'project_task_detail', editable: true, title_field: 'name', status_field: 'state' });
    expect(form.groups.flatMap((group: any) => group.fields).map((field: any) => field.label)).toEqual([
      'Project', 'Milestone', 'Assignees', 'Tags', 'Customer', 'Stage', 'Priority', 'Deadline', 'Allocated Time', 'Spent Time',
    ]);
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Description', 'Sub-tasks', 'Blocked By']);
    expect(form.statusbar.map((state: any) => state.label)).toEqual(['To do', 'In progress', 'Done', 'Cancelled']);
    expect(form.header_actions.map((candidate: any) => candidate.id)).toEqual(['edit_task', 'start_task', 'complete_task', 'cancel_task']);
  });

  test('seeds deterministic task detail fields and stable unavailable states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'project_task_detail_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'project_task_detail_test_migrations', ['schema', 'data']);

    const api = yaml('api/task-detail.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'project_task_detail');
    const detail = await repository.querySource(source, { id: 'task-demo-002', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({
      id: 'task-demo-002',
      name: 'Review parity screenshots',
      project_name: 'Core3 Implementation',
      milestone_name: 'Foundation release',
      customer_name: 'Core3 Internal',
      tags: 'Design, Priority',
      subtask_summary: '0 / 0 (0%)',
      blocked_by_summary: 'None',
      created_at: expect.stringContaining('2026-01-15'),
    });
    expect((await repository.querySource(source, { id: 'missing-task', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { id: 'task-demo-002', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_TASK_DETAIL_UNAVAILABLE' });
  });

  test('enforces edit validation, optimistic conflicts, and guarded transitions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_task_detail_mutation_migrations', ['schema', 'data']);
    const api = yaml('api/task-detail.yaml');
    const edit = action(api, 'edit_task');
    const start = action(api, 'start_task');
    const complete = action(api, 'complete_task');
    const cancel = action(api, 'cancel_task');

    expect(edit).toMatchObject({ type: 'server_form', permission: 'project.write', operation: 'update', handler: 'yaml_mutation' });
    expect(edit.mutation.concurrency).toMatchObject({ required: true });
    expect(await repository.executeMutation(edit.mutation, {
      id: 'task-demo-002',
      expected_row_version: 1,
      values: { name: 'Review parity screenshots - updated', assignee: 'Project Team', priority: 'High', planned_hours: 10 },
    })).toMatchObject({ id: 'task-demo-002', name: 'Review parity screenshots - updated' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'task-demo-002', expected_row_version: 1, values: { name: 'Stale update' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'task-demo-002', expected_row_version: 2, values: { name: 'Invalid hours', planned_hours: -1 },
    })).rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_HOURS_INVALID' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'missing-task', expected_row_version: 1, values: { name: 'Missing' },
    })).rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_NOT_FOUND' });

    expect(start.permission).toBe('project.write');
    expect(complete.permission).toBe('project.write');
    expect(cancel.permission).toBe('project.manage');
    expect(start.mutation.steps[0].query).toContain('row_version = :expected_row_version');
    await expect(repository.executeMutation(start.mutation, { id: 'task-demo-004', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect(await repository.executeMutation(start.mutation, { id: 'task-demo-004', expected_row_version: 1 })).toMatchObject({ id: 'task-demo-004', state: 'In Progress' });
    expect(await repository.executeMutation(complete.mutation, { id: 'task-demo-004', expected_row_version: 2 })).toMatchObject({ id: 'task-demo-004', state: 'Done' });
    await expect(repository.executeMutation(cancel.mutation, { id: 'task-demo-004', expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_INVALID_TRANSITION' });
  });
});
