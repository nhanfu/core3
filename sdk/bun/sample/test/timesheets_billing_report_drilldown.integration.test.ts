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

describe('Timesheets billing report drilldown parity', () => {
  test('maps the source analysis form and billing action to separate page/API row navigation', () => {
    const page = yaml('pages/timesheets-billing.yaml');
    const api = yaml('api/timesheets-billing.yaml');
    const source = api.datasources[0];
    const action = api.actions.find((candidate: any) => candidate.id === 'view_billing_report_entry');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/hr_timesheet_report_view.xml', 'utf8');
    const plan = readFileSync(join(sampleRoot, 'plan/odoo-ui-parity/timesheets.md'), 'utf8');

    expect(odoo).toContain('<record id="timesheets_analysis_report_form" model="ir.ui.view">');
    expect(odoo).toContain('<field name="employee_id"/>');
    expect(odoo).toContain('<field name="project_id"/>');
    expect(odoo).toContain('<field name="task_id"/>');
    expect(plan).toContain('Timesheets by Billing Type');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'timesheets-billing', route: '/timesheets-billing', auth: { require: ['timesheets.manage'] } });
    expect(page.components[0]).toMatchObject({
      source: 'timesheet_report_by_billing_type',
      row_open_action: 'view_billing_report_entry',
      row_double_click_action: 'view_billing_report_entry',
    });
    expect(api.page).toEqual({ id: 'timesheets-billing' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['employee_id', 'project_id', 'task_id', 'company_name']));
    expect(action).toMatchObject({
      type: 'navigate',
      permission: 'timesheets.manage',
      navigate_to: '/timesheets/detail',
      params: { id: '{row.id}', view_scope: 'all', report_scope: 'billing' },
    });
  });

  test('returns a durable billing row and its detail context after migration replay and restart', async () => {
    const path = `/tmp/timesheets-billing-report-drilldown-${process.pid}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_billing_report_drilldown_restart', ['schema', 'data']);
    const report = yaml('api/timesheets-billing.yaml').datasources[0];
    const result = await repository.querySource(report, valid, 0, 50);
    const row = result.data.find((candidate: any) => candidate.id === 'timesheet-demo-001');
    expect(row).toMatchObject({
      id: 'timesheet-demo-001',
      billing_type: 'Billed on Timesheets',
      employee_id: 'employee-demo-001',
      project_id: 'project-demo-001',
      task_id: 'task-demo-001',
      company_name: 'Core3 Demo Company',
    });
    const detail = yaml('api/entry-detail.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_detail');
    expect((await repository.querySource(detail, {
      id: row.id,
      view_scope: 'all',
      current_user_name: 'Admin User',
      current_company_name: 'Core3 Demo Company',
    }, 0, 1)).data).toMatchObject({ id: row.id, company_name: row.company_name, project_id: row.project_id });
    first.close();

    const restarted = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(restarted);
    await migrateDatabase(reopened, migrations, undefined, 'timesheets_billing_report_drilldown_restart', ['schema', 'data']);
    expect((await reopened.querySource(report, valid, 0, 50)).data.find((candidate: any) => candidate.id === row.id)).toMatchObject({
      billing_type: row.billing_type,
      project_id: row.project_id,
      task_id: row.task_id,
      date: row.date,
    });
    expect((await reopened.querySource(detail, {
      id: row.id,
      view_scope: 'all',
      current_user_name: 'Admin User',
      current_company_name: 'Core3 Demo Company',
    }, 0, 1)).data).toMatchObject({ id: row.id, task_id: row.task_id });
    restarted.close();
  });

  test('keeps billing drilldown company-scoped, manager-guarded, and empty-safe', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_billing_report_drilldown_guards', ['schema', 'data']);
    const report = yaml('api/timesheets-billing.yaml').datasources[0];
    expect((await repository.querySource(report, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(report, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(yaml('api/timesheets-billing.yaml').actions[0].permission).toBe('timesheets.manage');
    expect(yaml('pages/timesheets-billing.yaml').page.auth.require).toEqual(['timesheets.manage']);
    database.close();
  });

  test('keeps billing report fixtures fixed and free of moving or generated values', () => {
    const source = readFileSync(join(serviceRoot, 'api/timesheets-billing.yaml'), 'utf8');
    expect(source).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|RANDOM\(|gen_random_uuid|Date\.now/);
  });
});
