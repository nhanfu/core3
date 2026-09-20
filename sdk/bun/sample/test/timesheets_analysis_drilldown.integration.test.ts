import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { q: null, fixture_state: null, current_company_name: 'Core3 Demo Company' };

describe('Timesheets analysis report drilldown parity', () => {
  test('maps the Odoo analysis form to a separate page/API row action', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'timesheet_analysis');
    const action = api.actions.find((candidate: any) => candidate.id === 'view_timesheet_analysis_entry');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/hr_timesheet_report_view.xml', 'utf8');

    expect(odoo).toContain('<record id="timesheets_analysis_report_form" model="ir.ui.view">');
    expect(odoo).toContain('<record id="act_hr_timesheet_report" model="ir.actions.act_window">');
    expect(odoo).toContain('<field name="employee_id"/>');
    expect(odoo).toContain('<field name="project_id"/>');
    expect(odoo).toContain('<field name="task_id"/>');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'timesheet-analysis', route: '/timesheet-analysis', auth: { require: ['timesheets.read'] } });
    expect(page.components[1]).toMatchObject({
      source: 'timesheet_analysis',
      row_open_action: 'view_timesheet_analysis_entry',
      row_double_click_action: 'view_timesheet_analysis_entry',
    });
    expect(api.page).toEqual({ id: 'timesheet-analysis' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['employee_id', 'project_id', 'task_id', 'work_date']));
    expect(action).toMatchObject({
      type: 'navigate',
      permission: 'timesheets.read',
      navigate_to: '/timesheets/detail',
      params: { id: '{row.id}', view_scope: 'all', report_scope: 'analysis' },
    });
  });

  test('returns persisted analysis context and detail after migration replay and file-backed restart', async () => {
    const path = `/tmp/timesheets-analysis-drilldown-${process.pid}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_analysis_drilldown_restart', ['schema', 'data']);
    const report = yaml('api/analysis.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_analysis');
    const result = await repository.querySource(report, valid, 0, 50);
    const row = result.data.find((candidate: any) => candidate.id === 'timesheet-demo-001');
    expect(row).toMatchObject({
      id: 'timesheet-demo-001',
      employee_id: 'employee-demo-001',
      project_id: 'project-demo-001',
      task_id: 'task-demo-001',
      employee_name: 'Admin User',
      project_name: 'Core3 Implementation',
    });
    const detail = yaml('api/entry-detail.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_detail');
    expect((await repository.querySource(detail, {
      id: row.id,
      view_scope: 'all',
      current_user_name: 'Admin User',
      current_company_name: 'Core3 Demo Company',
    }, 0, 1)).data).toMatchObject({ id: row.id, company_name: 'Core3 Demo Company', task_id: row.task_id });
    first.close();

    const restarted = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(restarted);
    await migrateDatabase(reopened, migrations, undefined, 'timesheets_analysis_drilldown_restart', ['schema', 'data']);
    expect((await reopened.querySource(report, valid, 0, 50)).data.find((candidate: any) => candidate.id === row.id)).toMatchObject({
      employee_id: row.employee_id,
      project_id: row.project_id,
      task_id: row.task_id,
      work_date: row.work_date,
    });
    expect((await reopened.querySource(detail, {
      id: row.id,
      view_scope: 'all',
      current_user_name: 'Admin User',
      current_company_name: 'Core3 Demo Company',
    }, 0, 1)).data).toMatchObject({ id: row.id, employee_name: 'Admin User' });
    restarted.close();
  });

  test('keeps analysis rows company-scoped and the row action permissioned', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_analysis_drilldown_guards', ['schema', 'data']);
    const report = yaml('api/analysis.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_analysis');
    expect((await repository.querySource(report, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(report, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const action = yaml('api/analysis.yaml').actions[0];
    expect(action.permission).toBe('timesheets.read');
    expect(yaml('pages/analysis.yaml').page.auth.require).toEqual(['timesheets.read']);
    database.close();
  });

  test('keeps the analysis fixture fixed and free of moving or generated values', () => {
    const source = readFileSync(join(serviceRoot, 'api/analysis.yaml'), 'utf8');
    expect(source).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|RANDOM\(|gen_random_uuid|Date\.now/);
  });
});
