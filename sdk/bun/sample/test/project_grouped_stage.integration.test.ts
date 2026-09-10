import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project grouped-by-stage menu action parity', () => {
  test('registers the distinct Odoo grouped Projects action and joins page/API by id', () => {
    const manifest = yaml('manifest.yaml');
    const menuItems = manifest.menu.groups.flatMap((group: any) => group.items);
    expect(menuItems).toContainEqual({ path: '/project-by-stage', label: 'Projects', icon: 'workflow', permission: 'project.read' });
    expect(menuItems.filter((item: any) => item.label === 'Projects').map((item: any) => item.path)).toEqual(['/projects', '/project-by-stage']);

    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/project-by-stage.yaml');
    const api = yaml('api/project-by-stage.yaml');
    const list = page.components[0];

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-by-stage', route: '/project-by-stage', auth: { require: ['project.read'] } });
    expect(api.page).toEqual({ id: 'project-by-stage' });
    expect(discovered.pages.get('project-by-stage')?.config.page.id).toBe('project-by-stage');
    expect(discovered.pageDatasources.get('project-by-stage')).toEqual(expect.arrayContaining(['project_by_stage_states', 'project_by_stage_groups', 'project_projects_by_stage']));

    expect(list).toMatchObject({ source: 'project_projects_by_stage', default_group_by: 'stage', row_open_action: 'view_project', row_double_click_action: 'view_project', empty_state: { title: 'No projects found by stage' } });
    expect(list.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'form', 'calendar', 'activity']);
    expect(list.views[0]).toMatchObject({ group_by: 'stage', groups_source: 'project_by_stage_groups' });
    expect(page.actions).toContainEqual(expect.objectContaining({ id: 'view_project', navigate_to: '/projects/detail', permission: 'project.read' }));
  });

  test('returns deterministic non-template projects grouped by ordered stages, with search and empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_grouped_stage_test_migrations', ['schema', 'data']);

    const api = yaml('api/project-by-stage.yaml');
    const groups = api.datasources.find((source: any) => source.id === 'project_by_stage_groups');
    const groupRows = await repository.querySource(groups, { fixture_state: null }, 0, 50);
    expect(groupRows.data.map((row: any) => row.label)).toEqual(['Planning', 'In progress', 'Done']);
    expect(groupRows.data.map((row: any) => row.sequence)).toEqual([10, 20, 30]);

    const projects = api.datasources.find((source: any) => source.id === 'project_projects_by_stage');
    const rows = await repository.querySource(projects, { q: null, state: null, stage: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['project-demo-002', 'project-demo-001']);
    expect(rows.data.map((row: any) => row.stage)).toEqual(['Planning', 'In progress']);
    expect(rows.data.map((row: any) => Number(row.stage_sequence))).toEqual([10, 20]);
    expect(rows.data).toHaveLength(2);
    expect(rows.data[0]).toMatchObject({ name: 'Website Refresh', customer_name: 'Northwind Traders', task_count: 6 });
    expect(rows.data[1]).toMatchObject({ name: 'Core3 Implementation', customer_name: 'Core3 Internal', favorite: true, task_count: 7 });

    const searched = await repository.querySource(projects, { q: 'Northwind', state: null, stage: null, fixture_state: null }, 0, 50);
    expect(searched.data.map((row: any) => row.id)).toEqual(['project-demo-002']);
    const filtered = await repository.querySource(projects, { q: null, state: null, stage: 'In progress', fixture_state: null }, 0, 50);
    expect(filtered.data.map((row: any) => row.id)).toEqual(['project-demo-001']);
    expect((await repository.querySource(projects, { q: null, state: null, stage: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(projects, { q: null, state: null, stage: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
  });

  test('keeps the grouped action read-only and permission guarded with a stable transport error', () => {
    const page = yaml('pages/project-by-stage.yaml');
    const api = yaml('api/project-by-stage.yaml');
    expect(page.page.auth.require).toEqual(['project.read']);
    expect(page.actions.every((action: any) => action.type === 'navigate' && action.permission === 'project.read')).toBe(true);
    expect(api.actions).toBeUndefined();
    for (const source of api.datasources) {
      expect(source.permission).toBe('project.read');
      expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_GROUPED_PROJECTS_UNAVAILABLE' });
    }
  });
});
