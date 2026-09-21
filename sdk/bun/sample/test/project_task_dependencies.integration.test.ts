import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Project task dependency parity', () => {
  test('joins the Blocked By page grid to the task API and keeps layout/API ownership separate', () => {
    const page = yaml('pages/project-task-detail.yaml');
    const api = yaml('api/task-detail.yaml');
    const dependencyGrid = page.components.find((component: any) => component.source === 'project_task_dependencies');
    const dependencySource = api.datasources.find((source: any) => source.id === 'project_task_dependencies');
    const lookupSource = api.datasources.find((source: any) => source.id === 'project_task_dependency_lookup');

    validatePageDefinition({ ...page, actions: api.actions, datasources: api.datasources }, { allowExternalSources: true });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(dependencyGrid).toMatchObject({
      type: 'LineItemGrid',
      parent_source: 'project_task_detail',
      variant: 'odoo_x2many',
      title: 'Blocked By',
      actions: [expect.objectContaining({ id: 'add_project_task_dependency', permission: 'project.write' })],
    });
    expect(dependencyGrid.columns.map((column: any) => column.label)).toEqual(['Title', 'Assignees', 'Project', 'Stage', '',]);
    expect(api.page).toEqual({ id: 'project-task-detail' });
    expect(dependencySource.permission).toBe('project.read');
    expect(dependencySource.error_states.transport_error.code).toBe('PROJECT_TASK_DEPENDENCIES_UNAVAILABLE');
    expect(lookupSource.permission).toBe('project.read');
    expect(page.page.id).toBe(api.page.id);
  });

  test('persists deterministic relations, supports candidate lookup, and refreshes the denormalized task summary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_task_dependencies_read_migrations', ['schema', 'data']);
    const api = yaml('api/task-detail.yaml');
    const list = api.datasources.find((source: any) => source.id === 'project_task_dependencies');
    const lookup = api.datasources.find((source: any) => source.id === 'project_task_dependency_lookup');
    const detail = api.datasources.find((source: any) => source.id === 'project_task_detail');

    expect((await repository.querySource(list, { id: 'task-demo-001', q: null, fixture_state: null }, 0, 50)).data).toMatchObject([{
      id: 'project-task-dependency-001',
      depends_on_id: 'task-demo-002',
      name: 'Review parity screenshots',
      assignee: 'Mitchell Admin',
    }]);
    expect((await repository.querySource(list, { id: 'task-demo-001', q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { id: 'task-demo-001', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(lookup, { id: 'task-demo-001', fixture_state: null }, 0, 50)).data).not.toContainEqual(expect.objectContaining({ value: 'task-demo-001' }));
    expect((await repository.querySource(lookup, { id: 'task-demo-001', fixture_state: null }, 0, 50)).data).not.toContainEqual(expect.objectContaining({ value: 'task-demo-002' }));
    expect(await repository.querySource(detail, { id: 'task-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ blocked_by_summary: '1 task(s)', blocked_by_names: 'Review parity screenshots' }) });
  });

  test('enforces permission, duplicate/self/cycle guards, optimistic parent and line conflicts, and removal', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_task_dependencies_mutation_migrations', ['schema', 'data']);
    const api = yaml('api/task-detail.yaml');
    const add = action(api, 'add_project_task_dependency');
    const remove = action(api, 'remove_project_task_dependency');

    expect(add).toMatchObject({ type: 'server_form', handler: 'line_item', permission: 'project.write', operation: 'create' });
    expect(remove).toMatchObject({ type: 'server', handler: 'line_item', permission: 'project.write', operation: 'delete' });
    expect(add.fields[0]).toMatchObject({ field: 'depends_on_id', options_source: 'project_task_dependency_lookup' });
    await expect(repository.executeMutation(add.mutation, { id: 'task-demo-001', parent_expected_row_version: 1, depends_on_id: 'task-demo-002' }))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_DEPENDENCY_EXISTS' });
    await expect(repository.executeMutation(add.mutation, { id: 'task-demo-004', parent_expected_row_version: 1, depends_on_id: 'task-demo-004' }))
      .rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_DEPENDENCY_SELF' });
    await expect(repository.executeMutation(add.mutation, { id: 'task-demo-002', parent_expected_row_version: 1, depends_on_id: 'task-demo-001' }))
      .rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_DEPENDENCY_CYCLE' });
    await expect(repository.executeMutation(add.mutation, { id: 'task-demo-004', parent_expected_row_version: 2, depends_on_id: 'task-demo-001' }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const created = await repository.executeMutation(add.mutation, { id: 'task-demo-004', parent_expected_row_version: 1, depends_on_id: 'task-demo-001' });
    expect(created).toMatchObject({ id: 'project-task-dependency-task-demo-004-task-demo-001', task_id: 'task-demo-004', depends_on_id: 'task-demo-001' });
    await expect(repository.executeMutation(remove.mutation, { id: 'task-demo-004', line_id: created.id, parent_expected_row_version: 1, expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect(await repository.executeMutation(remove.mutation, { id: 'task-demo-004', line_id: created.id, parent_expected_row_version: 2, expected_row_version: 1 }))
      .toMatchObject({ deleted: true, id: created.id });
    await expect(repository.executeMutation(remove.mutation, { id: 'task-demo-004', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_DEPENDENCY_STALE' });
  });
});
