import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project customer portal projects parity', () => {
  test('keeps the portal route, menu, and API separate from internal Projects', () => {
    const page = yaml('pages/portal-projects.yaml');
    const api = yaml('api/portal-projects.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(manifest.menu.groups).toContainEqual(expect.objectContaining({ id: 'portal', label: 'Customer Portal' }));
    expect(page.page).toMatchObject({ id: 'project-portal-projects', route: '/my/projects', auth: { require: ['project.portal'] } });
    expect(api.page).toEqual({ id: 'project-portal-projects' });
    expect(discovered.pages.get('project-portal-projects')?.config.page.route).toBe('/my/projects');
    expect(discovered.pageDatasources.get('project-portal-projects')).toEqual(['portal_projects']);
  });

  test('matches Odoo portal labels and stable read-only navigation', () => {
    const page = yaml('pages/portal-projects.yaml');
    const list = page.components[0];
    expect(page.title).toBe('Projects');
    expect(list.columns.map((column: any) => column.label)).toEqual(['Project', 'Tasks']);
    expect(list.empty_state.title).toBe('There are no projects.');
    expect(yaml('api/portal-projects.yaml').actions).toEqual([{ id: 'view_portal_project', type: 'navigate', permission: 'project.portal', navigate_to: '/my/projects/detail', params: { id: '{row.id}' } }]);
  });

  test('returns non-template projects and deterministic empty/not-found/error contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_portal_projects_test_migrations', ['schema', 'data']);
    const source = yaml('api/portal-projects.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, sortby: 'name', fixture_state: null }, 0, 50);
    expect(rows.data.length).toBeGreaterThan(0);
    expect(rows.data.every((row: any) => row.name !== 'Core3 Template')).toBe(true);
    expect(rows.data[0]).toMatchObject({ name: 'Core3 Implementation' });
    expect((await repository.querySource(source, { q: 'does-not-exist', sortby: 'name', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, sortby: 'name', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.permission).toBe('project.portal');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_PORTAL_PROJECTS_UNAVAILABLE' });
  });
});
