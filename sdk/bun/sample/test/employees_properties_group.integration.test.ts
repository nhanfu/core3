import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees Properties group-by parity', () => {
  test('maps Odoo Properties group-by to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const datasource = api.datasources.find((entry: any) => entry.id === 'employees');

    expect(source).toContain('<filter string="Properties" name="group_by_employee_properties"');
    expect(source).toContain("context=\"{'group_by': 'employee_properties'}\"");
    expect(page.page.id).toBe('employees');
    expect(api.page.id).toBe(page.page.id);
    expect(list.group_by).toContainEqual({ field: 'employee_properties', label: 'Properties' });
    expect(datasource.permission).toBe('employees.read');
    expect(datasource.pivot.fields).toContain('employee_properties');
    expect(datasource.query).toContain("COALESCE(NULLIF(e.employee_properties, ''), '{}') AS employee_properties");
    expect(datasource.query).toContain("COALESCE(:current_company_name, '') = '' OR e.company_name = :current_company_name");
  });

  test('projects durable Properties values only for the current company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_properties_group_projection');
    const datasource = yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');
    const params = {
      q: null, active: null, state: null, department_name: null, coach_name: null,
      my_team: null, my_department: null, newly_hired: null, in_contract: null,
      out_of_contract: null, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };

    const rows = await repository.querySource(datasource, params, 0, 50);
    expect(rows.data.map((row: any) => [row.id, row.employee_properties])).toEqual([
      ['employee-demo-001', '{"office":"Hanoi","equipment":"Laptop"}'],
      ['employee-demo-002', '{"office":"Da Nang","equipment":"Laptop"}'],
      ['employee-demo-003', '{"office":"Ho Chi Minh City","equipment":"Monitor"}'],
    ]);
    const foreign = await repository.querySource(datasource, { ...params, current_company_name: 'Other Company' }, 0, 50);
    expect(foreign.data).toEqual([]);
    await database.close();
  });
});
