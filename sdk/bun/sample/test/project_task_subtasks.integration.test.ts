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

describe('Project task subtask parity', () => {
  test('joins the Odoo Sub-tasks notebook grid to the page-matched API', () => {
    const page = yaml('pages/project-task-detail.yaml');
    const api = yaml('api/task-detail.yaml');
    const grid = page.components.find((component: any) => component.source === 'project_task_subtasks');
    const source = api.datasources.find((candidate: any) => candidate.id === 'project_task_subtasks');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    validatePageDefinition({ ...page, actions: api.actions, datasources: api.datasources }, { allowExternalSources: true });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe(api.page.id);
    expect(discovered.pageDatasources.get('project-task-detail')).toContain('project_task_subtasks');
    expect(page.components[0].notebook.tabs.find((tab: any) => tab.id === 'subtasks')).toMatchObject({ label: 'Sub-tasks', content_slot: true });
    expect(grid).toMatchObject({ type: 'LineItemGrid', parent_source: 'project_task_detail', variant: 'odoo_x2many', title: 'Sub-tasks' });
    expect(grid.columns.map((column: any) => column.label)).toEqual(['Title', 'Assignees', 'State', 'Deadline', '']);
    expect(grid.actions).toContainEqual(expect.objectContaining({ id: 'add_project_task_subtask', permission: 'project.write' }));
    expect(source).toMatchObject({ permission: 'project.read', error_states: { transport_error: { code: 'PROJECT_TASK_SUBTASKS_UNAVAILABLE', status: 503 } } });
    expect(action(api, 'add_project_task_subtask')).toMatchObject({ type: 'server_form', handler: 'line_item', operation: 'create', permission: 'project.write' });
    expect(action(api, 'edit_project_task_subtask')).toMatchObject({ type: 'server_form', operation: 'update', permission: 'project.write' });
    expect(action(api, 'delete_project_task_subtask')).toMatchObject({ type: 'server', operation: 'delete', permission: 'project.write' });
  });

  test('persists deterministic child tasks, derives the parent summary, and enforces company and empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'project_task_subtasks_read_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'project_task_subtasks_read_migrations', ['schema', 'data']);
    const api = yaml('api/task-detail.yaml');
    const list = api.datasources.find((source: any) => source.id === 'project_task_subtasks');
    const detail = api.datasources.find((source: any) => source.id === 'project_task_detail');

    expect((await repository.querySource(list, { id: 'task-demo-001', q: null, fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toMatchObject([
      { id: 'task-subtask-001', name: 'Prepare migration checklist', state: 'Todo', assignee: 'Project Team' },
      { id: 'task-subtask-002', name: 'Record migration evidence', state: 'Done', assignee: 'Mitchell Admin' },
    ]);
    expect((await repository.querySource(list, { id: 'task-demo-001', q: 'evidence', fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(list, { id: 'task-demo-001', q: null, fixture_state: 'empty', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { id: 'task-demo-001', q: null, fixture_state: null, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detail, { id: 'task-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ subtask_summary: '1 / 2 (50%)', subtask_names: 'Prepare migration checklist, Record migration evidence' }) });
    database.close();
  });

  test('creates, edits, deletes, rejects stale or invalid child changes, and survives file-backed restart', async () => {
    const databasePath = `/tmp/core3-project-task-subtasks-${crypto.randomUUID()}.duckdb`;
    const migrationName = `project_task_subtasks_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const migrations = join(serviceRoot, 'migrations');
    const api = yaml('api/task-detail.yaml');
    const add = action(api, 'add_project_task_subtask');
    const edit = action(api, 'edit_project_task_subtask');
    const remove = action(api, 'delete_project_task_subtask');

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
    await expect(firstRepository.executeMutation(add.mutation, {
      parent_id: 'task-demo-001', parent_expected_row_version: 1, current_company_name: 'Core3 Demo Company', subtask_id: 'task-subtask-restart',
      values: { name: 'Restart-safe sub-task', assignee: 'Project Team', planned_hours: 2 },
    })).resolves.toMatchObject({ id: 'task-subtask-restart', parent_task_id: 'task-demo-001', state: 'Todo' });
    await expect(firstRepository.executeMutation(add.mutation, { parent_id: 'task-demo-001', parent_expected_row_version: 0, current_company_name: 'Core3 Demo Company', values: { name: 'Stale parent' } }))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_SUBTASK_PARENT_STALE' });
    await expect(firstRepository.executeMutation(add.mutation, { parent_id: 'task-demo-001', parent_expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { name: '' } }))
      .rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_SUBTASK_TITLE_REQUIRED' });
    await expect(firstRepository.executeMutation(add.mutation, { parent_id: 'task-demo-001', parent_expected_row_version: 1, current_company_name: 'Other Company', values: { name: 'Wrong company' } }))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_SUBTASK_PARENT_STALE' });

    expect(await firstRepository.executeMutation(edit.mutation, {
      id: 'task-subtask-restart', parent_id: 'task-demo-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      values: { name: 'Restart-safe sub-task updated', state: 'In Progress', planned_hours: 3 },
    })).toMatchObject({ id: 'task-subtask-restart', row_version: 2, state: 'In Progress' });
    await expect(firstRepository.executeMutation(edit.mutation, {
      id: 'task-subtask-restart', parent_id: 'task-demo-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      values: { name: 'Stale edit', state: 'Done' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(firstRepository.executeMutation(edit.mutation, {
      id: 'task-subtask-restart', parent_id: 'task-demo-001', expected_row_version: 2, current_company_name: 'Core3 Demo Company',
      values: { name: 'Invalid state', state: 'Waiting' },
    })).rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_SUBTASK_STATE_INVALID' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
    const list = api.datasources.find((source: any) => source.id === 'project_task_subtasks');
    expect((await secondRepository.querySource(list, { id: 'task-demo-001', q: 'Restart-safe', fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toMatchObject([{ id: 'task-subtask-restart', name: 'Restart-safe sub-task updated', row_version: 2 }]);
    expect(await secondRepository.executeMutation(remove.mutation, { id: 'task-subtask-restart', parent_id: 'task-demo-001', expected_row_version: 2, current_company_name: 'Core3 Demo Company' })).toMatchObject({ id: 'task-subtask-restart' });
    await expect(secondRepository.executeMutation(remove.mutation, { id: 'task-subtask-restart', parent_id: 'task-demo-001', expected_row_version: 2, current_company_name: 'Core3 Demo Company' }))
      .rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_SUBTASK_NOT_FOUND' });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
