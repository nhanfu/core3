import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project All Tasks action parity', () => {
  test('adds the source All Tasks menu/action with page and API separation', () => {
    const manifest = yaml('manifest.yaml');
    const tasksMenu = manifest.menu.groups.find((group: any) => group.id === 'delivery').items.find((item: any) => item.label === 'Tasks');
    expect(tasksMenu.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/tasks', label: 'My Tasks', permission: 'project.read' }),
      expect.objectContaining({ path: '/all-tasks', label: 'All Tasks', permission: 'project.read' }),
    ]));
    const page = yaml('pages/all-tasks.yaml');
    const api = yaml('api/all-tasks.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-all-tasks', route: '/all-tasks', auth: { require: ['project.read'] } });
    expect(api.page).toEqual({ id: 'project-all-tasks' });
    expect(api.datasources.find((source: any) => source.id === 'project_all_tasks')).toMatchObject({ permission: 'project.read', workflow: 'project_tasks' });
    expect(discoverPages(join(import.meta.dir, '..')).pages.get('project-all-tasks')?.config.page.id).toBe('project-all-tasks');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('project-all-tasks')).toContain('project_all_tasks');
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'card', 'calendar', 'activity', 'pivot', 'graph']);
    expect(page.components[0].default_filters).toEqual({ state: 'open' });
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_menus.xml', 'utf8')).toContain('id="menu_project_management_all_tasks"');
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_task_views.xml', 'utf8')).toContain('<field name="path">all-tasks</field>');
  });

  test('keeps All Tasks open-task filtering deterministic and My Tasks scoped', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_all_tasks_test_schema_migrations', ['schema', 'data']);
    const allTasks = yaml('api/all-tasks.yaml').datasources.find((source: any) => source.id === 'project_all_tasks');
    const allOpen = await repository.querySource(allTasks, { q: null, state: 'open', priority: null, stage: null, fixture_state: null });
    expect(allOpen.data.length).toBeGreaterThan(0);
    expect(allOpen.data.every((row: any) => ['Todo', 'In Progress'].includes(row.state))).toBe(true);
    expect(allOpen.data.map((row: any) => row.id)).toEqual([...allOpen.data].sort((a: any, b: any) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')) || String(a.id).localeCompare(String(b.id))).map((row: any) => row.id));
    expect((await repository.querySource(allTasks, { q: 'screenshots', state: 'open', priority: null, stage: null, fixture_state: null })).data.map((row: any) => row.id)).toEqual(['task-demo-002']);
    expect((await repository.querySource(allTasks, { q: null, state: 'open', priority: null, stage: null, fixture_state: 'empty' })).data).toEqual([]);
    await expect(repository.querySource(allTasks, { q: null, state: 'open', priority: null, stage: null, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'PROJECT_ALL_TASKS_UNAVAILABLE' });

    const myTasks = yaml('api/tasks.yaml').datasources.find((source: any) => source.id === 'project_tasks_all');
    const mine = await repository.querySource(myTasks, { q: null, state: 'open', priority: null, stage: null, task_scope: 'my', current_user_name: 'Mitchell Admin', fixture_state: null });
    expect(mine.data.length).toBeGreaterThan(0);
    expect(mine.data.every((row: any) => row.assignee === 'Mitchell Admin' && ['Todo', 'In Progress'].includes(row.state))).toBe(true);
    const reopened = await DuckDbDatabase.open(':memory:');
    const reopenedRepository = new YamlRepository(reopened);
    await migrateDatabase(reopenedRepository, join(serviceRoot, 'migrations'), undefined, 'project_all_tasks_restart_schema_migrations', ['schema', 'data']);
    const afterRestart = await reopenedRepository.querySource(allTasks, { q: null, state: 'open', priority: null, stage: null, fixture_state: null });
    expect(afterRestart.data.map((row: any) => row.id)).toEqual(allOpen.data.map((row: any) => row.id));
    database.close();
    reopened.close();
  });
});
