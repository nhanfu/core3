import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const context = { employee_id: 'employee-demo-002', current_company_name: 'Core3 Demo Company', fixture_state: null };

describe('Timesheets employee-context default parity', () => {
  test('maps Odoo employee action context to separate page/API source-prefilled create contracts', () => {
    const page = yaml('pages/employee-timesheets.yaml');
    const api = yaml('api/employee-timesheets.yaml');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_employee_timesheet_entry');
    const defaults = api.datasources.find((candidate: any) => candidate.id === 'employee_timesheet_entry_defaults');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'employee-timesheets', route: '/employee-timesheets' });
    expect(api.page).toEqual({ id: 'employee-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(create).toMatchObject({ type: 'server_form', permission: 'timesheets.write', prefill: 'source', prefill_source: 'employee_timesheet_entry_defaults', params: { context_employee_id: '{state.employee_id}' } });
    expect(defaults).toMatchObject({ id: 'employee_timesheet_entry_defaults', single: true, permission: 'timesheets.write' });
    expect(String(defaults.query)).toContain('company_name = COALESCE');
    expect(create.mutation.fields).toContain('company_name');
    expect(odoo).toContain('<record id="timesheet_action_from_employee" model="ir.actions.act_window">');
    expect(odoo).toContain("'default_employee_id': active_id");
    expect(odoo).toContain("('employee_id', '=', active_id)");
  });

  test('resolves the active employee in the current company and fails closed for empty or foreign context', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_employee_context_default', ['schema', 'data']);
      const api = yaml('api/employee-timesheets.yaml');
      const defaults = api.datasources.find((candidate: any) => candidate.id === 'employee_timesheet_entry_defaults');

      expect(await repository.querySource(defaults, context, 0, 1)).toMatchObject({ data: { employee_id: 'employee-demo-002', employee_name: 'Demo Employee', company_name: 'Core3 Demo Company' } });
      expect((await repository.querySource(defaults, { ...context, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(defaults, { ...context, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    } finally {
      database.close();
    }
  });

  test('creates a durable employee-context entry and rejects stale employee or company values', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_employee_context_mutation', ['schema', 'data']);
      const create = yaml('api/employee-timesheets.yaml').actions.find((candidate: any) => candidate.id === 'create_employee_timesheet_entry').mutation;
      const values = {
        name: 'TS/2026/EMPLOYEE-CONTEXT', employee_id: 'employee-demo-002', employee_name: 'Demo Employee',
        project_id: 'project-demo-001', project_name: 'Core3 Implementation', work_date: '2026-01-15',
        description: 'Employee context default', hours: 2, current_company_name: 'Core3 Demo Company', context_employee_id: 'employee-demo-002',
      };

      expect(await repository.executeMutation(create, { id: 'timesheet-employee-context', values })).toMatchObject({ id: 'timesheet-employee-context', employee_id: 'employee-demo-002', company_name: 'Core3 Demo Company', state: 'Draft' });
      await expect(repository.executeMutation(create, { id: 'timesheet-employee-context-foreign', values: { ...values, name: 'TS/2026/EMPLOYEE-CONTEXT-FOREIGN', employee_id: 'employee-demo-001', employee_name: 'Admin User' } })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEE_TIMESHEET_CONTEXT_SCOPE' });
      await expect(repository.executeMutation(create, { id: 'timesheet-employee-context-company', values: { ...values, name: 'TS/2026/EMPLOYEE-CONTEXT-COMPANY', current_company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEE_TIMESHEET_EMPLOYEE_SCOPE' });
    } finally {
      database.close();
    }
  });

  test('keeps employee defaults and created data after migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-employee-context-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const defaults = yaml('api/employee-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'employee_timesheet_entry_defaults');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_employee_context_restart', ['schema', 'data']);
      const before = await repository.querySource(defaults, context, 0, 1);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_employee_context_restart', ['schema', 'data']);
      expect(await reopened.querySource(defaults, context, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE company_name = 'Core3 Demo Company'" )).at(0)?.count).toBeGreaterThan(0);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
