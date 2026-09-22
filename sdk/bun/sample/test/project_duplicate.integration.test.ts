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

describe('Project Duplicate parity', () => {
  test('binds the Odoo kanban copy action to the page-matched Projects API', () => {
    const page = yaml('pages/projects.yaml');
    const api = yaml('api/projects.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'duplicate_project');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_project_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/project/models/project_project.py', 'utf8');

    expect(page.page).toMatchObject({ id: 'projects', route: '/projects' });
    expect(api.page).toEqual({ id: 'projects' });
    expect(page.components[0].columns.at(-1).actions).toContainEqual(expect.objectContaining({ id: 'duplicate_project', label: 'Duplicate', permission: 'project.manage' }));
    expect(action).toMatchObject({ type: 'server', permission: 'project.manage', action: 'project.projects.duplicate', handler: 'yaml_mutation', operation: 'duplicate' });
    expect(action.mutation.steps).toHaveLength(8);
    expect(discovered.pageDatasources.get('projects')).toContain('projects');
    expect(sourceView).toContain('<a class="dropdown-item" role="menuitem" name="copy" type="object">Duplicate</a>');
    expect(sourceModel).toContain('def map_tasks(self, new_project_id):');
    expect(sourceModel).toContain("'%s (copy)'");
  });

  test('duplicates the project, milestones, task tree, and dependencies durably', async () => {
    const databasePath = `/tmp/core3-project-duplicate-${crypto.randomUUID()}.duckdb`;
    const migrationName = `project_duplicate_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await setup(migrationName, databasePath);
    const action = yaml('api/projects.yaml').actions.find((candidate: any) => candidate.id === 'duplicate_project');
    const [source] = await first.repository.query('SELECT row_version FROM projects WHERE id = ?', ['project-demo-001']);

    const copied = await first.repository.executeMutation(action.mutation, {
      project_id: 'project-demo-001', expected_row_version: source.row_version, current_company_name: 'Core3 Demo Company',
    }) as any;

    expect(copied).toMatchObject({
      name: 'Core3 Implementation (copy)', row_version: 1, archived: false, is_template: false,
      task_count: 9, milestone_count: 1,
    });
    expect(await first.repository.query('SELECT name, state, stage, spent_hours FROM projects WHERE id = ?', [copied.id]))
      .toEqual([{ name: 'Core3 Implementation (copy)', state: 'Active', stage: 'In progress', spent_hours: 0 }]);
    const copiedTasks = await first.repository.query('SELECT name, state, parent_task_id FROM project_tasks WHERE project_id = ? ORDER BY id', [copied.id]);
    expect(copiedTasks).toHaveLength(9);
    expect(copiedTasks.every((task: any) => task.state === 'In Progress')).toBe(true);
    expect(copiedTasks.filter((task: any) => task.parent_task_id === null)).toHaveLength(7);
    expect(copiedTasks).toEqual(expect.arrayContaining([
      { name: 'Complete module migration', state: 'In Progress', parent_task_id: null },
      { name: 'Prepare migration checklist', state: 'In Progress', parent_task_id: `${copied.id}-task-task-demo-001` },
      { name: 'Record migration evidence', state: 'In Progress', parent_task_id: `${copied.id}-task-task-demo-001` },
    ]));
    expect(await first.repository.query('SELECT task_id, depends_on_id FROM project_task_dependencies WHERE task_id LIKE ? ORDER BY id', [`${copied.id}%`]))
      .toEqual([{ task_id: `${copied.id}-task-task-demo-001`, depends_on_id: `${copied.id}-task-task-demo-002` }]);
    first.database.close();

    const second = await setup(migrationName, databasePath);
    expect(await second.repository.query('SELECT name, archived FROM projects WHERE id = ?', [copied.id]))
      .toEqual([{ name: 'Core3 Implementation (copy)', archived: false }]);
    expect(await second.repository.query('SELECT COUNT(*) AS count FROM project_tasks WHERE project_id = ?', [copied.id]))
      .toEqual([{ count: 9 }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces active, company, and stale-version guards without partial copies', async () => {
    const { database, repository } = await setup('project_duplicate_guards');
    const action = yaml('api/projects.yaml').actions.find((candidate: any) => candidate.id === 'duplicate_project');
    const base = { project_id: 'project-demo-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company' };

    await expect(repository.executeMutation(action.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 403, code: 'PROJECT_DUPLICATE_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...base, project_id: 'missing-project' }))
      .rejects.toMatchObject({ status: 404, code: 'PROJECT_DUPLICATE_NOT_FOUND' });
    await repository.query("UPDATE projects SET archived = TRUE WHERE id = 'project-demo-001'");
    await expect(repository.executeMutation(action.mutation, base))
      .rejects.toMatchObject({ status: 404, code: 'PROJECT_DUPLICATE_NOT_FOUND' });
    await repository.query("UPDATE projects SET archived = FALSE, row_version = 2 WHERE id = 'project-demo-001'");
    await expect(repository.executeMutation(action.mutation, base))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_DUPLICATE_STALE_PROJECT' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM projects WHERE name LIKE '%(copy)'") )
      .toEqual([{ count: 0 }]);
    database.close();
  });
});
