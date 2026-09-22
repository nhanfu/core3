import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off personal dashboard calendar action', () => {
  test('maps Odoo action_my_days_off_dashboard_calendar to a page/API route alias', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_leave_report_calendar.xml', 'utf8');
    const page = yaml('pages/time-off-dashboard-calendar.yaml');
    const api = yaml('api/time-off-dashboard-calendar.yaml');
    const dashboard = yaml('pages/time-off-dashboard.yaml');
    const dashboardApi = yaml('api/time-off-dashboard.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');

    expect(source).toContain('<record id="action_my_days_off_dashboard_calendar" model="ir.actions.act_window">');
    expect(source).toContain('<field name="view_id" ref="hr_leave_report_calendar_year_view"/>');
    expect(page.page).toMatchObject({ id: 'time-off-dashboard-calendar', route: '/time-off/dashboard-calendar' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(page.datasources).toBeUndefined();
    expect(list).toMatchObject({ source: 'time_off_dashboard_calendar_requests', row_open_action: 'open_dashboard_calendar_request' });
    expect(list.views).toEqual([expect.objectContaining({ id: 'calendar', mode: 'year', date_field: 'date_from', end_date_field: 'date_to' })]);
    expect(list.empty_state).toMatchObject({ title: 'You have no time off yet!' });
    expect(api.datasources[0]).toMatchObject({ id: 'time_off_dashboard_calendar_requests', permission: 'time_off.read' });
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'TIME_OFF_DASHBOARD_CALENDAR_UNAVAILABLE' });
    expect(api.actions.find((action: any) => action.id === 'open_dashboard_calendar_request')).toMatchObject({
      type: 'navigate', permission: 'time_off.read', navigate_to: '/time-off/leave-request-detail', params: { id: '{row.id}' },
    });
    expect(dashboard.toolbar).toContainEqual(expect.objectContaining({ id: 'dashboard_open_calendar', action: 'dashboard_open_calendar' }));
    expect(dashboardApi.actions.find((action: any) => action.id === 'dashboard_open_calendar')).toMatchObject({
      type: 'navigate', permission: 'time_off.read', navigate_to: '/time-off/dashboard-calendar',
    });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('time-off-dashboard-calendar')).toEqual(['time_off_dashboard_calendar_requests']);
  });

  test('reads only the personal fixed-year calendar records and preserves them across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-dashboard-calendar-'));
    const databasePath = join(directory, 'time-off.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_dashboard_calendar_restart', ['schema', 'data']);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_dashboard_calendar_restart', ['schema', 'data']);
      const source = yaml('api/time-off-dashboard-calendar.yaml').datasources[0];
      expect((await firstRepository.querySource(source, { year: 2026, q: null, fixture_state: null }, 0, 50)).data).toEqual([
        expect.objectContaining({ id: 'leave-request-demo-001', employee_name: 'Admin User', state: 'Approved' }),
        expect.objectContaining({ id: 'leave-request-demo-002', employee_name: 'Admin User', state: 'Submitted' }),
        expect.objectContaining({ id: 'leave-request-demo-006', employee_name: 'Admin User', state: 'Cancelled' }),
      ]);
      expect((await firstRepository.querySource(source, { year: 2026, q: 'Marc', fixture_state: null }, 0, 50)).data).toEqual([]);
      expect((await firstRepository.querySource(source, { year: 2027, q: null, fixture_state: null }, 0, 50)).data).toEqual([]);
      expect((await firstRepository.querySource(source, { year: 2026, q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
      await expect(firstRepository.querySource(source, { year: 2026, q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'TIME_OFF_DASHBOARD_CALENDAR_UNAVAILABLE' });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'time_off_dashboard_calendar_restart', ['schema', 'data']);
      expect((await reopenedRepository.querySource(source, { year: 2026, q: null, fixture_state: null }, 0, 50)).data).toHaveLength(3);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
