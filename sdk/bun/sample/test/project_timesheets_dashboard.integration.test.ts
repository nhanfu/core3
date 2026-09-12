import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const projectRoot = join(sampleRoot, 'services/project');
const timesheetsRoot = join(sampleRoot, 'services/timesheets');
const yaml = (root: string, file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Project dashboard Timesheets integration', () => {
  test('declares the dashboard dependency and keeps the page layout-only', () => {
    const discovered = discoverPages(sampleRoot);
    const page = yaml(projectRoot, 'pages/project-dashboard.yaml');
    const api = yaml(projectRoot, 'api/project-dashboard.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'project_dashboard_timesheets');
    const entries = api.datasources.find((candidate: any) => candidate.id === 'project_dashboard_timesheet_entries');
    expect(page.datasources).toBeUndefined();
    expect(page.components.find((component: any) => component.source === 'project_dashboard_timesheets')).toMatchObject({ type: 'StatRow', title: 'Timesheets' });
    expect(source).toMatchObject({ type: 'service', service: 'yaml.service.timesheets', operation: 'timesheets.entries.project_summary', permission: 'timesheets.read' });
    expect(source.service_params).toEqual({ project_id: 'id', fixture_state: 'fixture_state' });
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_DASHBOARD_TIMESHEETS_UNAVAILABLE' });
    expect(entries).toMatchObject({ type: 'service', service: 'yaml.service.timesheets', operation: 'timesheets.entries.by_project', permission: 'timesheets.read' });
    expect(discovered.pageDatasources.get('project-dashboard')).toContain('project_dashboard_timesheets');
  });

  test('returns project-scoped entries and durable hour totals through Timesheets', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(timesheetsRoot, 'migrations'), undefined, 'project_dashboard_timesheets_migrations', ['schema', 'data']);
    const operations = yaml(timesheetsRoot, 'operations.yaml').operations;
    const entries = operations['timesheets.entries.by_project'];
    const summary = operations['timesheets.entries.project_summary'];
    const entryQuery = entries.query.replaceAll(':fixture_state', '?').replaceAll(':project_id', '?');
    const summaryQuery = summary.query.replaceAll(':fixture_state', '?').replaceAll(':project_id', '?');
    const entryRows = await repository.query(entryQuery, [null, 'project-demo-001']);
    expect(entryRows.length).toBeGreaterThan(0);
    expect(entryRows.every((row: any) => row.project_id === 'project-demo-001')).toBe(true);
    const before = await repository.query(summaryQuery, ['project-demo-001', null, 'project-demo-001']);
    expect(before[0]).toMatchObject({ project_id: 'project-demo-001', timesheets: 33, timesheet_entry_count: 8 });
    await repository.query("UPDATE timesheet_entries SET hours = hours + 1, row_version = row_version + 1 WHERE id = 'timesheet-demo-001'");
    const after = await repository.query(summaryQuery, ['project-demo-001', null, 'project-demo-001']);
    expect(after[0]).toMatchObject({ timesheets: 34, timesheet_entry_count: 8 });
    expect(await repository.query(entryQuery, ['empty', 'project-demo-001'])).toEqual([]);
    database.close();
  });
});
