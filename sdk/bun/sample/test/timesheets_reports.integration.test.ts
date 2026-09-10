import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const reportPages = [
  ['timesheets-by-employee', 'timesheets-by-employee.yaml', 'timesheet_report_by_employee', 'employee_name'],
  ['timesheets-by-project', 'timesheets-by-project.yaml', 'timesheet_report_by_project', 'project_name'],
  ['timesheets-by-task', 'timesheets-by-task.yaml', 'timesheet_report_by_task', 'task_name'],
  ['timesheets-billing', 'timesheets-billing.yaml', 'timesheet_report_by_billing_type', 'billing_type'],
] as const;

describe('Timesheets reporting parity slice', () => {
  test('maps each Odoo report route to a layout-only page and matching API fragment', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const routes = discoverPageRoutes(discovered);
    const manifest = yaml('manifest.yaml');
    const reportItems = manifest.menu.groups.find((group: any) => group.id === 'reporting').items;

    expect(reportItems.map((item: any) => item.path)).toEqual([
      '/timesheets-by-employee', '/timesheets-by-project', '/timesheets-by-task', '/timesheets-billing',
    ]);
    for (const [pageId, pageFile] of reportPages) {
      const page = yaml(`pages/${pageFile}`);
      const api = yaml(`api/${pageFile}`);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.actions, pageFile).toBeUndefined();
      expect(page.page.id, pageFile).toBe(pageId);
      expect(api.page.id, pageFile).toBe(pageId);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(api.datasources[0].id);
      expect(routes.find((route) => route.page === pageId)?.path, pageFile).toBe(`/${pageId}`);
      expect(api.datasources[0].permission, pageFile).toBe('timesheets.manage');
      expect(api.datasources[0].pivot.fields).toEqual(expect.arrayContaining(['date', 'month']));
      expect(page.components[0].views.find((view: any) => view.id === 'pivot').pivot.default.measures).toEqual([
        { field: pageId === 'timesheets-billing' ? 'unit_amount' : 'amount', aggregate: 'sum', column: pageId === 'timesheets-billing' ? 'Time Spent' : 'Timesheet Costs' },
        { field: pageId === 'timesheets-billing' ? 'amount' : 'unit_amount', aggregate: 'sum', column: pageId === 'timesheets-billing' ? 'Timesheet Costs' : 'Time Spent' },
      ]);
    }
  });

  test('keeps deterministic report rows and pivot-ready measures across fresh install and rerun', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'timesheets_reports_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_reports_schema_migrations', ['schema', 'data']);

    const sourceRows = await repository.query('SELECT COUNT(*) AS count, SUM(hours) AS hours FROM timesheet_entries WHERE project_name IS NOT NULL');
    expect(sourceRows[0]).toMatchObject({ count: 8, hours: 43.5 });

    for (const [, pageFile, sourceId, dimension] of reportPages) {
      const source = yaml(`api/${pageFile}`).datasources.find((candidate: any) => candidate.id === sourceId);
      const result = await repository.querySource(source, { q: null }, 0, 50);
      expect(result.meta.total, sourceId).toBe(8);
      expect(result.data[0]).toEqual(expect.objectContaining({ date: '2026-01-15T00:00:00.000Z', [dimension]: expect.any(String), unit_amount: 8 }));
      expect(result.data.every((row: any) => row.amount <= 0), sourceId).toBe(true);
      const expectedValues = dimension === 'employee_name'
        ? ['Admin User', 'Morgan Taylor', 'Priya Shah']
        : dimension === 'project_name'
          ? ['Core3 Implementation', 'Delivery Enablement']
          : dimension === 'task_name'
            ? ['Complete module migration', 'Requirements analysis', 'Design', 'Quality analysis', 'Delivery', 'Training', 'Presentation', 'Sprint']
            : ['Billed at a Fixed Price', 'Billed Manually', 'Billed on Milestones', 'Billed on Timesheets', 'Non-Billable'];
      expect(result.data.map((row: any) => row[dimension]), sourceId).toEqual(expect.arrayContaining(expectedValues));
    }
  });

  test('supports report search without changing the fixed fixture date', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_reports_search_migrations', ['schema', 'data']);
    const source = yaml('api/timesheets-by-task.yaml').datasources[0];
    const result = await repository.querySource(source, { q: 'Training' }, 0, 50);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ task_name: 'Training', date: '2026-01-08T00:00:00.000Z', unit_amount: 5 });
  });

  test('billing report groups deterministic invoice types and honors empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_billing_report_migrations', ['schema', 'data']);
    const source = yaml('api/timesheets-billing.yaml').datasources[0];
    const result = await repository.querySource(source, { q: null }, 0, 50);
    expect(result.meta.total).toBe(8);
    expect(result.data.map((row: any) => row.billing_type)).toEqual(expect.arrayContaining([
      'Billed at a Fixed Price', 'Billed Manually', 'Billed on Milestones', 'Billed on Timesheets', 'Non-Billable',
    ]));
    expect(result.data.filter((row: any) => row.billing_type === 'Non-Billable').every((row: any) => row.billable_time === 0 && row.non_billable_time > 0)).toBe(true);
    const searched = await repository.querySource(source, { q: 'Billed Manually' }, 0, 50);
    expect(searched.data).toHaveLength(1);
    expect(searched.data[0].billing_type).toBe('Billed Manually');
    const empty = await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.meta.total).toBe(0);
    expect(empty.data).toEqual([]);
  });
});
