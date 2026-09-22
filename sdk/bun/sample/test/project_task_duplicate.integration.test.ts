import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function setup(name: string, databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Project task Duplicate parity', () => {
  test('binds the Odoo kanban copy action to the page-matched task API', () => {
    const page = yaml('pages/project-task-detail.yaml');
    const api = yaml('api/task-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'duplicate_project_task');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_task_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/project/models/project_task.py', 'utf8');

    expect(page.page).toMatchObject({ id: 'project-task-detail', route: '/tasks/detail' });
    expect(api.page).toEqual({ id: 'project-task-detail' });
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('project-task-detail')).toContain('project_task_detail');
    expect(page.components[0].action_menu.actions).toContainEqual(expect.objectContaining({ id: 'duplicate_project_task', label: 'Duplicate', permission: 'project.write' }));
    expect(action).toMatchObject({ type: 'server', permission: 'project.write', action: 'project.tasks.duplicate', handler: 'yaml_mutation', operation: 'duplicate' });
    expect(action.mutation.steps).toHaveLength(4);
    expect(sourceView).toContain('type="object" name="copy"');
    expect(sourceView).toContain('Duplicate');
    expect(sourceModel).toContain('def copy_data(self, default=None):');
    expect(sourceModel).toContain('def copy(self, default=None):');
  });

  test('duplicates the active task hierarchy, resets workflow fields, and persists it across reopen', async () => {
    const databasePath = `/tmp/core3-project-task-duplicate-${crypto.randomUUID()}.duckdb`;
    const migrationName = `project_task_duplicate_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await setup(migrationName, databasePath);
    const action = yaml('api/task-detail.yaml').actions.find((candidate: any) => candidate.id === 'duplicate_project_task');
    const [source] = await first.repository.query('SELECT row_version FROM project_tasks WHERE id = ?', ['task-demo-001']);

    const copied = await first.repository.executeMutation(action.mutation, {
      task_id: 'task-demo-001', expected_task_row_version: source.row_version, current_company_name: 'Core3 Demo Company',
    }) as any;

    expect(copied).toMatchObject({
      project_id: 'project-demo-001', name: 'Complete module migration (copy)', state: 'Todo', active: true,
      row_version: 1, parent_task_id: null, copied_child_count: 2, subtask_summary: '0 / 2 (0%)',
    });
    expect(await first.repository.query('SELECT row_version FROM project_tasks WHERE id = ?', ['task-demo-001']))
      .toEqual([{ row_version: source.row_version + 1 }]);
    expect(await first.repository.query('SELECT name, parent_task_id, state, due_date FROM project_tasks WHERE parent_task_id = ? ORDER BY id', [copied.id]))
      .toEqual([
        { name: 'Prepare migration checklist (copy)', parent_task_id: copied.id, state: 'Todo', due_date: null },
        { name: 'Record migration evidence (copy)', parent_task_id: copied.id, state: 'Todo', due_date: null },
      ]);
    first.database.close();

    const second = await setup(migrationName, databasePath);
    expect(await second.repository.query('SELECT name, state, active FROM project_tasks WHERE id = ?', [copied.id]))
      .toEqual([{ name: 'Complete module migration (copy)', state: 'Todo', active: true }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces active-record, company, and stale-version guards without partial clones', async () => {
    const { database, repository } = await setup('project_task_duplicate_guards');
    const action = yaml('api/task-detail.yaml').actions.find((candidate: any) => candidate.id === 'duplicate_project_task');
    const base = { task_id: 'task-demo-001', expected_task_row_version: 1, current_company_name: 'Core3 Demo Company' };

    await expect(repository.executeMutation(action.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 403, code: 'PROJECT_TASK_DUPLICATE_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...base, task_id: 'missing-task' }))
      .rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_DUPLICATE_NOT_FOUND' });
    await repository.query("UPDATE project_tasks SET active = FALSE WHERE id = 'task-demo-001'");
    await expect(repository.executeMutation(action.mutation, base))
      .rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_DUPLICATE_NOT_FOUND' });
    await repository.query("UPDATE project_tasks SET active = TRUE, row_version = 2 WHERE id = 'task-demo-001'");
    await expect(repository.executeMutation(action.mutation, base))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_DUPLICATE_STALE_TASK' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM project_tasks WHERE name LIKE '%(copy)'"))
      .toEqual([{ count: 0 }]);
    database.close();
  });
});
