import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const timesheetsRoot = join(sampleRoot, 'services/timesheets');
const yaml = (root: string, file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const operationQuery = async (repository: YamlRepository, definition: any, request: Record<string, unknown>) => {
  const bound = bindNamedParams(definition.query, request);
  return repository.query(bound.statement, bound.values);
};

describe('Timesheets project dashboard embedded action parity', () => {
  test('keeps the Odoo dashboard action page/API separated and scope guarded', () => {
    const page = yaml(join(sampleRoot, 'services/project'), 'pages/project-dashboard.yaml');
    const api = yaml(join(sampleRoot, 'services/project'), 'api/project-dashboard.yaml');
    const operations = yaml(timesheetsRoot, 'operations.yaml').operations;
    const source = api.datasources.find((candidate: any) => candidate.id === 'project_dashboard_timesheets');
    const entries = api.datasources.find((candidate: any) => candidate.id === 'project_dashboard_timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<record id="project_embedded_action_timesheets_dashboard" model="ir.embedded.actions">');
    expect(odoo).toContain('<field name="parent_action_id" ref="project.project_update_all_action"/>');
    expect(odoo).toContain('<field name="python_method">action_project_timesheets</field>');
    expect(odoo).toContain("<field name=\"domain\">[('allow_timesheets', '=', True)]</field>");
    expect(odoo).toContain("<field name=\"context\">{'from_embedded_action': true}</field>");
    expect(page.datasources).toBeUndefined();
    expect(source).toMatchObject({ type: 'service', service: 'yaml.service.timesheets', operation: 'timesheets.entries.project_summary', permission: 'timesheets.read' });
    expect(entries).toMatchObject({ type: 'service', service: 'yaml.service.timesheets', operation: 'timesheets.entries.by_project', permission: 'timesheets.read' });
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual([
      'project_dashboard_stats', 'project_dashboard_timesheets', 'project_dashboard_timesheet_entries', 'project_dashboard_updates', 'project_dashboard_milestones',
    ]);
    expect(operations['timesheets.entries.by_project'].query).toMatch(/allow_timesheets = TRUE/);
    expect(operations['timesheets.entries.by_project'].query).toMatch(/has_analytic_account = TRUE/);
    expect(operations['timesheets.entries.by_project'].query).toMatch(/company_name = 'Core3 Demo Company'/);
    expect(operations['timesheets.entries.project_summary'].query).toContain('GROUP BY p.id');
  });

  test('reads project dashboard hours from durable Timesheets after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-dashboard-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, join(timesheetsRoot, 'migrations'), undefined, 'timesheets_project_dashboard_restart', ['schema', 'data']);
    const operations = yaml(timesheetsRoot, 'operations.yaml').operations;
    const request = { project_id: 'project-demo-001', fixture_state: null };

    const initialEntries = await operationQuery(repository, operations['timesheets.entries.by_project'], request);
    const initialSummary = await operationQuery(repository, operations['timesheets.entries.project_summary'], request);
    expect(initialEntries).toHaveLength(8);
    expect(initialSummary[0]).toMatchObject({ project_id: 'project-demo-001', timesheets: 33, timesheet_entry_count: 8 });
    await repository.query("UPDATE timesheet_entries SET hours = hours + 1, row_version = row_version + 1 WHERE id = 'timesheet-demo-001'");
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    const summaryAfterRestart = await operationQuery(reopened, operations['timesheets.entries.project_summary'], request);
    expect(summaryAfterRestart[0]).toMatchObject({ project_id: 'project-demo-001', timesheets: 34, timesheet_entry_count: 8 });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('fails closed for non-timesheetable, missing-account, and wrong-company projects', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(timesheetsRoot, 'migrations'), undefined, 'timesheets_project_dashboard_guards', ['schema', 'data']);
    const operations = yaml(timesheetsRoot, 'operations.yaml').operations;
    const entries = operations['timesheets.entries.by_project'];
    const summary = operations['timesheets.entries.project_summary'];
    const request = { project_id: 'project-demo-001', fixture_state: null };
    const before = await operationQuery(repository, entries, request);
    expect(before).toHaveLength(8);

    await repository.query("UPDATE timesheet_projects SET allow_timesheets = FALSE WHERE id = 'project-demo-001'");
    expect(await operationQuery(repository, entries, request)).toEqual([]);
    expect(await operationQuery(repository, summary, request)).toEqual([]);

    await repository.query("UPDATE timesheet_projects SET allow_timesheets = TRUE, has_analytic_account = FALSE WHERE id = 'project-demo-001'");
    expect(await operationQuery(repository, entries, request)).toEqual([]);
    expect(await operationQuery(repository, summary, request)).toEqual([]);

    await repository.query("UPDATE timesheet_projects SET has_analytic_account = TRUE, company_name = 'Other Company' WHERE id = 'project-demo-001'");
    expect(await operationQuery(repository, entries, request)).toEqual([]);
    expect(await operationQuery(repository, summary, request)).toEqual([]);
    expect((await repository.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE project_id = 'project-demo-001'"))[0].count).toBe(8);
    database.close();
  });

  test('keeps the dashboard operations deterministic and free of moving or generated values', () => {
    const operations = yaml(timesheetsRoot, 'operations.yaml').operations;
    for (const id of ['timesheets.entries.by_project', 'timesheets.entries.project_summary']) {
      expect(String(operations[id].query)).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
    }
  });
});
