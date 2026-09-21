import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees organization chart parity', () => {
  test('maps Odoo parent_id and child_ids to separate page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const chart = work.components.find((component: any) => component.source === 'employee_org_chart');
    const source = api.datasources.find((entry: any) => entry.id === 'employee_org_chart');
    const action = api.actions.find((entry: any) => entry.id === 'view_employee_org_report');

    expect(model).toContain("parent_id = fields.Many2one('hr.employee', 'Manager'");
    expect(model).toContain("child_ids = fields.One2many('hr.employee', 'parent_id'");
    expect(views).toContain('id="o_employee_org_chart"');
    expect(page.page.id).toBe(api.page.id);
    expect(chart.source).toBe('employee_org_chart');
    expect(chart.children.map((field: any) => field.label)).toEqual(['Employee', 'Job Position', 'Department', 'Work Email']);
    expect(source.permission).toBe('employees.read');
    expect(source.query).toContain('child.manager_id = target.id');
    expect(action).toMatchObject({ type: 'navigate', permission: 'employees.read', navigate_to: '/employees/detail' });
  });

  test('projects active same-company direct reports and deterministic empty states', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_org_chart_crud');
    const source = yaml('api/employee-detail.yaml').datasources.find((entry: any) => entry.id === 'employee_org_chart');

    const chart = await repository.querySource(source, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam', fixture_state: null }, 0, 20);
    expect(chart.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'employee-demo-002', name: 'Nguyen Minh Anh', active: true }),
      expect.objectContaining({ id: 'employee-demo-003', name: 'Tran Bao Long', active: true }),
    ]));
    expect(chart.data).toHaveLength(2);

    const empty = await repository.querySource(source, { id: 'employee-demo-002', current_company_name: 'Core3 Vietnam', fixture_state: null }, 0, 20);
    expect(empty.data).toEqual([]);
    const foreign = await repository.querySource(source, { id: 'employee-demo-001', current_company_name: 'Other Company', fixture_state: null }, 0, 20);
    expect(foreign.data).toEqual([]);
    const fixtureEmpty = await repository.querySource(source, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam', fixture_state: 'empty' }, 0, 20);
    expect(fixtureEmpty.data).toEqual([]);
    await database.close();
  });

  test('replays the lookup migration and preserves the chart after restart', { timeout: 15000 }, async () => {
    const databasePath = `/tmp/core3-employees-org-chart-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    await migrate(new YamlRepository(first), 'employees_org_chart_restart');
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(second);
    await migrate(repository, 'employees_org_chart_restart');
    const source = yaml('api/employee-detail.yaml').datasources.find((entry: any) => entry.id === 'employee_org_chart');
    expect(await repository.querySource(source, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam', fixture_state: null }, 0, 20)).toMatchObject({ meta: { total: 2 } });
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
