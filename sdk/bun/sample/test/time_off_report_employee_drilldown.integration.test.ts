import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off by Employee report row drilldown', () => {
  test('maps the Odoo report form mode to the existing Leave Request detail action', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_holidays/views/hr_leave_views.xml', 'utf8');
    const page = yaml('pages/report-by-employee.yaml');
    const api = yaml('api/report-by-employee.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'open_employee_report_request');

    expect(source).toContain('<field name="view_mode">list,graph,pivot,calendar,form</field>');
    expect(source).toContain('<field name="res_model">hr.leave</field>');
    expect(page.page).toMatchObject({ id: 'time-off-report-by-employee', route: '/time-off-reporting/by-employee' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(list).toMatchObject({
      source: 'time_off_employee_report',
      row_open_action: 'open_employee_report_request',
      row_double_click_action: 'open_employee_report_request',
    });
    expect(action).toMatchObject({
      type: 'navigate',
      permission: 'time_off.read',
      navigate_to: '/time-off/leave-request-detail',
      params: { id: '{row.id}' },
    });
  });

  test('keeps the drilldown bound to the durable request ID and read scope', () => {
    const page = yaml('pages/report-by-employee.yaml');
    const api = yaml('api/report-by-employee.yaml');
    const report = api.datasources.find((source: any) => source.id === 'time_off_employee_report');
    const action = api.actions.find((candidate: any) => candidate.id === 'open_employee_report_request');

    expect(report.query).toContain('SELECT r.id, r.employee_id');
    expect(report.permission).toBe('time_off.read');
    expect(action.permission).toBe('time_off.read');
    expect(action.params.id).toBe('{row.id}');
    expect(page.components.find((component: any) => component.type === 'ListView').row_key).toBe('id');
  });
});
