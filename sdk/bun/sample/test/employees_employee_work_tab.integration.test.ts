import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees Odoo Work tab parity', () => {
  test('keeps the Work tab page-only and maps the Odoo field order', () => {
    const page = yaml('pages/employee-detail.yaml');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(work.groups.map((group: any) => group.title)).toEqual(['Organization', 'Departure', 'Note', 'Organization chart']);
    expect(work.groups[0].fields.map((field: any) => field.label)).toEqual(['Company', 'Department', 'Job Position', 'Job Title', 'Manager', 'Address', 'Work Location']);
    expect(work.groups[1].show_if).toBe("state.employee_detail.active === false");
    expect(work.groups[2].permission).toBe('employees.write');
  });

  test('projects deterministic active and departed Work tab state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_work_tab_schema_migrations', ['schema', 'data']);

    const source = yaml('api/employee-detail.yaml').datasources[0];
    const active = await repository.querySource(source, { id: 'employee-demo-001' }, 0, 1);
    expect(active.data).toMatchObject({ id: 'employee-demo-001', company_name: 'Core3 Vietnam', job_position_name: 'Operations Lead', address_name: 'Core3 Vietnam HQ, District 1', departure_reason_name: null, org_direct_reports: 2 });

    const departed = await repository.querySource(source, { id: 'employee-demo-004' }, 0, 1);
    expect(departed.data).toMatchObject({ id: 'employee-demo-004', active: false, departure_reason_name: 'Resigned', departure_date: '2024-12-20', departure_description: 'Moved to a new opportunity.' });
  });

  test('keeps Work tab reads and writes behind the existing employee boundary', () => {
    const api = yaml('api/employee-detail.yaml');
    expect(api.page.id).toBe('employee-detail');
    expect(api.datasources[0].permission).toBe('employees.read');
    const edit = api.actions.find((action: any) => action.id === 'edit_employee');
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining(['job_position_name', 'address_name', 'departure_reason_name', 'departure_description', 'departure_date', 'additional_note']));
    expect(readFileSync(join(root, 'migrations/20260912123000-022-employee-work-tab.yaml'), 'utf8')).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|gen_random_uuid/i);
  });
});
