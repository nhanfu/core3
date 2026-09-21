import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off accrual plan employees stat action', () => {
  test('matches Odoo action_open_accrual_plan_employees and keeps the page/API seam explicit', () => {
    const page = yaml('pages/accrual-plan-detail.yaml');
    const api = yaml('api/accrual-plan-detail.yaml');
    const employeePage = yaml('pages/accrual-plan-employees.yaml');
    const employeeApi = yaml('api/accrual-plan-employees.yaml');
    const stat = page.components[0].stat_buttons.find((entry: any) => entry.id === 'open_accrual_plan_employees');
    const action = api.actions.find((entry: any) => entry.id === 'open_accrual_plan_employees');

    expect(stat).toMatchObject({ id: 'open_accrual_plan_employees', label: 'Employees', value_field: 'employee_count', permission: 'time_off.manage', show_if: 'record.employee_count > 0' });
    expect(action).toMatchObject({ type: 'navigate', permission: 'time_off.manage', navigate_to: '/accrual-plans/detail/employees', params: { id: '{state.id}' } });
    expect(employeePage.page).toMatchObject({ id: 'accrual-plan-employees', route: '/accrual-plans/detail/employees', auth: { require: ['time_off.manage'] } });
    expect(employeePage.components[0]).toMatchObject({ type: 'ListView', source: 'accrual_plan_employees' });
    expect(employeePage.components[0]).not.toHaveProperty('row_open_action');
    expect(employeePage.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Cards']);
    expect(employeeApi.page).toEqual({ id: 'accrual-plan-employees' });
    expect(employeeApi.page.id).toBe(employeePage.page.id);
    expect(employeeApi.datasources[0]).toMatchObject({ id: 'accrual_plan_employees', permission: 'time_off.manage' });
    expect(employeeApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'TIME_OFF_ACCRUAL_EMPLOYEES_UNAVAILABLE' });
  });

  test('seeds plan employee relations idempotently and reads the filtered employees after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-accrual-employees-'));
    const databasePath = join(directory, 'time-off.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_accrual_plan_employees_restart', ['schema', 'data']);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_accrual_plan_employees_restart', ['schema', 'data']);
      const source = yaml('api/accrual-plan-employees.yaml').datasources[0];
      const populated = await firstRepository.querySource(source, { id: 'accrual-plan-demo-001', q: null, fixture_state: null }, 0, 50);
      expect(populated.data).toEqual([
        expect.objectContaining({ employee_id: 'employee-demo-001', employee_name: 'Admin User', department_name: 'Management', leave_type_name: 'Annual Leave', allocation_days: 20, state: 'Approved' }),
        expect.objectContaining({ employee_id: 'employee-demo-002', employee_name: 'Marc Demo', department_name: 'Product', leave_type_name: 'Annual Leave', allocation_days: 15, state: 'Approved' }),
      ]);
      expect((await firstRepository.query("SELECT COUNT(*) AS count FROM leave_allocations WHERE accrual_plan_id = 'accrual-plan-demo-001'")).at(0)?.count).toBe(2);
      expect((await firstRepository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'leave_allocations_accrual_plan_employee_idx'")).length).toBe(1);
      expect((await firstRepository.query("SELECT version FROM time_off_accrual_plan_employees_restart WHERE version = '0.0.22'")).length).toBe(1);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'time_off_accrual_plan_employees_restart', ['schema', 'data']);
      expect((await reopenedRepository.querySource(source, { id: 'accrual-plan-demo-001', q: null, fixture_state: null }, 0, 50)).data).toHaveLength(2);
      expect((await reopenedRepository.querySource(source, { id: 'accrual-plan-demo-001', q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
      expect((await reopenedRepository.querySource(source, { id: 'accrual-plan-demo-001', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
      await expect(reopenedRepository.querySource(source, { id: 'accrual-plan-demo-001', q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'TIME_OFF_ACCRUAL_EMPLOYEES_UNAVAILABLE' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
