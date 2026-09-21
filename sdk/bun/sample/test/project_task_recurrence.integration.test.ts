import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Project task recurrence parity', () => {
  test('joins the recurrence list page to its API and exposes the Odoo workflow views', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/project-task-recurrence.yaml');
    const api = yaml('api/project-task-recurrence.yaml');
    const list = page.components[0];

    validatePageDefinition({ ...page, actions: [...(page.actions ?? []), ...(api.actions ?? [])], datasources: api.datasources }, { allowExternalSources: true });
    expect(page.page).toMatchObject({ id: 'project-task-recurrence', route: '/tasks/recurrence', auth: { require: ['project.read'] } });
    expect(api.page).toEqual({ id: 'project-task-recurrence' });
    expect(discovered.pages.get('project-task-recurrence')?.config.page.id).toBe('project-task-recurrence');
    expect(discovered.pageDatasources.get('project-task-recurrence')).toContain('project_tasks_recurrence');
    expect(list).toMatchObject({ type: 'ListView', source: 'project_tasks_recurrence', view_navigation: 'tabs', row_open_action: 'view_recurrent_task' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card', 'kanban', 'calendar', 'pivot', 'graph', 'activity']);
    expect(action(page, 'view_recurrent_task')).toMatchObject({ type: 'navigate', permission: 'project.read', navigate_to: '/tasks/detail' });
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_TASK_RECURRENCE_UNAVAILABLE' });
  });

  test('seeds recurrence membership, supports search and empty states, and persists rule edits', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_task_recurrence_read_migrations', ['schema', 'data']);
    const api = yaml('api/project-task-recurrence.yaml');
    const source = api.datasources[0];
    const detail = yaml('api/task-detail.yaml').datasources.find((candidate: any) => candidate.id === 'project_task_detail');

    expect((await repository.querySource(source, { task_id: 'task-demo-004', q: null, fixture_state: null }, 0, 50)).data).toMatchObject([{
      id: 'task-demo-004',
      recurrence_id: 'project-task-recurrence-001',
      repeat_interval: 1,
      repeat_unit: 'week',
      repeat_type: 'forever',
    }]);
    expect((await repository.querySource(source, { task_id: 'task-demo-004', q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { task_id: 'task-demo-004', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const edit = action(yaml('api/task-detail.yaml'), 'edit_task');
    expect(await repository.executeMutation(edit.mutation, {
      id: 'task-demo-004',
      expected_row_version: 1,
      values: { name: 'Customer review', recurring_task: true, repeat_interval: 2, repeat_unit: 'month', repeat_type: 'until', repeat_until: '2099-12-31' },
    })).toMatchObject({ id: 'task-demo-004', row_version: 2, recurring_task: true, recurrence_id: 'project-task-recurrence-001' });
    expect((await repository.querySource(source, { task_id: 'task-demo-004', q: null, fixture_state: null }, 0, 50)).data).toMatchObject([{
      repeat_interval: 2,
      repeat_unit: 'month',
      repeat_type: 'until',
      repeat_until: '2099-12-31',
    }]);
    expect((await repository.querySource(detail, { id: 'task-demo-004', fixture_state: null }, 0, 1)).data).toMatchObject({ recurrence_id: 'project-task-recurrence-001', repeat_interval: 2, repeat_unit: 'month', repeat_type: 'until', repeat_until: '2099-12-31' });

    await expect(repository.executeMutation(edit.mutation, {
      id: 'task-demo-004', expected_row_version: 2,
      values: { name: 'Customer review', recurring_task: true, repeat_interval: 0, repeat_unit: 'month', repeat_type: 'forever' },
    })).rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_RECURRENCE_INTERVAL_INVALID' });

    expect(await repository.executeMutation(edit.mutation, {
      id: 'task-demo-004', expected_row_version: 2,
      values: { name: 'Customer review', recurring_task: false, repeat_interval: 2, repeat_unit: 'month', repeat_type: 'forever' },
    })).toMatchObject({ id: 'task-demo-004', row_version: 3, recurring_task: false, recurrence_id: null });
    expect((await repository.querySource(source, { task_id: 'task-demo-004', q: null, fixture_state: null }, 0, 50)).data).toEqual([]);
  });

  test('creates the next occurrence after completion and retains it across restart', async () => {
    const databasePath = `/tmp/core3-project-task-recurrence-${crypto.randomUUID()}.duckdb`;
    const migrationName = `project_task_recurrence_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const migrations = join(serviceRoot, 'migrations');
    const api = yaml('api/task-detail.yaml');
    const start = action(api, 'start_task');
    const complete = action(api, 'complete_task');
    const recurrence = yaml('api/project-task-recurrence.yaml').datasources[0];

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(start.mutation, { id: 'task-demo-004', expected_row_version: 1 });
    expect(await firstRepository.executeMutation(complete.mutation, { id: 'task-demo-004', expected_row_version: 2 })).toMatchObject({ id: 'task-demo-004', state: 'Done', row_version: 3 });
    expect((await firstRepository.querySource(recurrence, { task_id: 'task-demo-004', q: null, fixture_state: null }, 0, 50)).data).toHaveLength(2);
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.querySource(recurrence, { task_id: 'task-demo-004', q: null, fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'task-demo-004', state: 'Done' }),
      expect.objectContaining({ id: 'task-recurrence-task-demo-004-3', state: 'Todo', recurrence_id: 'project-task-recurrence-001' }),
    ]));
    second.close();
    rmSync(databasePath, { force: true });
  });
});
