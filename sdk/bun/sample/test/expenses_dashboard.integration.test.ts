import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Expenses My Expenses dashboard parity', () => {
  test('binds the Odoo dashboard cards to the Expenses page API', () => {
    const page = yaml('pages/expenses.yaml');
    const api = yaml('api/expenses.yaml');
    const stats = page.components.find((component: any) => component.type === 'StatRow');
    const source = api.datasources.find((candidate: any) => candidate.id === 'expense_dashboard');

    expect(page.datasources).toBeUndefined();
    expect(stats).toMatchObject({ type: 'StatRow', source: 'expense_dashboard' });
    expect(stats.stats.map((stat: any) => stat.label)).toEqual(['To Submit', 'Waiting Approval', 'Waiting Reimbursement']);
    expect(source).toMatchObject({ single: true, permission: 'expenses.read' });
    expect(api.page.id).toBe(page.page.id);
    expect(source.query).toContain("e.state = 'Submitted'");
  });

  test('computes deterministic company-scoped dashboard totals using Odoo state rules', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'expenses_dashboard_test', ['schema', 'data']);
    const source = yaml('api/expenses.yaml').datasources.find((candidate: any) => candidate.id === 'expense_dashboard');

    const result = await repository.querySource(source, { current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1);
    expect(result.data).toEqual({ to_submit: '$84.50', waiting_approval: '$245.00', waiting_reimbursement: '$0.00' });

    const otherCompany = await repository.querySource(source, { current_company_name: 'Other Corporation', fixture_state: null }, 0, 1);
    expect(otherCompany.data).toEqual({ to_submit: '$0.00', waiting_approval: '$0.00', waiting_reimbursement: '$0.00' });
    expect(await repository.querySource(source, { current_company_name: 'Core3 Demo Company', fixture_state: 'empty' }, 0, 1)).toEqual(expect.objectContaining({
      data: { to_submit: '$0.00', waiting_approval: '$0.00', waiting_reimbursement: '$0.00' },
    }));
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSE_DASHBOARD_UNAVAILABLE' });
    await database.close();
  });
});
