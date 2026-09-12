import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting Customer Payments action parity', () => {
  test('keeps the Odoo customer action contract and page/API boundaries', () => {
    const page = yaml('pages/customer-payments.yaml');
    const list = page.components[0];
    expect(yaml('manifest.yaml').menu.groups[0].items).toContainEqual({ path: '/accounting/customer-payments', label: 'Payments', icon: 'bank', permission: 'accounting.read' });
    expect(page.page).toMatchObject({ id: 'accounting-customer-payments', route: '/accounting/customer-payments', breadcrumb: ['Invoicing', 'Customers', 'Payments'] });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'graph', 'activity']);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Date', 'Number', 'Journal', 'Payment Method', 'Customer', 'Amount in Currency', 'Amount', 'State']);
    expect(yaml('api/customer-payments.yaml').page).toEqual({ id: page.page.id });
    expect(yaml('api/customer-payment-detail.yaml').page).toEqual({ id: 'accounting-customer-payment-detail' });
    expect(yaml('api/customer-payments.yaml').datasources[1].query).toContain("payment_type = 'Inbound'");
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('accounting-customer-payments')).toContain('accounting_customer_payments');
  });

  test('seeds customer-only payments and supports search, empty, detail, and write guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'accounting_customer_payment_test', ['schema', 'data']);
    const source = yaml('api/customer-payments.yaml').datasources[1];
    expect((await repository.querySource(source, { q: null, state: null, fixture_state: null }, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(source, { q: 'Azure', state: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ payment_type: 'Inbound', amount: 875.5 });
    expect((await repository.querySource(source, { q: null, state: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const create = yaml('api/customer-payments.yaml').actions[1];
    expect(create.permission).toBe('accounting.write');
    expect(create.mutation.guards[0].message).toBe('Payment amount must be positive');
    database.close();
  });
});
