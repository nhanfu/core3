import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('TIMEOFF-DASHBOARD-REQUEST-MODAL-001', () => {
  test('maps Odoo hr_leave_action_my_request to a page/API-joined dashboard form', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_holidays/views/hr_leave_views.xml', 'utf8');
    const page = yaml('pages/time-off-dashboard.yaml');
    const api = yaml('api/time-off-dashboard.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'dashboard_new_request');

    expect(source).toContain('<record id="hr_leave_action_my_request" model="ir.actions.act_window">');
    expect(source).toContain('<field name="name">Time Off Request</field>');
    expect(source).toContain('<field name="target">new</field>');
    expect(page.page).toMatchObject({ id: 'time-off-dashboard', route: '/time-off' });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: page.page.id });
    expect(page.toolbar).toContainEqual(expect.objectContaining({ id: 'dashboard_new_request', action: 'dashboard_new_request' }));
    expect(action).toMatchObject({
      type: 'server_form', title: 'Time Off Request', action: 'hr_leave_action_my_request',
      permission: 'time_off.write', operation: 'create', handler: 'yaml_mutation',
      submit_label: 'Save', cancel_label: 'Discard',
    });
    expect(action.fields.map((field: any) => field.label)).toEqual(['Time Off Type', 'From', 'To', 'Duration (days)', 'Description']);
    expect(action.fields.find((field: any) => field.field === 'holiday_status_id')).toMatchObject({
      type: 'select', options_source: 'time_off_dashboard_leave_types', required: true,
    });
    expect(api.datasources.find((source: any) => source.id === 'time_off_dashboard_leave_types')).toMatchObject({ permission: 'time_off.read' });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('time-off-dashboard')).toEqual([
      'time_off_dashboard_leave_types', 'time_off_dashboard_totals', 'time_off_dashboard_requests',
    ]);
  });

  test('persists a deterministic draft for the authenticated employee and replays migration safely', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_dashboard_request_modal', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_dashboard_request_modal', ['schema', 'data']);
    const api = yaml('api/time-off-dashboard.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'time_off_dashboard_leave_types');
    const action = api.actions.find((candidate: any) => candidate.id === 'dashboard_new_request');
    expect((await repository.querySource(source, {}, 0, 50)).data).toEqual([
      { value: 'leave-type-annual', label: 'Annual Leave' },
      { value: 'leave-type-comp', label: 'Compensatory Days' },
      { value: 'leave-type-sick', label: 'Sick Time Off' },
      { value: 'leave-type-training', label: 'Training Time Off' },
    ]);

    const values = { holiday_status_id: 'leave-type-annual', date_from: '2026-09-21', date_to: '2026-09-21', days: 1, reason: 'Dashboard modal request' };
    const created = await repository.executeMutation(action.mutation, { values });
    expect(created).toMatchObject({
      id: 'leave-request-dashboard-2026-09-21-leave-type-annual',
      name: 'LEAVE/DASHBOARD/2026-09-21/leave-type-annual',
      employee_id: 'employee-demo-001', employee_name: 'Admin User',
      leave_type_name: 'Annual Leave', days: 1, state: 'Draft', reason: 'Dashboard modal request',
    });
    expect((await repository.query("SELECT COUNT(*) AS count FROM leave_requests WHERE id = 'leave-request-dashboard-2026-09-21-leave-type-annual'"))[0].count).toBe(1);
    expect((await repository.query("SELECT COUNT(*) AS count FROM time_off_dashboard_request_modal WHERE version = '0.0.28'"))[0].count).toBe(1);
    await expect(repository.executeMutation(action.mutation, { values })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_DASHBOARD_REQUEST_EXISTS' });
    database.close();
  });

  test('rejects inactive types, invalid dates/duration, and overlapping employee requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_dashboard_request_modal_guards', ['schema', 'data']);
    const action = yaml('api/time-off-dashboard.yaml').actions.find((candidate: any) => candidate.id === 'dashboard_new_request');
    const values = { holiday_status_id: 'leave-type-annual', date_from: '2026-09-21', date_to: '2026-09-21', days: 1, reason: 'Guard test' };
    await expect(repository.executeMutation(action.mutation, { values: { ...values, holiday_status_id: 'leave-type-archived' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_DASHBOARD_REQUEST_TYPE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, date_from: '2026-10-02', date_to: '2026-10-01' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_DASHBOARD_REQUEST_VALUES_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, date_from: '2026-10-02', days: 0 } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_DASHBOARD_REQUEST_VALUES_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, date_from: '2026-02-03', date_to: '2026-02-03' } })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_DASHBOARD_REQUEST_OVERLAP' });
    database.close();
  });
});
