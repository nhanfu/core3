import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project customer portal task detail parity', () => {
  test('keeps the portal task route and page/API ownership separate', () => {
    const listApi = yaml('api/portal-project-detail.yaml');
    const page = yaml('pages/portal-project-task-detail.yaml');
    const api = yaml('api/portal-project-task-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(listApi.actions).toContainEqual(expect.objectContaining({
      id: 'view_portal_project_task',
      navigate_to: '/my/projects/task/detail',
      params: { project_id: '{row.project_id}', task_id: '{row.id}' },
    }));
    expect(page.page).toMatchObject({ id: 'project-portal-project-task-detail', route: '/my/projects/task/detail', auth: { require: ['project.portal'] } });
    expect(api.page).toEqual({ id: 'project-portal-project-task-detail' });
    expect(discovered.pages.get('project-portal-project-task-detail')?.config.page.route).toBe('/my/projects/task/detail');
    expect(discovered.pageDatasources.get('project-portal-project-task-detail')).toEqual(['portal_project_task_detail']);
  });

  test('matches the Odoo portal task detail labels and read-only controls', () => {
    const page = yaml('pages/portal-project-task-detail.yaml');
    const form = page.components[1];
    expect(page.title).toBe('Task');
    expect(page.components[0].children.map((child: any) => child.text)).toEqual(['Task', 'History', 'Assignees', 'Customer']);
    expect(form.editable).toBe(false);
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['Project', 'Milestone', 'Assignees', 'Customer', 'Priority', 'Deadline', 'Allocated Time']);
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Description', 'Communication history']);
    expect(yaml('api/portal-project-task-detail.yaml').actions).toContainEqual(expect.objectContaining({ id: 'back_to_portal_project', navigate_to: '/my/projects/detail', permission: 'project.portal' }));
  });

  test('returns deterministic project-scoped details and safe boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_portal_task_detail_test_migrations', ['schema', 'data']);
    const source = yaml('api/portal-project-task-detail.yaml').datasources[0];
    const rows = await repository.querySource(source, { project_id: 'project-demo-001', task_id: 'task-demo-001', fixture_state: null }, 0, 1);
    expect(rows.data).toMatchObject({ name: 'Complete module migration', project_id: 'project-demo-001', stage: 'In progress', status: 'In Progress' });
    expect((await repository.querySource(source, { project_id: 'project-demo-002', task_id: 'task-demo-001', fixture_state: null }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { project_id: 'project-demo-001', task_id: 'task-demo-001', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect(source.permission).toBe('project.portal');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_PORTAL_PROJECT_TASK_UNAVAILABLE' });
  });
});
