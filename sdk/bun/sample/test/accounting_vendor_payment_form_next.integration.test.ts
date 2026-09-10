import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Accounting vendor payment form follow-up', () => {
  test('routes vendor rows and New to dedicated form surfaces without changing customer payments', () => {
    const list = yaml('pages/vendor-payments.yaml').components[0];
    const api = yaml('api/vendor-payments.yaml');
    expect(list.form_view).toEqual({ page: 'apps/services/accounting/pages/vendor-payment-detail.yaml', side_panel: false });
    expect(action(api, 'view_accounting_vendor_payment')).toMatchObject({ navigate_to: '/accounting/vendor-payment-detail' });
    expect(action(api, 'new_accounting_vendor_payment')).toMatchObject({ type: 'navigate', navigate_to: '/accounting/vendor-payments/new', permission: 'accounting.write' });
    expect(yaml('pages/payments.yaml').components[0].form_view).toEqual({ page: 'apps/services/accounting/pages/payment-detail.yaml', side_panel: false });
  });

  test('declares Odoo-shaped detail and new form fields, statuses, tabs, and chatter', () => {
    const detail = yaml('pages/vendor-payment-detail.yaml');
    const created = yaml('pages/vendor-payment-new.yaml');
    for (const page of [detail, created]) {
      const form = page.components[0];
      expect(form.type).toBe('OdooFormView');
      expect(form.statusbar.map((state: any) => state.label)).toEqual(page === detail ? ['Draft', 'In Process', 'Paid', 'Canceled', 'Rejected'] : ['Draft', 'In Process', 'Paid']);
      expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(expect.arrayContaining(['Payment Type', 'Vendor', 'Amount', 'Date', 'Memo', 'Journal', 'Payment Method?', 'Vendor Bank Account']));
      expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Other Info']);
      expect(form.message_source).toBe(page === detail ? 'accounting_vendor_payment_messages' : 'accounting_vendor_payment_new_messages');
      expect(form.message_action).toBe('send_accounting_vendor_payment_message');
      expect(form.note_action).toBe('log_accounting_vendor_payment_note');
      expect(form.activity_action).toBe('schedule_accounting_vendor_payment_activity');
    }
  });

  test('joins page and API fragments and keeps detail/new datasources deterministic', () => {
    const detail = yaml('pages/vendor-payment-detail.yaml');
    const detailApi = yaml('api/vendor-payment-detail.yaml');
    const created = yaml('pages/vendor-payment-new.yaml');
    const createdApi = yaml('api/vendor-payment-new.yaml');
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(createdApi.page.id).toBe(created.page.id);
    expect(detailApi.datasources.find((source: any) => source.id === 'accounting_vendor_payment_detail').query).toContain("payment_type = 'Outbound'");
    expect(detailApi.datasources.find((source: any) => source.id === 'accounting_vendor_payment_detail').query).toContain('id = :id');
    expect(createdApi.datasources.find((source: any) => source.id === 'accounting_vendor_payment_new').query).toContain("'Draft Payment' AS name");
    expect(createdApi.datasources.find((source: any) => source.id === 'accounting_vendor_payment_new_vendors').query).toContain('Acme Corporation');
  });

  test('guards create, edit, workflow, and chatter actions with permissions and stale/not-found validation', () => {
    const detailApi = yaml('api/vendor-payment-detail.yaml');
    const createdApi = yaml('api/vendor-payment-new.yaml');
    const update = action(detailApi, 'edit_accounting_vendor_payment');
    expect(update).toMatchObject({ type: 'server_form', permission: 'accounting.write', operation: 'update', handler: 'yaml_mutation' });
    expect(update.mutation.concurrency).toEqual({ required: true });
    expect(update.mutation.guards.map((guard: any) => guard.code)).toEqual(expect.arrayContaining(['ACCOUNTING_VENDOR_PAYMENT_NOT_FOUND', 'ACCOUNTING_VENDOR_PAYMENT_STALE', 'ACCOUNTING_VENDOR_PAYMENT_AMOUNT_INVALID']));
    for (const id of ['confirm_accounting_vendor_payment', 'mark_accounting_vendor_payment_paid', 'cancel_accounting_vendor_payment', 'send_accounting_vendor_payment_message', 'log_accounting_vendor_payment_note', 'schedule_accounting_vendor_payment_activity']) {
      expect(action(detailApi, id), id).toMatchObject({ permission: 'accounting.write' });
    }
    expect(action(createdApi, 'create_accounting_vendor_payment').mutation.guards.map((guard: any) => guard.code)).toEqual(expect.arrayContaining(['ACCOUNTING_VENDOR_PAYMENT_AMOUNT_INVALID', 'ACCOUNTING_VENDOR_PAYMENT_DATE_INVALID']));
  });

  test('adds vendor-bank-account storage with ten explicit deterministic fixtures', () => {
    const migration = yaml('migrations/20260911150000-021-accounting-vendor-payment-form.yaml');
    expect(migration.version).toBe('0.0.21');
    expect(migration.type.postgres.up).toContain('ADD COLUMN IF NOT EXISTS vendor_bank_account');
    expect(migration.type.postgres.up.match(/accounting-vendor-payment-demo-\d+/g)).toHaveLength(10);
    expect(migration.type.postgres.down).toContain('DROP COLUMN IF EXISTS vendor_bank_account');
  });

  test('executes deterministic create, edit, workflow, chatter, stale, and not-found boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'accounting_vendor_payment_form_migrations', ['schema', 'data']);
    const detailApi = yaml('api/vendor-payment-detail.yaml');
    const newApi = yaml('api/vendor-payment-new.yaml');
    const create = action(newApi, 'create_accounting_vendor_payment');
    const update = action(detailApi, 'edit_accounting_vendor_payment');
    const confirm = action(detailApi, 'confirm_accounting_vendor_payment');
    const paid = action(detailApi, 'mark_accounting_vendor_payment_paid');
    const message = action(detailApi, 'send_accounting_vendor_payment_message');

    await expect(repository.executeMutation(create.mutation, { values: { payment_type: 'Outbound', partner_name: 'Lumber Inc', amount: 125.5, payment_date: '2026-09-10', journal: 'Bank', payment_method: 'Manual Payment', currency: 'USD', reference: 'QA-001', vendor_bank_account: 'QA-BANK-001' } })).resolves.toMatchObject({ payment_type: 'Outbound', state: 'Draft', amount: 125.5, vendor_bank_account: 'QA-BANK-001', row_version: 1 });
    const created = await repository.executeMutation(create.mutation, { values: { payment_type: 'Outbound', partner_name: 'Wood Corner', amount: 125.5, payment_date: '2026-09-10', journal: 'Bank', payment_method: 'Manual Payment', currency: 'USD', reference: 'QA-002', vendor_bank_account: 'QA-BANK-002' } }) as any;
    expect(created).toMatchObject({ payment_type: 'Outbound', state: 'Draft', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { payment_type: 'Outbound', amount: 0, payment_date: '2026-09-10', journal: 'Bank', payment_method: 'Manual Payment' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_VENDOR_PAYMENT_AMOUNT_INVALID' });

    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { partner_name: 'Wood Corner', payment_type: 'Outbound', amount: 200, payment_date: '2026-09-10', journal: 'Cash', payment_method: 'Check', currency: 'USD', reference: 'QA-002-edited', vendor_bank_account: 'QA-BANK-002' } }) as any;
    expect(edited).toMatchObject({ amount: 200, journal: 'Cash', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { partner_name: 'Wood Corner', payment_type: 'Outbound', amount: 201, payment_date: '2026-09-10', journal: 'Cash', payment_method: 'Check' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_VENDOR_PAYMENT_STALE' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-vendor-payment', expected_row_version: 1, values: { partner_name: 'Missing', payment_type: 'Outbound', amount: 1, payment_date: '2026-09-10', journal: 'Bank', payment_method: 'Manual Payment' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_VENDOR_PAYMENT_NOT_FOUND' });

    const inProcess = await repository.executeMutation(confirm.mutation, { id: created.id, expected_row_version: 2, values: { state: 'In Process' } }) as any;
    expect(inProcess).toMatchObject({ state: 'In Process', row_version: 3 });
    const settled = await repository.executeMutation(paid.mutation, { id: created.id, expected_row_version: 3, values: { state: 'Paid' } }) as any;
    expect(settled).toMatchObject({ state: 'Paid', row_version: 4 });
    await expect(repository.executeMutation(paid.mutation, { id: created.id, expected_row_version: 3, values: { state: 'Paid' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_VENDOR_PAYMENT_STALE' });

    await repository.executeMutation(message.mutation, { id: created.id, content: 'QA payment message', current_user_name: 'Admin User' });
    const messages = await repository.querySource(detailApi.datasources.find((source: any) => source.id === 'accounting_vendor_payment_messages'), { id: created.id }, 0, 10);
    expect(messages.data).toMatchObject([{ detail: 'QA payment message', action_label: 'Message' }]);
    database.close();
  });
});
