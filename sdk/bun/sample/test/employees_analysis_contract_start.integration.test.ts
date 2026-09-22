import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const source = () => yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
}

const defaults = {
  q: null,
  active: null,
  state: null,
  department_name: null,
  coach_name: null,
  my_team: null,
  my_department: null,
  newly_hired: null,
  in_contract: null,
  out_of_contract: null,
  current_company_name: 'Core3 Vietnam',
  current_user_id: 'user-admin',
};

describe('Employees contract-start analysis parity', () => {
  test('maps the Odoo Employees graph and pivot to the page/API pair', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const component = page.components[0];
    const list = api.datasources.find((entry: any) => entry.id === 'employees');
    const graph = component.views.find((view: any) => view.id === 'graph');
    const pivot = component.views.find((view: any) => view.id === 'pivot');

    expect(sourceView).toContain('<record id="hr_employee_view_graph"');
    expect(sourceView).toContain('<field name="contract_date_start" interval="month"/>');
    expect(sourceView).toContain('<field name="contract_date_start" interval="year" type="col"/>');
    expect(sourceView).toContain('<field name="job_id" type="row"/>');
    expect(page.page.id).toBe(api.page.id);
    expect(graph).toMatchObject({ label: 'Graph', category_field: 'contract_start', measure_field: 'employee_count', measure_label: 'Employees' });
    expect(pivot.pivot.default).toEqual({
      rows: ['job_title'],
      columns: ['contract_start'],
      measures: [{ field: 'employee_count', aggregate: 'sum', column: 'Employees' }],
    });
    expect(list.pivot.fields).toContain('contract_start');
    expect(list.pivot.fields).toContain('employee_count');
    expect(list.query).toContain('CAST(1 AS INTEGER) AS employee_count');
  });

  test('returns persisted contract starts and one employee count per scoped employee', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_analysis_contract_start');

    const rows = await repository.querySource(source(), defaults, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['employee-demo-001', 'employee-demo-002', 'employee-demo-003']);
    expect(rows.data.every((row: any) => row.employee_count === 1)).toBe(true);
    expect(rows.data.every((row: any) => row.contract_start)).toBe(true);
    expect(rows.data.map((row: any) => [row.id, row.contract_start])).toEqual([
      ['employee-demo-001', '2025-01-15'],
      ['employee-demo-002', '2025-06-10'],
      ['employee-demo-003', '2026-01-05'],
    ]);

    const foreign = await repository.querySource(source(), { ...defaults, current_company_name: 'Other Company' }, 0, 50);
    expect(foreign.data).toEqual([]);
    await database.close();
  });

  test('replays the analysis index and preserves the projection after file-backed restart', { timeout: 15000 }, async () => {
    const databasePath = `/tmp/core3-employees-analysis-contract-start-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    await migrate(new YamlRepository(first), 'employees_analysis_contract_start_restart');
    const firstRepository = new YamlRepository(first);
    expect(await firstRepository.query("SELECT COUNT(*) AS count FROM duckdb_indexes() WHERE index_name = 'employees_contract_start_analysis_idx'")).toEqual([{ count: 1 }]);
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(second);
    await migrate(repository, 'employees_analysis_contract_start_restart');
    const rows = await repository.querySource(source(), defaults, 0, 50);
    expect(rows.data.map((row: any) => row.contract_start)).toEqual(['2025-01-15', '2025-06-10', '2026-01-05']);
    expect(await repository.query("SELECT contract_start FROM employees WHERE id = 'employee-demo-003'")).toEqual([{ contract_start: '2026-01-05T00:00:00.000Z' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
