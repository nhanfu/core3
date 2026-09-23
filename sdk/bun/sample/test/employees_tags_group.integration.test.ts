import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const source = () => yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

const defaults = {
  q: null,
  active: 'true',
  state: null,
  department_name: null,
  coach_name: null,
  my_activities: null,
  activities_overdue: null,
  activities_today: null,
  activities_upcoming_all: null,
  my_team: null,
  my_department: null,
  newly_hired: null,
  in_contract: null,
  out_of_contract: null,
  current_company_name: 'Core3 Vietnam',
  current_user_id: 'user-admin',
};

describe('Employees tags group-by parity', () => {
  test('maps Odoo group_category_ids to the Employees page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const datasource = api.datasources.find((entry: any) => entry.id === 'employees');

    expect(sourceView).toContain('<filter name="group_category_ids" string="Tags"');
    expect(sourceView).toContain("context=\"{'group_by': 'category_ids'}\"");
    expect(page.page.id).toBe(api.page.id);
    expect(list.group_by).toContainEqual({ field: 'employee_tags', label: 'Tags' });
    expect(list.columns).toContainEqual({ field: 'employee_tags', label: 'Tags', optional: 'hide' });
    expect(datasource.pivot.fields).toContain('employee_tags');
    expect(datasource.query).toContain('STRING_AGG(t.name, ', ' ORDER BY t.name)');
    expect(datasource.query).toContain('employee_tag_rel');
    expect(datasource.query).toContain('qt.name ILIKE');
  });

  test('projects durable tags for grouping and tag search within the current company', { timeout: 30000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_tags_group_projection');

    const rows = await repository.querySource(source(), defaults, 0, 50);
    expect(rows.data.map((row: any) => [row.id, row.employee_tags])).toEqual([
      ['employee-demo-001', 'Engineering, Vietnam'],
      ['employee-demo-002', 'Engineering'],
      ['employee-demo-003', 'Onboarding'],
    ]);

    const search = await repository.querySource(source(), { ...defaults, q: 'Vietnam' }, 0, 50);
    expect(search.data.map((row: any) => row.id)).toEqual(['employee-demo-001']);
    const foreign = await repository.querySource(source(), { ...defaults, current_company_name: 'Other Company' }, 0, 50);
    expect(foreign.data).toEqual([]);
    await database.close();
  });

  test('preserves tag grouping values through migration replay and file-backed restart', { timeout: 30000 }, async () => {
    const databasePath = `/tmp/core3-employees-tags-group-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_tags_group_restart');
    await migrate(firstRepository, 'employees_tags_group_restart');
    expect((await firstRepository.querySource(source(), defaults, 0, 50)).data[0]).toMatchObject({
      id: 'employee-demo-001',
      employee_tags: 'Engineering, Vietnam',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_tags_group_restart');
    expect((await secondRepository.querySource(source(), defaults, 0, 50)).data.map((row: any) => row.employee_tags)).toEqual([
      'Engineering, Vietnam', 'Engineering', 'Onboarding',
    ]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
