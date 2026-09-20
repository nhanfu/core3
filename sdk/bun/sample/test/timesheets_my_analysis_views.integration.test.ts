import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { q: null, state: null, work_date: null, fixture_state: null, current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', view_scope: 'own' };

describe('Timesheets My Timesheets analysis views parity', () => {
  test('maps the Odoo personal action pivot and graph views to separate page/API YAML', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components[0];
    const source = api.datasources.find((candidate: any) => candidate.id === 'timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<field name="view_mode">list,form,kanban,pivot,graph</field>');
    expect(odoo).toContain('view_my_timesheet_line_pivot');
    expect(odoo).toContain('view_hr_timesheet_line_graph_my');
    expect(odoo).toContain('<field name="date" interval="week" type="row"/>');
    expect(odoo).toContain('<field name="unit_amount" string="Time Spent" type="measure"');
    expect(odoo).toContain('<field name="project_id"/>');
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.page.route).toBe('/timesheets');
    expect(api.datasources.map((candidate: any) => candidate.id)).toContain('timesheet_entries');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'calendar', 'kanban', 'form', 'pivot', 'graph']);
    expect(list.views.find((view: any) => view.id === 'pivot')).toMatchObject({ mobile: false, pivot: { date_ranges: { work_date: 'week' } } });
    expect(list.views.find((view: any) => view.id === 'pivot').pivot.default).toEqual({
      rows: ['work_date'],
      columns: [],
      measures: [
        { field: 'hours', aggregate: 'sum', column: 'Time Spent' },
        { field: 'cost', aggregate: 'sum', column: 'Timesheet Costs' },
      ],
    });
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ category_field: 'work_date', date_field: 'work_date', series_field: 'project_name', measure_field: 'hours', type: 'bar' });
    expect(source).toMatchObject({ id: 'timesheet_entries', permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['work_date', 'project_name', 'hours', 'cost', 'state']));
  });

  test('keeps pivot-ready personal rows durable and company/actor scoped after restart', async () => {
    const path = `/tmp/timesheets-my-analysis-views-${process.pid}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_my_analysis_views_restart', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entries');
    const result = await repository.querySource(source, valid, 0, 50);
    expect(result.meta.total).toBe(10);
    expect(result.data[0]).toMatchObject({ id: 'timesheet-demo-001', work_date: '2026-01-15', hours: 8, cost: 680, project_name: 'Core3 Implementation' });
    expect((await repository.querySource(source, { ...valid, current_user_name: 'Morgan Taylor' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-report-002', 'timesheet-report-003', 'timesheet-report-007']);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    first.close();

    const restarted = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(restarted);
    await migrateDatabase(reopened, migrations, undefined, 'timesheets_my_analysis_views_restart', ['schema', 'data']);
    expect((await reopened.querySource(source, valid, 0, 50)).data[0]).toMatchObject({ id: 'timesheet-demo-001', hours: 8, cost: 680, work_date: '2026-01-15' });
    restarted.close();
  });

  test('retains read permission and existing concurrent personal CRUD boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_analysis_views_guards', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entries');
    expect(source.permission).toBe('timesheets.read');
    expect(yaml('pages/entries.yaml').page.auth.require).toEqual(['timesheets.read']);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const update = yaml('api/entry-detail.yaml').actions.find((action: any) => action.id === 'edit_timesheet_detail').mutation;
    expect(update.concurrency).toEqual({ required: true });
    await expect(repository.executeMutation(update, {
      id: 'timesheet-my-009', expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
      values: { work_date: '2026-01-15', project_name: 'Core3 Implementation', description: 'Stale analysis view edit', hours: 2 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });

  test('does not introduce moving values into the pivot/graph source', () => {
    const source = readFileSync(join(serviceRoot, 'api/entries.yaml'), 'utf8');
    expect(source).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|RANDOM\(|gen_random_uuid|Date\.now/);
  });
});
