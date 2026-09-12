import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Expenses Analysis Odoo action parity', () => {
  test('keeps analysis presentation separate from its page-ID API', () => {
    const page = yaml('pages/analysis.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'expense-analysis', route: '/expenses/analysis' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'expense_analysis', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('expense-analysis')).toContain('expense_analysis');
  });

  test('matches the Odoo active-state context and deterministic analysis rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_analysis_schema', ['schema', 'data']);
    const source = yaml('api/analysis.yaml').datasources.find((candidate: any) => candidate.id === 'expense_analysis');
    const result = await repository.querySource(source, { q: null, state: null, employee_name: null, company_name: null }, 0, 25);
    expect(result.data.length).toBeGreaterThanOrEqual(7);
    expect(result.data.map((row: any) => row.state)).not.toContain('Refused');
    expect(result.data).toContainEqual(expect.objectContaining({ name: 'Breakfast with project team', employee_name: 'Admin User', total_amount_display: '$24.50' }));
    const employee = await repository.querySource(source, { q: null, state: null, employee_name: 'Admin User', company_name: null }, 0, 25);
    expect(employee.data.every((row: any) => row.employee_name === 'Admin User')).toBe(true);
    const empty = await repository.querySource(source, { q: 'does-not-exist', state: null, employee_name: null, company_name: null }, 0, 25);
    expect(empty.data).toEqual([]);
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 25)).rejects.toMatchObject({ status: 503, code: 'EXPENSE_ANALYSIS_UNAVAILABLE' });
  });

  test('preserves the employee/manager read boundary and detail navigation', () => {
    const source = yaml('api/analysis.yaml').datasources.find((candidate: any) => candidate.id === 'expense_analysis');
    const page = yaml('pages/analysis.yaml');
    expect(source.permission).toBe('expenses.read');
    expect(page.page.auth.require).toEqual(['expenses.read']);
    expect(yaml('api/analysis.yaml').actions[0]).toMatchObject({ id: 'view_expense_detail', permission: 'expenses.read', navigate_to: '/expenses/detail' });
    expect(page.components[0].columns.find((column: any) => column.field === 'state')).toMatchObject({ type: 'StatusChip' });
  });
});
