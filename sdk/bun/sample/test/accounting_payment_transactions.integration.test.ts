import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting Payment Transactions Odoo action parity', () => {
  test('keeps the source-confirmed view modes and read-only form joined by page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/payment-transactions.yaml');
    const listApi = yaml('api/payment-transactions.yaml');
    const detailPage = yaml('pages/payment-transaction-detail.yaml');
    const detailApi = yaml('api/payment-transaction-detail.yaml');
    const list = listPage.components[0];
    const form = detailPage.components[0];

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(listPage.page.auth.require).toEqual(['accounting.read']);
    expect(list.source).toBe('accounting_payment_transactions');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'graph', 'pivot']);
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Reference', 'Created on', 'Payment Method', 'Provider', 'Customer', 'Partner Name', 'Amount', 'Status', 'Company',
    ]);
    expect(list.row_open_action).toBe('view_accounting_payment_transaction');
    expect(listApi.page.id).toBe('payment-transactions');
    expect(detailApi.page.id).toBe('payment-transaction-detail');
    expect(form).toMatchObject({
      type: 'OdooFormView',
      source: 'accounting_payment_transaction_detail',
      title_field: 'reference',
      status_field: 'state',
      editable: false,
    });
    expect(form.statusbar.map((state: any) => state.value)).toEqual(['draft', 'pending', 'authorized', 'done', 'cancel', 'error']);
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual([
      'Reference', 'Payment', 'Payment State', 'Source Transaction', 'Amount', 'Payment Method', 'Provider', 'Company', 'Provider Reference', 'Payment Token',
      'Created on', 'Last State Change Date', 'Production Environment', 'Customer', 'Address', 'City', 'State', 'ZIP', 'Country',
      'Email', 'Phone', 'Language',
    ]);
    expect(discovered.pageDatasources.get('payment-transactions')).toContain('accounting_payment_transactions');
    expect(discovered.pageDatasources.get('payment-transaction-detail')).toContain('accounting_payment_transaction_detail');
  });

  test('returns deterministic rows, search, empty, missing, forbidden, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'accounting_payment_transactions_parity_schema_migrations', ['schema', 'data']);
    const list = yaml('api/payment-transactions.yaml').datasources[0];
    const detail = yaml('api/payment-transaction-detail.yaml').datasources[0];
    const params = { q: null, fixture_state: null };

    expect((await repository.querySource(list, params, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'payment-tx-confirmed-001', 'payment-tx-authorized-002', 'payment-tx-pending-003', 'payment-tx-canceled-004',
      'payment-tx-error-005', 'payment-tx-draft-006',
    ]);
    expect((await repository.querySource(list, { ...params, q: 'Azure' }, 0, 50)).data.map((row: any) => row.reference)).toEqual(['TX-DEMO-2026-0001']);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detail, { id: 'payment-tx-confirmed-001', fixture_state: null }, 0, 1)).toMatchObject({
      data: { reference: 'TX-DEMO-2026-0001', state: 'done', state_label: 'Confirmed', partner: 'Azure Interior', amount: 1250, payment_reference: 'BNK1/2026/0001', payment_state: 'paid', payment_state_label: 'Paid', payment_date: '2026-09-01' },
    });
    expect(await repository.querySource(detail, { id: 'payment-tx-authorized-002', fixture_state: null }, 0, 1)).toMatchObject({
      data: { reference: 'TX-DEMO-2026-0002', payment_reference: null, payment_state: null, payment_state_label: null, payment_date: null },
    });
    expect((await repository.querySource(detail, { id: 'missing-payment-transaction', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(list, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'ACCOUNTING_PAYMENT_TRANSACTIONS_FORBIDDEN' });
    await expect(repository.querySource(detail, { id: 'payment-tx-confirmed-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_PAYMENT_TRANSACTION_DETAIL_UNAVAILABLE' });
  });

  test('keeps linked payment read-only and payment-provider workflows explicitly out of the bounded action', () => {
    const list = yaml('pages/payment-transactions.yaml').components[0];
    const actions = yaml('api/payment-transactions.yaml').actions;
    expect(actions).toEqual([{ id: 'view_accounting_payment_transaction', type: 'navigate', permission: 'accounting.read', navigate_to: '/accounting/payment-transaction-detail', params: { id: '{row.id}' } }]);
    expect(list.create).toBeUndefined();
    expect(yaml('pages/payment-transaction-detail.yaml').components[0].editable).toBe(false);
    expect(yaml('api/payment-transactions.yaml').datasources[0].permission).toBe('accounting.read');
    expect(yaml('api/payment-transaction-detail.yaml').datasources[0].permission).toBe('accounting.read');
    expect(yaml('pages/payment-transaction-detail.yaml').components[0].groups[0].fields.slice(0, 3)).toEqual([
      { field: 'reference', label: 'Reference' },
      { field: 'payment_reference', label: 'Payment' },
      { field: 'payment_state_label', label: 'Payment State' },
    ]);
  });
});
