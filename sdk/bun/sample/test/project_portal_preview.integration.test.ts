import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project customer portal preview parity', () => {
  test('registers the record-linked Preview action with separate page/API ownership', () => {
    const detail = yaml('pages/project-detail.yaml');
    const detailApi = yaml('api/project-detail.yaml');
    const page = yaml('pages/project-portal-preview.yaml');
    const api = yaml('api/project-portal-preview.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(detail.components[0].header_actions).toContainEqual({ id: 'preview_project_portal', label: 'Preview', variant: 'secondary', permission: 'project.read' });
    expect(detailApi.actions).toContainEqual(expect.objectContaining({ id: 'preview_project_portal', navigate_to: '/projects/detail/preview' }));
    expect(page.components[0].type).toBe('Html');
    expect(page.components[1].source).toBe('project_portal_tasks');
    expect(api.page).toEqual({ id: 'project-portal-preview' });
    expect(discovered.pages.get('project-portal-preview')?.config.page.route).toBe('/projects/detail/preview');
    expect(discovered.pageDatasources.get('project-portal-preview')).toEqual(['project_portal_tasks']);
  });

  test('matches Odoo portal preview labels, grouping, columns, and read-only actions', () => {
    const page = yaml('pages/project-portal-preview.yaml');
    const list = page.components[1];
    expect(page.title).toBe('This is a preview of the customer portal');
    expect(list.group_by).toEqual([{ field: 'stage', label: 'Stage' }]);
    expect(list.default_group_by).toBe('stage');
    expect(list.columns.map((column: any) => column.label)).toEqual(['Name', 'Assignees', 'Milestone', 'Stage', 'Status']);
    expect(yaml('api/project-portal-preview.yaml').actions.map((action: any) => action.id)).toEqual(['back_to_project', 'view_project_portal_task']);
    expect(yaml('api/project-portal-preview.yaml').datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_PORTAL_PREVIEW_UNAVAILABLE' });
  });

  test('returns deterministic visible tasks and safe empty/not-found/error branches', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_portal_preview_test_migrations', ['schema', 'data']);
    const source = yaml('api/project-portal-preview.yaml').datasources[0];
    const rows = await repository.querySource(source, { id: 'project-demo-001', q: null, fixture_state: null }, 0, 50);
    expect(rows.data.length).toBeGreaterThan(0);
    expect(rows.data[0]).toMatchObject({ project_id: 'project-demo-001', name: 'Validate reporting contract', assignee: 'Mitchell Admin' });
    expect((await repository.querySource(source, { id: 'project-demo-001', q: 'does-not-exist', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'project-demo-001', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'missing', q: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    expect(source.permission).toBe('project.read');
  });
});
