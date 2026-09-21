import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/pos-orders.yaml');
const api = yaml('api/pos-orders.yaml');
const emailAction = api.actions.find((candidate: any) => candidate.id === 'send_pos_order_email');
const orders = api.datasources.find((candidate: any) => candidate.id === 'pos_orders');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  id: 'pos-order-demo-001',
  expected_row_version: 1,
  current_company_name: 'Core3 Demo Company',
  current_user_id: 'pos-email-operator',
  current_user_name: 'POS Email Operator',
  recipient_email: 'info@acme.example',
  subject: 'POS Order receipt',
  body: 'Thank you for shopping with us.',
};

describe('POS order Send Email parity', () => {
  test('maps Odoo pos_order_send_mail to a row-prefilled page/API action', () => {
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_order_view.xml', 'utf8')).toContain('id="model_pos_order_send_mail"');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].actions).toContainEqual(expect.objectContaining({ id: 'send_pos_order_email', label: 'Send Email', permission: 'pos.write' }));
    expect(emailAction).toMatchObject({ type: 'server_form', permission: 'pos.write', action: 'pos.orders.send_email', operation: 'queue_email', handler: 'yaml_mutation' });
    expect(emailAction.prefill).toEqual({ recipient_email: '{row.customer_email}', subject: 'POS Order {row.name}', body: 'Thank you for your order, {row.partner_name}.' });
    expect(orders.query).toContain('customer_email');
    expect(emailAction.mutation.steps[1].query).toContain("'email_queued'");
  });

  test('queues durable email state and records the POS operation', async () => {
    const db = await repository('pos_order_email_create');
    const result = await db.executeMutation(emailAction.mutation, values) as any;
    expect(result).toMatchObject({ id: 'pos-order-email-pos-order-demo-001-1', order_id: values.id, recipient_email: values.recipient_email, subject: values.subject, queued_by: values.current_user_name, state: 'Queued', row_version: 1 });
    expect(await db.query('SELECT operation_type, actor_id FROM pos_operations WHERE order_id = ?', [values.id])).toEqual([{ operation_type: 'email_queued', actor_id: values.current_user_id }]);
    expect(await db.query('SELECT customer_email FROM pos_orders WHERE id = ?', [values.id])).toEqual([{ customer_email: 'info@acme.example' }]);
    expect(await db.query('SELECT COUNT(*) AS count FROM pos_order_email_runs WHERE order_id = ?', [values.id])).toEqual([{ count: 1 }]);
  });

  test('enforces scope, actor, recipient, content, version, and permission contracts', async () => {
    const db = await repository('pos_order_email_guards');
    await expect(db.executeMutation(emailAction.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });
    await expect(db.executeMutation(emailAction.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'POS_ORDER_EMAIL_ACTOR_REQUIRED' });
    await expect(db.executeMutation(emailAction.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_EMAIL_STALE' });
    await expect(db.executeMutation(emailAction.mutation, { ...values, recipient_email: 'not-an-email' })).rejects.toMatchObject({ status: 422, code: 'POS_ORDER_EMAIL_INVALID' });
    await expect(db.executeMutation(emailAction.mutation, { ...values, subject: '' })).rejects.toMatchObject({ status: 422, code: 'POS_ORDER_EMAIL_CONTENT_INVALID' });
    await db.run("UPDATE pos_orders SET customer_email = NULL WHERE id = ?", [values.id]);
    await expect(db.executeMutation(emailAction.mutation, { ...values, recipient_email: '' })).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_EMAIL_RECIPIENT_REQUIRED' });
    expect(emailAction.permission).toBe('pos.write');
    expect(await db.query('SELECT COUNT(*) AS count FROM pos_order_email_runs')).toEqual([{ count: 0 }]);
  });
});
