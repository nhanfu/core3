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

describe('Project task parent action parity', () => {
  test('binds Odoo Parent Task stat navigation to the page-matched task API', () => {
    const page = yaml('pages/project-task-detail.yaml');
    const api = yaml('api/task-detail.yaml');
    const parentButton = page.components[0].stat_buttons.find((candidate: any) => candidate.id === 'open_parent_task');

    validatePageDefinition({ ...page, actions: api.actions, datasources: api.datasources }, { allowExternalSources: true });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toEqual({ id: 'project-task-detail', route: '/tasks/detail', breadcrumb: ['Services', 'Project', 'Tasks', 'Detail'], auth: { require: ['project.read'] } });
    expect(parentButton).toEqual(expect.objectContaining({
      id: 'open_parent_task', label: 'Parent Task', value_field: 'parent_task_name', permission: 'project.read',
      show_if: 'record.parent_task_id !== null && record.parent_task_id !== ""',
    }));
    expect(action(api, 'open_parent_task')).toEqual({
      id: 'open_parent_task', type: 'navigate', permission: 'project.read', navigate_to: '/tasks/detail',
      params: { id: '{state.project_task_detail.parent_task_id}' },
    });
  });

  test('returns parent identity for sub-tasks and omits it for root tasks', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_task_parent_read_migrations', ['schema', 'data']);
    const detail = yaml('api/task-detail.yaml').datasources.find((candidate: any) => candidate.id === 'project_task_detail');

    expect(await repository.querySource(detail, { id: 'task-subtask-001', fixture_state: null }, 0, 1)).toMatchObject({
      data: { id: 'task-subtask-001', parent_task_id: 'task-demo-001', parent_task_name: 'Complete module migration' },
    });
    expect(await repository.querySource(detail, { id: 'task-demo-001', fixture_state: null }, 0, 1)).toMatchObject({
      data: { id: 'task-demo-001', parent_task_id: null, parent_task_name: null },
    });
    await expect(repository.querySource(detail, { id: 'missing-task', fixture_state: null }, 0, 1)).resolves.toMatchObject({ data: {} });
    database.close();
  });
});
