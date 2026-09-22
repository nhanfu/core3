import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project task Convert to Task/Sub-Task parity', () => {
  test('binds the Odoo form action and parent lookup to the page-matched API', () => {
    const page = yaml('pages/project-task-detail.yaml');
    const api = yaml('api/task-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'convert_task_to_subtask');
    const lookup = api.datasources.find((source: any) => source.id === 'project_task_parent_lookup');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_task_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/project/models/project_task.py', 'utf8');

    expect(page.page).toMatchObject({ id: 'project-task-detail', route: '/tasks/detail' });
    expect(api.page).toEqual({ id: 'project-task-detail' });
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('project-task-detail')).toContain('project_task_parent_lookup');
    expect(page.components[0].action_menu.actions).toContainEqual(expect.objectContaining({ id: 'convert_task_to_subtask', label: 'Convert to Task/Sub-Task', permission: 'project.write' }));
    expect(action).toMatchObject({
      type: 'server_form',
      permission: 'project.write',
      action: 'project.tasks.convert_to_subtask',
      handler: 'yaml_mutation',
      operation: 'convert_to_subtask',
    });
    expect(action.fields).toEqual([expect.objectContaining({ field: 'parent_id', options_source: 'project_task_parent_lookup', required: false })]);
    expect(action.mutation.concurrency).toEqual({ required: true });
    expect(lookup.query).toContain('NOT EXISTS (SELECT 1 FROM descendants');
    expect(sourceView).toContain('id="project_task_convert_to_subtask_view_form"');
    expect(sourceView).toContain('id="action_server_convert_to_subtask"');
    expect(sourceView).toContain("domain=\"[('id', '!=', id), '!', ('id', 'child_of', id)]\"");
    expect(sourceModel).toContain('def action_convert_to_subtask(self):');
    expect(sourceModel).toContain('Private tasks cannot be converted into sub-tasks.');
  });

  test('moves a task under a valid parent, supports standalone conversion, and guards stale/cyclic parents', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_task_convert_subtask', ['schema', 'data']);
    const api = yaml('api/task-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'convert_task_to_subtask');
    const lookup = api.datasources.find((source: any) => source.id === 'project_task_parent_lookup');

    expect((await repository.querySource(lookup, { id: 'task-demo-002', q: null, fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ value: 'task-demo-001' })]));
    expect(await repository.executeMutation(action.mutation, {
      id: 'task-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { parent_id: 'task-demo-001' },
    })).toMatchObject({ id: 'task-demo-002', row_version: 2, parent_task_id: 'task-demo-001', parent_task_name: 'Complete module migration' });

    await expect(repository.executeMutation(action.mutation, {
      id: 'task-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { parent_id: 'task-demo-001' },
    })).rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_CONVERT_STALE' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'task-demo-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { parent_id: 'task-demo-002' },
    })).rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_PARENT_CYCLE' });

    expect(await repository.executeMutation(action.mutation, {
      id: 'task-demo-002', expected_row_version: 2, current_company_name: 'Core3 Demo Company', values: { parent_id: '' },
    })).toMatchObject({ id: 'task-demo-002', row_version: 3, parent_task_id: null, parent_task_name: null });
    await expect(repository.executeMutation(action.mutation, {
      id: 'missing-task', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { parent_id: 'task-demo-001' },
    })).rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_CONVERT_NOT_FOUND' });
    database.close();
  });
});
