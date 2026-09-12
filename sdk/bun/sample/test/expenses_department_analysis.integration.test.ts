import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Expenses department analysis action parity', () => {
  test('keeps the department action presentation separate from its page-ID API', () => {
    const page = yaml('pages/department-analysis.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'expenses-department-analysis', route: '/expenses/department-analysis' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('expenses-department-analysis')).toContain('expense_department_analysis');
    expect(yaml('api/department-analysis.yaml').actions[0]).toMatchObject({ permission: 'expenses.read', navigate_to: '/expenses/detail' });
  });

  test('defaults to the active Sales department and keeps the source read-only', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'expenses_department_analysis_migrations', ['schema', 'data']);
    const api = yaml('api/department-analysis.yaml');
    const source = api.datasources.find((item: any) => item.id === 'expense_department_analysis');
    const departments = api.datasources.find((item: any) => item.id === 'expense_department_analysis_departments');
    expect((await repository.querySource(source, { department_name: null, q: null }, 0, 25)).data.map((row: any) => row.department_name)).toEqual(['Sales', 'Sales', 'Sales']);
    expect((await repository.querySource(source, { department_name: 'Engineering', q: null }, 0, 25)).data.map((row: any) => row.department_name)).toEqual(['Engineering', 'Engineering', 'Engineering', 'Engineering']);
    expect((await repository.querySource(source, { department_name: 'Sales', q: 'missing' }, 0, 25)).data).toEqual([]);
    expect((await repository.querySource(departments, {}, 0, 25)).data.map((row: any) => row.value)).toEqual(['Engineering', 'Operations', 'Sales']);
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 25)).rejects.toMatchObject({ status: 503, code: 'EXPENSE_DEPARTMENT_ANALYSIS_UNAVAILABLE' });
    expect(api.actions).toHaveLength(1);
    expect(api.actions.some((action: any) => action.mutation)).toBe(false);
  });
});
