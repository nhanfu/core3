import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project customer portal project detail parity', () => {
  test('keeps the portal project link and detail API page-id bound', () => {
    const listApi = yaml('api/portal-projects.yaml');
    const page = yaml('pages/portal-project-detail.yaml');
    const api = yaml('api/portal-project-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(listApi.actions).toContainEqual(expect.objectContaining({ id: 'view_portal_project', navigate_to: '/my/projects/detail' }));
    expect(page.page).toMatchObject({ id: 'project-portal-project-detail', route: '/my/projects/detail', auth: { require: ['project.portal'] } });
    expect(api.page).toEqual({ id: 'project-portal-project-detail' });
    expect(discovered.pages.get('project-portal-project-detail')?.config.page.route).toBe('/my/projects/detail');
    expect(discovered.pageDatasources.get('project-portal-project-detail')).toEqual(['portal_project_tasks']);
  });

  test('matches the Odoo portal task labels, grouping, and empty state', () => {
    const page = yaml('pages/portal-project-detail.yaml');
    const list = page.components[1];
    expect(page.title).toBe('Tasks');
    expect(list.default_group_by).toBe('stage');
    expect(list.columns.map((column: any) => column.label)).toEqual(['#', 'Priority', 'Name', 'Assignees', 'Milestone', 'Status', 'Stage']);
    expect(list.empty_state.title).toBe('There are no tasks.');
    expect(yaml('api/portal-project-detail.yaml').actions).toContainEqual(expect.objectContaining({ id: 'view_portal_project_task', permission: 'project.portal' }));
  });

  test('returns project-scoped deterministic tasks and safe empty/not-found/error contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_portal_project_detail_test_migrations', ['schema', 'data']);
    const source = yaml('api/portal-project-detail.yaml').datasources[0];
    const rows = await repository.querySource(source, { id: 'project-demo-001', q: null, fixture_state: null }, 0, 50);
    expect(rows.data.length).toBeGreaterThan(0);
    expect(rows.data.every((row: any) => row.project_id === 'project-demo-001')).toBe(true);
    expect(rows.data).toContainEqual(expect.objectContaining({ name: 'Validate reporting contract', stage: 'In progress' }));
    expect((await repository.querySource(source, { id: 'project-demo-001', q: 'does-not-exist', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'project-demo-001', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'missing', q: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    expect(source.permission).toBe('project.portal');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_PORTAL_PROJECT_TASKS_UNAVAILABLE' });
  });
});
