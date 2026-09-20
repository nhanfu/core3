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

describe('Timesheets By Project report drilldown parity', () => {
  test('maps the Odoo project analysis form to a separate page/API row action', () => {
    const page = yaml('pages/timesheets-by-project.yaml');
    const api = yaml('api/timesheets-by-project.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'timesheet_report_by_project');
    const action = api.actions.find((candidate: any) => candidate.id === 'view_project_report_entry');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/hr_timesheet_report_view.xml', 'utf8');

    expect(odoo).toContain('<record id="timesheets_analysis_report_form" model="ir.ui.view">');
    expect(odoo).toContain('<field name="project_id"/>');
    expect(odoo).toContain('<field name="task_id"/>');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'timesheets-by-project', route: '/timesheets-by-project', auth: { require: ['timesheets.manage'] } });
    expect(page.components[0]).toMatchObject({
      source: 'timesheet_report_by_project',
      row_open_action: 'view_project_report_entry',
      row_double_click_action: 'view_project_report_entry',
    });
    expect(api.page).toEqual({ id: 'timesheets-by-project' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['project_id', 'task_id']));
    expect(action).toMatchObject({
      type: 'navigate',
      permission: 'timesheets.manage',
      navigate_to: '/project-timesheets',
      params: { project_id: '{row.project_id}' },
    });
  });

  test('returns the durable project context after migration replay and restart', async () => {
    const path = `/tmp/timesheets-project-report-drilldown-${process.pid}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_project_report_drilldown_restart', ['schema', 'data']);
    const report = yaml('api/timesheets-by-project.yaml').datasources[0];
    const result = await repository.querySource(report, valid, 0, 50);
    const row = result.data.find((candidate: any) => candidate.id === 'timesheet-demo-001');
    expect(row).toMatchObject({ id: 'timesheet-demo-001', project_id: 'project-demo-001', task_id: 'task-demo-001', project_name: 'Core3 Implementation' });
    first.close();

    const restarted = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(restarted);
    await migrateDatabase(reopened, migrations, undefined, 'timesheets_project_report_drilldown_restart', ['schema', 'data']);
    expect((await reopened.querySource(report, valid, 0, 50)).data.find((candidate: any) => candidate.id === row.id)).toMatchObject({ project_id: 'project-demo-001', task_id: 'task-demo-001' });
    restarted.close();
  });

  test('keeps the project report interaction company-scoped and manager-guarded', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_report_drilldown_guards', ['schema', 'data']);
    const report = yaml('api/timesheets-by-project.yaml').datasources[0];
    expect((await repository.querySource(report, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(report, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(yaml('api/timesheets-by-project.yaml').actions[0].permission).toBe('timesheets.manage');
    expect(yaml('pages/timesheets-by-project.yaml').page.auth.require).toEqual(['timesheets.manage']);
    database.close();
  });

  test('keeps project report rows fixed and free of moving or generated values', () => {
    const source = readFileSync(join(serviceRoot, 'api/timesheets-by-project.yaml'), 'utf8');
    expect(source).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|RANDOM\(|gen_random_uuid|Date\.now/);
  });
});
