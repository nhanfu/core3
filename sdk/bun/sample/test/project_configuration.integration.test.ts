import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`api/${file}`).actions.find((candidate: any) => candidate.id === id);

describe('Project configuration parity', () => {
  test('keeps stages, tags, and roles layout-only and page.id-bound', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const screens = [
      ['project-stages', 'project-stages.yaml', 'project_configuration_stages', ['list', 'kanban', 'form']],
      ['project-tags', 'project-tags.yaml', 'project_configuration_tags', ['list', 'form']],
      ['project-roles', 'project-roles.yaml', 'project_configuration_roles', ['list', 'kanban', 'form']],
      ['project-stage-detail', 'project-stage-detail.yaml', 'project_configuration_stage_detail', []],
      ['project-tag-detail', 'project-tag-detail.yaml', 'project_configuration_tag_detail', []],
      ['project-role-detail', 'project-role-detail.yaml', 'project_configuration_role_detail', []],
    ] as const;

    for (const [pageId, pageFile, sourceId, views] of screens) {
      const page = yaml(`pages/${pageFile}`);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.auth.require, pageFile).toEqual(['project.manage']);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
      if (views.length) {
        const list = page.components.find((component: any) => component.type === 'ListView');
        expect(list.views.map((view: any) => view.id), pageFile).toEqual(views);
        expect(list.form_view.page, pageFile).toContain('project-');
      }
    }

    expect(yaml('pages/project-stages.yaml').components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Name', 'Folded', 'Company']);
    expect(yaml('pages/project-tags.yaml').components[0].columns.map((column: any) => column.label)).toEqual(['Name', 'Color']);
    expect(yaml('pages/project-roles.yaml').components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Name', 'Color']);
    expect(yaml('manifest.yaml').menu.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'configuration', label: 'Configuration' }),
    ]));
  });

  test('seeds deterministic Odoo labels and supports search, empty, archive, and CRUD boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'project_configuration_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'project_configuration_test_migrations', ['schema', 'data']);

    const stages = yaml('api/project-stages.yaml').datasources[0];
    const stageRows = await repository.querySource(stages, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(stageRows.data.map((row: any) => row.name)).toEqual(['To Do', 'In Progress', 'Done', 'Cancelled']);
    expect((await repository.querySource(stages, { q: 'missing', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(stages, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(stages, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([]);

    const tags = yaml('api/project-tags.yaml').datasources[0];
    const tagRows = await repository.querySource(tags, { q: null, fixture_state: null }, 0, 50);
    expect(tagRows.data).toHaveLength(17);
    expect(tagRows.data[0]).toMatchObject({ name: 'Architecture', color: 1 });
    expect((await repository.querySource(tags, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const roles = yaml('api/project-roles.yaml').datasources[0];
    const roleRows = await repository.querySource(roles, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(roleRows.data.map((row: any) => row.name)).toEqual(['Project Manager', 'Developer', 'Reviewer']);

    const createTag = action('project-tags.yaml', 'create_project_tag');
    const created = await repository.executeMutation(createTag.mutation, { values: { name: 'Release', color: 5 } });
    expect(created).toMatchObject({ name: 'Release', color: 5 });
    await expect(repository.executeMutation(createTag.mutation, { values: { name: 'release', color: 6 } })).rejects.toMatchObject({ status: 409, code: 'PROJECT_TAG_NAME_EXISTS' });

    const editTag = action('project-tags.yaml', 'edit_project_tag');
    await repository.executeMutation(editTag.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Release Notes', color: 8 } });
    await expect(repository.executeMutation(editTag.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', color: 9 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archiveRole = action('project-roles.yaml', 'archive_project_role');
    await repository.executeMutation(archiveRole.mutation, { id: 'project-config-role-001', expected_row_version: 1, values: { active: false } });
    expect((await repository.querySource(roles, { q: null, active: 'active', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Developer', 'Reviewer']);
    expect((await repository.querySource(roles, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Project Manager']);

    const deleteTag = action('project-tags.yaml', 'delete_project_tag');
    await repository.executeMutation(deleteTag.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(tags, { q: 'Release Notes', fixture_state: null }, 0, 50)).data).toEqual([]);
  });

  test('declares manager permission, unavailable states, duplicate guards, and optimistic concurrency for every resource', () => {
    for (const [file, sourceId, actionIds] of [
      ['project-stages.yaml', 'project_configuration_stages', ['create_project_stage', 'edit_project_stage', 'archive_project_stage', 'unarchive_project_stage', 'delete_project_stage']],
      ['project-tags.yaml', 'project_configuration_tags', ['create_project_tag', 'edit_project_tag', 'delete_project_tag']],
      ['project-roles.yaml', 'project_configuration_roles', ['create_project_role', 'edit_project_role', 'archive_project_role', 'unarchive_project_role', 'delete_project_role']],
    ] as const) {
      const config = yaml(`api/${file}`);
      const source = config.datasources.find((candidate: any) => candidate.id === sourceId);
      expect(source.permission, file).toBe('project.manage');
      expect(source.error_states.transport_error.status, file).toBe(503);
      for (const id of actionIds) {
        const candidate = config.actions.find((entry: any) => entry.id === id);
        expect(candidate.permission, `${file}:${id}`).toBe('project.manage');
        expect(candidate.handler, `${file}:${id}`).toBe('yaml_mutation');
        expect(candidate.mutation, `${file}:${id}`).toBeDefined();
        expect(candidate.mutation.concurrency?.required !== false, `${file}:${id}`).toBe(true);
      }
      expect(config.actions.filter((entry: any) => entry.mutation?.guards?.some((guard: any) => guard.status === 409)).length, file).toBeGreaterThan(0);
    }
  });
});
