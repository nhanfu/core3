import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function setup(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Project grouped configuration action parity', () => {
  test('registers the source action and keeps the grouped page/API contract separate', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toContainEqual({ path: '/project-configuration-by-stage', label: 'Projects', icon: 'workflow', permission: 'project.manage' });

    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/project-configuration-by-stage.yaml');
    const api = yaml('api/project-configuration-by-stage.yaml');
    const list = page.components[0];
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-configuration-by-stage', route: '/project-configuration-by-stage', auth: { require: ['project.manage'] } });
    expect(api.page).toEqual({ id: 'project-configuration-by-stage' });
    expect(discovered.pages.get('project-configuration-by-stage')?.config.page.id).toBe('project-configuration-by-stage');
    expect(discovered.pageDatasources.get('project-configuration-by-stage')).toEqual(expect.arrayContaining(['project_configuration_by_stage_states', 'project_configuration_by_stage_groups', 'project_configuration_by_stage']));
    expect(list).toMatchObject({ source: 'project_configuration_by_stage', default_group_by: 'stage', create_action: 'create_project_configuration_by_stage', row_open_action: 'edit_project_configuration_by_stage' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'calendar', 'activity']);
    expect(list.views[1]).toMatchObject({ group_by: 'stage', groups_source: 'project_configuration_by_stage_groups' });
    expect(list.form_view.page).toContain('project-configuration-detail.yaml');

    const source = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_project_views.xml', 'utf8');
    const menus = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_menus.xml', 'utf8');
    expect(menus).toContain('id="menu_projects_config_group_stage"');
    expect(menus).toContain('action="open_view_project_all_config_group_stage"');
    expect(source).toContain('id="open_view_project_all_config_group_stage"');
    expect(source).toContain('<field name="view_mode">list,kanban,form,calendar,activity</field>');
    expect(source).toContain('id="view_project_config_group_stage"');
    expect(source).toContain('id="view_project_config_kanban_group_stage"');
  });

  test('returns active projects ordered by stage and sequence with grouped filters', async () => {
    const { database, repository } = await setup('project_configuration_grouped_queries');
    const api = yaml('api/project-configuration-by-stage.yaml');
    const groups = api.datasources.find((source: any) => source.id === 'project_configuration_by_stage_groups');
    const groupRows = await repository.querySource(groups, { fixture_state: null }, 0, 50);
    expect(groupRows.data.map((row: any) => row.label)).toEqual(['Planning', 'In progress', 'Done']);

    const projects = api.datasources.find((source: any) => source.id === 'project_configuration_by_stage');
    const rows = await repository.querySource(projects, { q: null, archived: 'active', state: null, stage: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['project-demo-002', 'project-demo-001']);
    expect(rows.data.map((row: any) => Number(row.stage_sequence))).toEqual([10, 20]);
    expect(rows.data[0]).toMatchObject({ name: 'Website Refresh', sequence: 20, task_count: 6 });
    expect(rows.data[1]).toMatchObject({ name: 'Core3 Implementation', sequence: 10, favorite: true, task_count: 9 });
    expect((await repository.querySource(projects, { q: 'Northwind', archived: 'active', state: null, stage: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['project-demo-002']);
    expect((await repository.querySource(projects, { q: null, archived: 'active', state: null, stage: 'In progress', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['project-demo-001']);
    expect((await repository.querySource(projects, { q: null, archived: 'active', state: null, stage: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(projects, { q: null, archived: 'active', state: null, stage: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(projects, { q: null, archived: 'active', state: null, stage: null, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'PROJECT_CONFIGURATION_GROUPED_UNAVAILABLE' });
    database.close();
  });

  test('keeps manager CRUD available while preserving the source permission boundary', () => {
    const page = yaml('pages/project-configuration-by-stage.yaml');
    const api = yaml('api/project-configuration-by-stage.yaml');
    expect(page.page.auth.require).toEqual(['project.manage']);
    for (const source of api.datasources) {
      expect(source.permission).toBe('project.manage');
      expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_CONFIGURATION_GROUPED_UNAVAILABLE' });
    }
    expect(api.actions.map((action: any) => action.id)).toEqual(expect.arrayContaining([
      'create_project_configuration_by_stage', 'edit_project_configuration_by_stage', 'archive_project_configuration_by_stage', 'unarchive_project_configuration_by_stage', 'delete_project_configuration_by_stage',
    ]));
    expect(api.actions.find((action: any) => action.id === 'edit_project_configuration_by_stage').mutation.concurrency).toEqual({ required: true });
    expect(api.actions.find((action: any) => action.id === 'delete_project_configuration_by_stage').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROJECT_CONFIGURATION_HAS_DEPENDENCIES', status: 409 }),
    ]));
    expect(page.components[0].row_actions).toBe('menu');
  });
});
