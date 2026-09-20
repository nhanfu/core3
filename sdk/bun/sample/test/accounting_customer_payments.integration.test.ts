import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
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
    const detail = yaml('pages/customer-payment-detail.yaml');
    const created = yaml('pages/customer-payment-new.yaml');
    expect(yaml('manifest.yaml').menu.groups[0].items).toContainEqual({ path: '/accounting/customer-payments', label: 'Payments', icon: 'bank', permission: 'accounting.read' });
    expect(page.page).toMatchObject({ id: 'accounting-customer-payments', route: '/accounting/customer-payments', breadcrumb: ['Invoicing', 'Customers', 'Payments'] });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'graph', 'activity']);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Date', 'Number', 'Journal', 'Payment Method', 'Customer', 'Amount in Currency', 'Amount', 'State']);
    expect(yaml('api/customer-payments.yaml').page).toEqual({ id: page.page.id });
    expect(yaml('api/customer-payment-detail.yaml').page).toEqual({ id: detail.page.id });
    expect(yaml('api/customer-payment-new.yaml').page).toEqual({ id: created.page.id });
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'accounting_customer_payment_detail', editable: false, message_source: 'accounting_customer_payment_messages' });
    expect(created.components[0]).toMatchObject({ type: 'OdooFormView', source: 'accounting_customer_payment_new', editable: true, initial_editing: true });
    expect(yaml('api/customer-payments.yaml').actions.find((action: any) => action.id === 'create_accounting_customer_payment')).toMatchObject({ type: 'navigate', permission: 'accounting.write', navigate_to: '/accounting/customer-payments/new' });
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
    const detail = yaml('api/customer-payment-detail.yaml');
    const detailSource = detail.datasources.find((candidate: any) => candidate.id === 'accounting_customer_payment_detail');
    expect((await repository.querySource(detailSource, { id: 'accounting-customer-payment-003', fixture_state: null }, 0, 1)).data).toMatchObject({ payment_type: 'Inbound', customer_bank_account: 'US001-CUST-0003' });
    expect((await repository.querySource(detailSource, { id: 'accounting-vendor-payment-demo-001', fixture_state: null }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detailSource, { id: 'accounting-customer-payment-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_CUSTOMER_PAYMENT_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('persists create, edit, workflow, chatter, validation, stale, and customer-only boundaries', async () => {
    const databasePath = `/tmp/core3-accounting-customer-payment-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_customer_payment_form_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const detailApi = yaml('api/customer-payment-detail.yaml');
    const newApi = yaml('api/customer-payment-new.yaml');
    const action = (document: any, id: string) => document.actions.find((candidate: any) => candidate.id === id);
    for (const id of ['create_accounting_customer_payment']) expect(action(newApi, id).permission, id).toBe('accounting.write');
    for (const id of ['edit_accounting_customer_payment', 'confirm_accounting_customer_payment', 'mark_accounting_customer_payment_paid', 'cancel_accounting_customer_payment', 'send_accounting_customer_payment_message', 'log_accounting_customer_payment_note', 'schedule_accounting_customer_payment_activity']) {
      expect(action(detailApi, id).permission, id).toBe('accounting.write');
    }

    const create = action(newApi, 'create_accounting_customer_payment');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'BNK/QA/0001', partner_name: 'Azure Interior', payment_type: 'Inbound', amount: 125.5, payment_date: '2026-09-20', journal: 'Bank', payment_method: 'Manual Payment', currency: 'USD', reference: 'QA-001', customer_bank_account: 'US001-QA-0001' } }) as any;
    expect(created).toMatchObject({ payment_type: 'Inbound', state: 'Draft', amount: 125.5, customer_bank_account: 'US001-QA-0001', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { partner_name: 'Azure Interior', payment_type: 'Outbound', amount: 1, payment_date: '2026-09-20', journal: 'Bank', payment_method: 'Manual Payment' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_CUSTOMER_PAYMENT_TYPE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { partner_name: 'Azure Interior', payment_type: 'Inbound', amount: 0, payment_date: '2026-09-20', journal: 'Bank', payment_method: 'Manual Payment' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_CUSTOMER_PAYMENT_AMOUNT_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { partner_name: 'Azure Interior', payment_type: 'Inbound', amount: 1, payment_date: 'not-a-date', journal: 'Bank', payment_method: 'Manual Payment' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_CUSTOMER_PAYMENT_DATE_INVALID' });

    const update = action(detailApi, 'edit_accounting_customer_payment');
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { partner_name: 'Azure Interior', payment_type: 'Inbound', amount: 200, payment_date: '2026-09-20', journal: 'Cash', payment_method: 'Card', currency: 'USD', reference: 'QA-001-edited', customer_bank_account: 'US001-QA-0002' } }) as any;
    expect(edited).toMatchObject({ amount: 200, journal: 'Cash', row_version: 2, customer_bank_account: 'US001-QA-0002' });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { partner_name: 'Azure Interior', payment_type: 'Inbound', amount: 201, payment_date: '2026-09-20', journal: 'Cash', payment_method: 'Card' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_CUSTOMER_PAYMENT_STALE' });
    await expect(repository.executeMutation(update.mutation, { id: 'accounting-vendor-payment-demo-001', expected_row_version: 1, values: { partner_name: 'Lumber Inc', payment_type: 'Inbound', amount: 1, payment_date: '2026-09-20', journal: 'Bank', payment_method: 'Manual Payment' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_CUSTOMER_PAYMENT_NOT_FOUND' });

    const confirm = action(detailApi, 'confirm_accounting_customer_payment');
    const paid = action(detailApi, 'mark_accounting_customer_payment_paid');
    const inProcess = await repository.executeMutation(confirm.mutation, { id: created.id, expected_row_version: 2, values: { state: 'In Process' } }) as any;
    expect(inProcess).toMatchObject({ state: 'In Process', row_version: 3 });
    const settled = await repository.executeMutation(paid.mutation, { id: created.id, expected_row_version: 3, values: { state: 'Paid' } }) as any;
    expect(settled).toMatchObject({ state: 'Paid', row_version: 4 });
    await expect(repository.executeMutation(paid.mutation, { id: created.id, expected_row_version: 3, values: { state: 'Paid' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_CUSTOMER_PAYMENT_STALE' });

    const second = await repository.executeMutation(create.mutation, { values: { partner_name: 'Gemini Furniture', payment_type: 'Inbound', amount: 50, payment_date: '2026-09-20', journal: 'Bank', payment_method: 'Manual Payment' } }) as any;
    const cancel = action(detailApi, 'cancel_accounting_customer_payment');
    const canceled = await repository.executeMutation(cancel.mutation, { id: second.id, expected_row_version: 1, values: { state: 'Canceled' } }) as any;
    expect(canceled).toMatchObject({ state: 'Canceled', row_version: 2 });
    await expect(repository.executeMutation(cancel.mutation, { id: second.id, expected_row_version: 1, values: { state: 'Canceled' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_CUSTOMER_PAYMENT_STALE' });

    const message = action(detailApi, 'send_accounting_customer_payment_message');
    await repository.executeMutation(message.mutation, { id: created.id, content: 'QA customer payment message', current_user_name: 'Admin User' });
    await expect(repository.executeMutation(message.mutation, { id: created.id, content: '   ', current_user_name: 'Admin User' })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_CUSTOMER_PAYMENT_MESSAGE_INVALID' });
    const messages = await repository.querySource(detailApi.datasources.find((source: any) => source.id === 'accounting_customer_payment_messages'), { id: created.id }, 0, 10);
    expect(messages.data).toMatchObject([{ detail: 'QA customer payment message', action_label: 'Message' }]);

    database.close();
    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await restartedRepository.querySource(detailApi.datasources.find((source: any) => source.id === 'accounting_customer_payment_detail'), { id: created.id, fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Paid', customer_bank_account: 'US001-QA-0002' });
    expect((await restartedRepository.querySource(detailApi.datasources.find((source: any) => source.id === 'accounting_customer_payment_messages'), { id: created.id }, 0, 10)).data).toMatchObject([{ detail: 'QA customer payment message' }]);
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});
