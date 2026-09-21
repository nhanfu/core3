import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off overview calendar detail', () => {
  test('maps the Odoo report-calendar popup to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_leave_report_calendar.xml', 'utf8');
    const page = yaml('pages/time-off-overview-detail.yaml');
    const api = yaml('api/time-off-overview-detail.yaml');
    const overview = yaml('pages/time-off-overview.yaml');
    const overviewApi = yaml('api/time-off-overview.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(source).toContain('name="action_approve" string="Approve"');
    expect(source).toContain('name="action_refuse" string="Refuse"');
    expect(source).toContain('widget="daterange"');
    expect(page.page).toMatchObject({ id: 'time-off-overview-detail', route: '/time-off-overview/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(form).toMatchObject({ source: 'time_off_overview_detail', title_field: 'name' });
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(expect.arrayContaining(['Employee', 'Time Off Type', 'Dates', 'Duration', 'Description']));
    expect(overview.components[0]).toMatchObject({ row_open_action: 'open_time_off_overview_detail' });
    expect(overviewApi.actions).toContainEqual(expect.objectContaining({ id: 'open_time_off_overview_detail', navigate_to: '/time-off-overview/detail' }));
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'approve_time_off_overview_detail',
      'approve_first_time_off_overview_detail',
      'validate_time_off_overview_detail',
      'refuse_time_off_overview_detail',
    ]);
    expect(api.actions.every((action: any) => action.permission === 'time_off.manage' && action.handler === 'order_transition')).toBe(true);
    expect(api.datasources.map((datasource: any) => datasource.id)).toEqual(['time_off_overview_detail']);
  });

  test('queries only calendar-visible states and keeps the index/migration idempotent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_overview_calendar_detail', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_overview_calendar_detail', ['schema', 'data']);
    const source = yaml('api/time-off-overview-detail.yaml').datasources[0];
    expect(await repository.querySource(source, { id: 'leave-request-demo-002', fixture_state: null })).toMatchObject({ data: { name: 'LEAVE/2026/0002', employee_name: 'Admin User', leave_type_name: 'Compensatory Days', state: 'Submitted' } });
    expect((await repository.querySource(source, { id: 'leave-request-demo-004', fixture_state: null })).data).toEqual({});
    expect((await repository.querySource(source, { id: 'leave-request-demo-002', fixture_state: 'not_found' })).data).toEqual({});
    expect((await repository.querySource(source, { id: 'leave-request-demo-002', fixture_state: 'empty' })).data).toEqual({});
    expect(await repository.query("SELECT version FROM time_off_overview_calendar_detail WHERE version = '0.0.21'")).toEqual([{ version: '0.0.21' }]);
    expect(await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'leave_requests_overview_calendar_idx'")).toHaveLength(1);
    database.close();
  });

  test('persists the popup approval transition across close and reopen', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-overview-calendar-'));
    const databasePath = join(directory, 'time-off.duckdb');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_overview_calendar_restart', ['schema', 'data']);
      await firstRepository.query("INSERT INTO leave_balances(id, employee_id, employee_name, leave_type_id, leave_type_name, year, allocated_days, used_days) VALUES ('overview-calendar-balance-001', 'employee-demo-001', 'Admin User', 'leave-type-comp', 'Compensatory Days', 2026, 8, 0)");
      await firstRepository.query("INSERT INTO leave_requests(id, name, employee_id, employee_name, leave_type_id, leave_type_name, date_from, date_to, days, reason, state, row_version) VALUES ('overview-calendar-request-001', 'LEAVE/2026/OVERVIEW', 'employee-demo-001', 'Admin User', 'leave-type-comp', 'Compensatory Days', '2026-09-21', '2026-09-22', 2, 'Calendar popup approval', 'Submitted', 1)");
      const workflow = yaml('pages/time-off-workflow.yaml');
      const approve = workflow.workflow.transitions.find((transition: any) => transition.id === 'approve').mutation;
      await firstRepository.executeMutation(approve, { id: 'overview-calendar-request-001', expected_row_version: 1, current_user_name: 'Time Off Manager' });
      expect(await firstRepository.query("SELECT state, row_version FROM leave_requests WHERE id = 'overview-calendar-request-001'")).toEqual([{ state: 'Approved', row_version: 2 }]);
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, 'time_off_overview_calendar_restart', ['schema', 'data']);
      expect(await secondRepository.query("SELECT state, row_version FROM leave_requests WHERE id = 'overview-calendar-request-001'")).toEqual([{ state: 'Approved', row_version: 2 }]);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
