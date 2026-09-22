import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Project Burndown Chart parity', () => {
  test('binds the record-linked Odoo action to a page-id-owned route and chart', () => {
    const page = yaml('pages/project-burndown.yaml');
    const api = yaml('api/project-burndown.yaml');
    const projects = yaml('pages/projects.yaml');
    const grouped = yaml('pages/project-by-stage.yaml');
    const detail = yaml('api/project-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'project-burndown', route: '/projects/detail/burndown', auth: { require: ['project.read'] } });
    expect(page.components.map((component: any) => component.type)).toEqual(['StatRow', 'Chart']);
    expect(page.components[1]).toMatchObject({ source: 'project_burndown_chart', variant: 'line', label_field: 'period', value_field: 'open_tasks' });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('project-burndown')).toEqual(['project_burndown_project', 'project_burndown_chart']);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/projects/detail/burndown', page: 'project-burndown', module: 'project' });
    expect(projects.actions).toContainEqual(expect.objectContaining({ id: 'open_project_burndown', navigate_to: '/projects/detail/burndown' }));
    expect(grouped.actions).toContainEqual(expect.objectContaining({ id: 'open_project_burndown' }));
    expect(detail.actions).toContainEqual(expect.objectContaining({ id: 'open_project_burndown', permission: 'project.read' }));
  });

  test('returns durable project context, deterministic burndown series, and empty/error guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'project_burndown_test_migrations', ['schema', 'data']);
    const api = yaml('api/project-burndown.yaml');
    const project = api.datasources[0];
    const chart = api.datasources[1];

    expect(await repository.querySource(project, { project_id: 'project-demo-001', fixture_state: null }, 0, 1)).toMatchObject({
      data: { project_name: 'Core3 Implementation', task_count: expect.any(Number) },
    });
    const chartResult = await repository.querySource(chart, { project_id: 'project-demo-001', fixture_state: null }, 0, 50);
    expect(chartResult.data).toHaveLength(7);
    expect(chartResult.data[0]).toMatchObject({ period: '2026-01-15', open_tasks: expect.any(Number), closed_tasks: expect.any(Number) });
    expect(chartResult.data[chartResult.data.length - 1].period).toBe('2026-02-26');
    expect((await repository.querySource(project, { project_id: 'project-demo-001', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(chart, { project_id: 'project-demo-001', fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(project, { project_id: 'project-demo-001', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'PROJECT_BURNDOWN_FORBIDDEN' });
    await expect(repository.querySource(chart, { project_id: 'project-demo-001', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PROJECT_BURNDOWN_UNAVAILABLE' });
    database.close();
  });
});
