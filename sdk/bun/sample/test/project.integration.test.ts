import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiSource = (file: string, id: string) => yaml(`api/${file}`).datasources.find((source: any) => source.id === id);

describe('Project list and task navigation parity', () => {
  test('keeps Project list/detail/task pages layout-only and API-owned by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const screens = [
      ['pages/projects.yaml', 'projects', 'projects'],
      ['pages/project-detail.yaml', 'project-detail', 'project_detail'],
      ['pages/tasks.yaml', 'project-tasks', 'project_tasks_all'],
      ['pages/task-detail.yaml', 'project-task-detail', 'project_task_detail'],
    ] as const;

    for (const [pageFile, pageId, sourceId] of screens) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.auth.require, pageFile).toEqual(['project.read']);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
      expect(readdirSync(join(serviceRoot, 'api')).some(file => file.replace(/\.ya?ml$/, '') === pageFile.replace(/^pages\//, '').replace(/\.ya?ml$/, '')), pageFile).toBe(true);
    }

    const projectList = yaml('pages/projects.yaml').components.find((component: any) => component.type === 'ListView');
    expect(projectList).toMatchObject({ source: 'projects', row_open_action: 'view_project', empty_state: { title: 'No projects' } });
    expect(projectList.views.map((view: any) => view.id)).toEqual(['list', 'kanban']);

    const projectDetail = yaml('pages/project-detail.yaml');
    const taskList = projectDetail.components.find((component: any) => component.type === 'ListView');
    expect(taskList).toMatchObject({ source: 'project_tasks_detail', mount_in: 'previous-panel', row_open_action: 'view_project_task' });
    expect(projectDetail.actions.find((action: any) => action.id === 'view_project_task')).toMatchObject({ navigate_to: '/tasks/detail', permission: 'project.read' });
  });

  test('returns deterministic project, detail, task search, and empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_parity_test_schema_migrations', ['schema', 'data']);

    const projects = apiSource('projects.yaml', 'projects');
    const defaultProjects = await repository.querySource(projects, { q: null, state: null, stage: null, fixture_state: null }, 0, 50);
    expect(defaultProjects.data.map((row: any) => row.id)).toEqual(['project-demo-001', 'project-demo-002']);
    expect(defaultProjects.data.every((row: any) => String(row.start_date).startsWith('2026-01-15'))).toBe(true);

    const searchedProjects = await repository.querySource(projects, { q: 'Website', state: null, stage: null, fixture_state: null }, 0, 50);
    expect(searchedProjects.data.map((row: any) => row.id)).toEqual(['project-demo-002']);
    const stageProjects = await repository.querySource(projects, { q: null, state: null, stage: 'In progress', fixture_state: null }, 0, 50);
    expect(stageProjects.data.map((row: any) => row.id)).toEqual(['project-demo-001']);
    const emptyProjects = await repository.querySource(projects, { q: null, state: null, stage: null, fixture_state: 'empty' }, 0, 50);
    expect(emptyProjects.data).toEqual([]);

    const projectDetail = apiSource('project-detail.yaml', 'project_detail');
    const detail = await repository.querySource(projectDetail, { id: 'project-demo-001', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'project-demo-001', name: 'Core3 Implementation', stage: 'In progress' });
    const missingDetail = await repository.querySource(projectDetail, { id: 'project-does-not-exist', fixture_state: 'not_found' }, 0, 1);
    expect(missingDetail.data).toEqual({});

    const tasks = apiSource('tasks.yaml', 'project_tasks_all');
    const taskRows = await repository.querySource(tasks, { q: null, state: null, priority: null, stage: null, fixture_state: null }, 0, 50);
    expect(taskRows.data).toHaveLength(5);
    const searchedTasks = await repository.querySource(tasks, { q: 'screenshots', state: null, priority: null, stage: null, fixture_state: null }, 0, 50);
    expect(searchedTasks.data.map((row: any) => row.id)).toEqual(['task-demo-002']);
    const emptyTasks = await repository.querySource(tasks, { q: null, state: null, priority: null, stage: null, fixture_state: 'empty' }, 0, 50);
    expect(emptyTasks.data).toEqual([]);

    const projectTasks = apiSource('project-detail.yaml', 'project_tasks_detail');
    const projectTaskRows = await repository.querySource(projectTasks, { id: 'project-demo-001', fixture_state: null }, 0, 50);
    expect(projectTaskRows.data.map((row: any) => row.id)).toEqual(['task-demo-003', 'task-demo-002', 'task-demo-001']);
  });

  test('keeps permission and task workflow boundaries explicit', () => {
    for (const file of ['api/projects.yaml', 'api/project-detail.yaml', 'api/tasks.yaml', 'api/task-detail.yaml']) {
      for (const source of yaml(file).datasources) expect(source.permission, file).toBe('project.read');
    }
    const workflow = yaml('pages/project-workflow.yaml').workflow;
    expect(workflow.permission).toBe('project.write');
    expect(workflow.transitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'start', permission: 'project.write' }),
      expect.objectContaining({ id: 'complete', permission: 'project.write' }),
      expect.objectContaining({ id: 'cancel', permission: 'project.manage' }),
    ]));
    expect(workflow.transitions.every((transition: any) => transition.mutation.steps?.length)).toBe(true);
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['project.read', 'project.write', 'project.manage']));
  });
});
