import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/sale-order-detail.yaml');
const api = yaml('api/sale-order-detail.yaml');
const send = api.actions.find((candidate: any) => candidate.id === 'send_sale_quotation');
const detail = api.datasources.find((candidate: any) => candidate.id === 'sale_order_detail');
const mails = api.datasources.find((candidate: any) => candidate.id === 'sale_order_quotation_mails');

async function repositoryForTest(databaseName = ':memory:') {
  const database = await DuckDbDatabase.open(databaseName);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_quotation_email_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_quotation_email_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Sales quotation email parity slice', () => {
  it('maps Odoo action_quotation_send to a separate mail-composer contract', () => {
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/sale/models/sale_order.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/sale/views/sale_order_views.xml', 'utf8');
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'send_sale_quotation', label: 'Send', permission: 'orders.write' }));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(send).toMatchObject({
      type: 'server_form',
      modal_style: 'mail_composer',
      action: 'orders.quotation.send',
      permission: 'orders.write',
      handler: 'yaml_mutation',
    });
    expect(send.mutation).toMatchObject({ operation: 'insert', table: 'sale_order_quotation_mails' });
    expect(send.mutation.fields).toEqual(expect.arrayContaining(['recipient_email', 'subject', 'body_html', 'attachment_name']));
    expect(send.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SALE_ORDER_NOT_FOUND', 'SALE_ORDER_SCOPE_FORBIDDEN', 'SALE_ORDER_SEND_STALE_OR_INVALID',
      'SALE_ORDER_RECIPIENT_INVALID', 'SALE_ORDER_EMAIL_CONTENT_INVALID',
    ]);
    expect(mails.query).toContain('FROM sale_order_quotation_mails');
    expect(detail.query).toContain('AS recipient_email');
    expect(source).toContain('def action_quotation_send(self):');
    expect(source).toContain("'res_model': 'mail.compose.message'");
    expect(source).toContain("'target': 'new'");
    expect(source).toContain("'mark_so_as_sent': True");
    expect(view).toContain('name="action_quotation_send"');
    expect(view).toContain('string="Send"');
    expect(view).toContain("invisible=\"state not in ('sent', 'sale')\"");
  });

  it('sends a durable quotation email, transitions draft quotations, and preserves restart state', async () => {
    const databasePath = `/tmp/core3-sales-quotation-email-${crypto.randomUUID()}.duckdb`;
    const { database, repository } = await repositoryForTest(databasePath);
    const params = {
      order_id: 'order-demo-01',
      view_scope: 'all',
      current_branch_id: 'branch-hcm',
      current_user_id: 'user-admin',
      current_user_name: 'Admin User',
      expected_row_version: 1,
      recipient_name: 'Công ty TNHH Minh Long',
      recipient_email: 'sales@minhlong.example',
      subject: 'Quotation DH-2026-0101',
      body_html: '<p>Please find quotation DH-2026-0101 attached.</p>',
      attachment_name: 'Quotation - DH-2026-0101.pdf',
    };
    const created = await repository.executeMutation(send.mutation, params) as any;
    expect(created).toMatchObject({
      order_id: 'order-demo-01',
      recipient_email: 'sales@minhlong.example',
      state: 'Sent',
      sent_by: 'Admin User',
    });
    expect(await repository.query("SELECT status FROM order_workflow_states WHERE order_id = 'order-demo-01'")).toEqual([{ status: 'Pending Approval' }]);
    expect(await repository.query("SELECT action, detail FROM system_activity WHERE action = 'orders.quotation.send' AND resource_id = 'order-demo-01'")).toEqual([
      { action: 'orders.quotation.send', detail: 'Sent quotation email to sales@minhlong.example' },
    ]);
    expect((await repository.querySource(mails, { id: 'order-demo-01' }, 0, 20)).data).toHaveLength(1);

    await expect(repository.executeMutation(send.mutation, { ...params, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_SEND_STALE_OR_INVALID' });
    await expect(repository.executeMutation(send.mutation, { ...params, expected_row_version: 2, recipient_email: 'invalid' })).rejects.toMatchObject({ status: 422, code: 'SALE_ORDER_RECIPIENT_INVALID' });
    await database.close();

    const reopened = await repositoryForTest(databasePath);
    expect(await reopened.repository.query("SELECT order_id, recipient_email, state, sent_by FROM sale_order_quotation_mails WHERE order_id = 'order-demo-01' ORDER BY id")).toEqual([
      { order_id: 'order-demo-01', recipient_email: 'sales@minhlong.example', state: 'Sent', sent_by: 'Admin User' },
    ]);
    expect(await reopened.repository.query("SELECT status FROM order_workflow_states WHERE order_id = 'order-demo-01'")).toEqual([{ status: 'Pending Approval' }]);
    await reopened.database.close();
  }, 30000);

  it('rejects missing, out-of-scope, and invalid-content sends without writes', async () => {
    const { database, repository } = await repositoryForTest();
    const base = {
      order_id: 'order-demo-01', view_scope: 'branch', current_branch_id: 'branch-hn',
      current_user_id: 'user-dispatcher', current_user_name: 'Dispatcher User', expected_row_version: 1,
      recipient_name: 'Customer', recipient_email: 'customer@example.com', subject: 'Quotation',
      body_html: '<p>Body</p>', attachment_name: 'Quotation.pdf',
    };
    await expect(repository.executeMutation(send.mutation, { ...base, order_id: 'missing-order' })).rejects.toMatchObject({ status: 404, code: 'SALE_ORDER_NOT_FOUND' });
    await expect(repository.executeMutation(send.mutation, base)).rejects.toMatchObject({ status: 403, code: 'SALE_ORDER_SCOPE_FORBIDDEN' });
    await expect(repository.executeMutation(send.mutation, { ...base, view_scope: 'all', subject: ' ' })).rejects.toMatchObject({ status: 422, code: 'SALE_ORDER_EMAIL_CONTENT_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM sale_order_quotation_mails WHERE order_id = 'order-demo-01'")).toEqual([{ count: 0 }]);
    await database.close();
  }, 30000);
});
