import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees birthday grouping parity', () => {
  test('maps Odoo group_birthday to separate Employees page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const component = page.components[0];
    const list = api.datasources.find((entry: any) => entry.id === 'employees');

    expect(source).toContain('<filter name="group_birthday"');
    expect(source).toContain("'group_by': 'birthday'");
    expect(page.page.id).toBe(api.page.id);
    expect(component.group_by).toContainEqual({ field: 'birthday', label: 'Birthday' });
    expect(component.columns).toContainEqual({ field: 'birthday', label: 'Birthday', type: 'date', optional: 'hide' });
    expect(list.pivot.fields).toContain('birthday');
    expect(list.query).toContain('CAST(e.birthday AS VARCHAR) AS birthday');
  });

  test('returns birthday values in the current-company Employees projection', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_birthday_group_projection');
    const source = yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');
    const params = {
      q: null, active: null, state: null, department_name: null, coach_name: null,
      my_team: null, my_department: null, newly_hired: null, in_contract: null,
      out_of_contract: null, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };

    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data.map((row: any) => [row.id, row.birthday])).toEqual([
      ['employee-demo-001', '1990-05-20'],
      ['employee-demo-002', '1992-09-18'],
      ['employee-demo-003', '1995-11-03'],
    ]);
    const foreign = await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50);
    expect(foreign.data).toEqual([]);
    await database.close();
  });
});
