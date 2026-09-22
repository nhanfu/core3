import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/project-configuration.yaml').actions.find((candidate: any) => candidate.id === id);

async function setup(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Project Configuration action parity', () => {
  test('matches the Odoo configuration action with page/API separation', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/project-configuration', label: 'Projects', permission: 'project.manage' }),
    ]));

    const page = yaml('pages/project-configuration.yaml');
    const api = yaml('api/project-configuration.yaml');
    const detailPage = yaml('pages/project-configuration-detail.yaml');
    const detailApi = yaml('api/project-configuration-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-configuration', route: '/project-configuration', auth: { require: ['project.manage'] } });
    expect(api.page).toEqual({ id: 'project-configuration' });
    expect(detailPage.page.id).toBe('project-configuration-detail');
    expect(detailApi.page).toEqual({ id: 'project-configuration-detail' });
    expect(discoverPages(join(import.meta.dir, '..')).pages.get('project-configuration')?.config.page.id).toBe('project-configuration');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('project-configuration')).toContain('project_configuration');
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form']);
    expect(page.components[0]).toMatchObject({ create_action: 'create_project_configuration', row_open_action: 'edit_project_configuration' });
    expect(api.datasources.find((source: any) => source.id === 'project_configuration')).toMatchObject({ permission: 'project.manage' });
    expect(action('edit_project_configuration').mutation.concurrency).toEqual({ required: true });
    expect(action('delete_project_configuration').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROJECT_CONFIGURATION_HAS_DEPENDENCIES', status: 409 }),
    ]));

    expect(readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_menus.xml', 'utf8')).toContain('id="menu_projects_config"');
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_project_views.xml', 'utf8')).toContain('<field name="path">project-configuration</field>');
  });

  test('returns ordered active projects and explicit empty/error states', async () => {
    const { database, repository } = await setup('project_configuration_action_queries');
    const source = yaml('api/project-configuration.yaml').datasources.find((candidate: any) => candidate.id === 'project_configuration');
    const active = await repository.querySource(source, { q: null, archived: 'active', state: null, stage: null, fixture_state: null }, 0, 50);
    expect(active.data.map((row: any) => row.id)).toEqual(['project-demo-001', 'project-demo-002']);
    expect(active.data.map((row: any) => row.sequence)).toEqual([10, 20]);
    expect((await repository.querySource(source, { q: 'Website', archived: 'active', state: null, stage: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['project-demo-002']);
    expect((await repository.querySource(source, { q: null, archived: 'active', state: null, stage: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, archived: 'active', state: null, stage: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, archived: 'active', state: null, stage: null, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'PROJECT_CONFIGURATION_UNAVAILABLE' });
    database.close();
  });

  test('persists project create, edit, archive, restore, and delete with guards', async () => {
    const { database, repository } = await setup('project_configuration_action_mutations');
    const create = action('create_project_configuration');
    const edit = action('edit_project_configuration');
    const archive = action('archive_project_configuration');
    const restore = action('unarchive_project_configuration');
    const remove = action('delete_project_configuration');
    const values = { name: 'Configuration Action Project', customer_name: 'Core3 QA', project_manager: 'Project Team', description: 'Durable action fixture', planned_hours: 12, spent_hours: 0, start_date: '2026-02-01', end_date: '2026-03-01', state: 'Draft', stage: 'Planning', sequence: 40, favorite: false };
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: values.name, sequence: 40, archived: false, is_template: false });
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: created.row_version, values: { ...values, name: 'Configuration Action Project Updated', planned_hours: 24 } }) as any;
    expect(updated).toMatchObject({ id: created.id, name: 'Configuration Action Project Updated', planned_hours: 24, row_version: created.row_version + 1 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: created.row_version, values: { ...values, name: 'Stale Project' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: updated.row_version, values: { archived: true } }) as any;
    expect(archived).toMatchObject({ id: created.id, archived: true, row_version: updated.row_version + 1 });
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: archived.row_version, values: { archived: false } }) as any;
    expect(restored).toMatchObject({ id: created.id, archived: false, row_version: archived.row_version + 1 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: restored.row_version });
    expect((await repository.query('SELECT id FROM projects WHERE id = ?', [created.id]))).toEqual([]);
    database.close();
  });

  test('keeps dependency-backed projects safe to archive but not delete', async () => {
    const { database, repository } = await setup('project_configuration_action_guards');
    const remove = action('delete_project_configuration');
    await expect(repository.executeMutation(remove.mutation, { id: 'project-demo-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'PROJECT_CONFIGURATION_HAS_DEPENDENCIES' });
    const detail = yaml('api/project-configuration-detail.yaml').datasources.find((candidate: any) => candidate.id === 'project_configuration_detail');
    expect((await repository.querySource(detail, { id: 'project-demo-001', fixture_state: null }, 0, 1)).data).toMatchObject({ id: 'project-demo-001', sequence: 10 });
    database.close();
  });
});
