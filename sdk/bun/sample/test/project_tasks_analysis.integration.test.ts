import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project Tasks Analysis parity', () => {
  test('joins the reporting page to a service-owned API fragment by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/tasks-analysis.yaml');
    const api = yaml('api/tasks-analysis.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-tasks-analysis', route: '/tasks-analysis', auth: { require: ['project.read'] } });
    expect(api.page).toEqual({ id: 'project-tasks-analysis' });
    expect(discovered.pages.get('project-tasks-analysis')?.config.page.id).toBe('project-tasks-analysis');
    expect(discovered.pageDatasources.get('project-tasks-analysis')).toContain('project_tasks_analysis');
    expect(readdirSync(join(serviceRoot, 'api'))).toContain('tasks-analysis.yaml');
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'project_tasks_analysis', empty_state: { title: 'No task analysis data' } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(page.components[0].views.find((view: any) => view.id === 'pivot')).toMatchObject({ show_leaf_rows: false, pivot: { default: { rows: ['project_name'], columns: ['stage'] } } });
  });

  test('returns deterministic grouped report rows, search, and empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_tasks_analysis_test_schema_migrations', ['schema', 'data']);
    const source = yaml('api/tasks-analysis.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, state: null, stage: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(13);
    expect(rows.data.map((row: any) => row.id)).toEqual([
      'task-analysis-002', 'task-analysis-008', 'task-demo-003', 'task-analysis-001', 'task-demo-001', 'task-demo-002', 'task-analysis-003',
      'task-analysis-005', 'task-analysis-004', 'task-analysis-006', 'task-analysis-007', 'task-demo-004', 'task-demo-005',
    ]);
    expect(rows.data.every((row: any) => Number(row.task_count) === 1)).toBe(true);
    expect(rows.data.every((row: any) => !row.due_date || String(row.due_date).startsWith('2026-'))).toBe(true);
    expect(rows.data.some((row: any) => row.stage === 'Planning')).toBe(true);
    expect(rows.data.some((row: any) => row.stage === 'In progress')).toBe(true);
    expect(rows.data.some((row: any) => row.stage === 'Done')).toBe(true);

    const searched = await repository.querySource(source, { q: 'permission', state: null, stage: null, fixture_state: null }, 0, 50);
    expect(searched.data.map((row: any) => row.id)).toEqual(['task-analysis-002']);
    const filtered = await repository.querySource(source, { q: null, state: 'Cancelled', stage: null, fixture_state: null }, 0, 50);
    expect(filtered.data.map((row: any) => row.id)).toEqual(['task-analysis-007', 'task-demo-005']);
    const empty = await repository.querySource(source, { q: null, state: null, stage: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);
  });

  test('keeps the report read-only and permission guarded', () => {
    const api = yaml('api/tasks-analysis.yaml');
    expect(api.datasources).toHaveLength(1);
    expect(api.datasources[0].permission).toBe('project.read');
    expect(api.datasources[0].error_states.transport_error.status).toBe(503);
    expect(yaml('pages/tasks-analysis.yaml').actions).toBeUndefined();
    expect(yaml('permissions.yaml').permissions).toContain('project.read');
  });
});
