import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting all payments dashboard action parity', () => {
  test('keeps the source action and page/API ownership contract', () => {
    const page = yaml('pages/all-payments.yaml');
    const api = yaml('api/all-payments.yaml');
    const list = page.components[0];
    expect(page.page.route).toBe('/accounting/all-payments');
    expect(api.page.id).toBe(page.page.id);
    expect(list.source).toBe('accounting_all_payments');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'graph', 'activity']);
    expect(api.datasources.find((source: any) => source.id === 'accounting_all_payments').query).toContain('unmatched = TRUE');
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'view_accounting_all_payment', navigate_to: '/accounting/payment-detail' }));
  });

  test('seeds deterministic unmatched posted payments and guarded creation', () => {
    const migration = yaml('migrations/20260912060000-041-accounting-all-payments.yaml');
    const action = yaml('api/all-payments.yaml').actions.find((item: any) => item.id === 'create_accounting_all_payment');
    expect(migration.kind).toBe('data');
    expect(migration.type.postgres.up).toContain("'2026-01-15'");
    expect(migration.type.postgres.up.match(/accounting-all-payment-00[1-3]/g)).toHaveLength(6);
    expect(action.permission).toBe('accounting.write');
    expect(action.mutation.guards[0].status).toBe(422);
    expect(action.mutation.guards[0].query).toContain('> 0');
  });

  test('declares forbidden and transport-error responses before protected query execution', () => {
    const source = yaml('api/all-payments.yaml').datasources.find((item: any) => item.id === 'accounting_all_payments');
    expect(source.permission).toBe('accounting.read');
    expect(source.error_states).toEqual(expect.objectContaining({
      forbidden: expect.objectContaining({ status: 403 }),
      transport_error: expect.objectContaining({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' }),
    }));
  });
});
