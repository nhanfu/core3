import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Project Analysis parity', () => {
  test('keeps the page/API ownership, route, and reporting menu contract', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'project-analysis', route: '/project-analysis', auth: { require: ['project.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('project-analysis')).toEqual(['project_analysis_totals', 'project_analysis_states']);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/project-analysis', page: 'project-analysis', module: 'project' });
    expect(manifest.menu.groups.find((group: any) => group.id === 'reporting').items)
      .toContainEqual({ path: '/project-analysis', label: 'Project Analysis', icon: 'chart', permission: 'project.read' });
    expect(page.components.map((component: any) => component.type)).toEqual(['StatRow', 'Chart']);
  });

  test('serves deterministic totals/status data and declared failure states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'project_analysis_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'project_analysis_test_migrations', ['schema', 'data']);
    const api = yaml('api/analysis.yaml');
    const totals = api.datasources[0];
    const states = api.datasources[1];
    expect(await repository.querySource(totals, { fixture_state: null }, 0, 1)).toMatchObject({ data: { project_count: expect.any(Number), active_count: expect.any(Number), planned_hours: expect.any(Number) } });
    expect((await repository.querySource(states, { fixture_state: null }, 0, 50)).data.length).toBeGreaterThan(0);
    expect(await repository.querySource(totals, { fixture_state: 'empty' }, 0, 1)).toMatchObject({ data: {} });
    expect((await repository.querySource(states, { fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(totals, { fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'PROJECT_ANALYSIS_FORBIDDEN' });
    await expect(repository.querySource(states, { fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PROJECT_ANALYSIS_UNAVAILABLE' });
    database.close();
  });
});
