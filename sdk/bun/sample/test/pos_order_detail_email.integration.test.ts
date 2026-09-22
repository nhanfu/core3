import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/pos-order-detail.yaml');
const api = yaml('api/pos-order-detail.yaml');
const detail = api.datasources.find((candidate: any) => candidate.id === 'pos_order_detail');
const emailAction = api.actions.find((candidate: any) => candidate.id === 'send_pos_order_detail_email');

const values = {
  id: 'pos-order-demo-001',
  expected_row_version: 1,
  current_company_name: 'Core3 Demo Company',
  current_user_id: 'pos-detail-email-operator',
  current_user_name: 'POS Detail Email Operator',
  recipient_email: 'info@acme.example',
  subject: 'POS Order receipt',
  body: 'Thank you for shopping with us.',
};

async function repository(name: string, path = ':memory:') {
  const database = await DuckDbDatabase.open(path);
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, result };
}

describe('POS order detail Send Email parity', () => {
  test('maps Odoo action_send_mail onto the detail page/API pair', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_order_view.xml', 'utf8');
    const header = page.components[0].header_actions.find((candidate: any) => candidate.id === 'send_pos_order_detail_email');

    expect(api.page.id).toBe(page.page.id);
    expect(source).toContain('name="action_send_mail"');
    expect(source).toContain('title="email"');
    expect(header).toMatchObject({ label: 'Send Email', permission: 'pos.write', variant: 'secondary' });
    expect(header.show_if).toContain('customer_email');
    expect(page.components[0].groups[1].fields).toContainEqual({ field: 'customer_email', label: 'Email' });
    expect(detail.query).toContain('o.customer_email');
    expect(emailAction).toMatchObject({ type: 'server_form', permission: 'pos.write', action: 'pos.orders.send_email', operation: 'queue_email', handler: 'yaml_mutation' });
    expect(emailAction.params).toEqual({ id: '{state.id}', expected_row_version: '{state.row_version}' });
    expect(emailAction.prefill).toEqual({
      recipient_email: '{state.pos_order_detail.customer_email}',
      subject: 'POS Order {state.pos_order_detail.name}',
      body: 'Thank you for your order, {state.pos_order_detail.partner_name}.',
    });
    expect(emailAction.refresh).toEqual(['pos_order_detail', 'pos_order_operations']);
  });

  test('queues the detail email durably and keeps the detail projection scoped', async () => {
    const { database, result } = await repository('pos_order_detail_email_create');
    const detailResult = await result.querySource(detail, { id: values.id, current_company_name: values.current_company_name }, 0, 1);
    expect(detailResult.data).toMatchObject({ id: values.id, customer_email: values.recipient_email });

    const queued = await result.executeMutation(emailAction.mutation, values) as any;
    expect(queued).toMatchObject({
      id: 'pos-order-email-pos-order-demo-001-1',
      order_id: values.id,
      recipient_email: values.recipient_email,
      subject: values.subject,
      queued_by: values.current_user_name,
      state: 'Queued',
      row_version: 1,
    });
    expect(await result.query('SELECT operation_type, actor_id FROM pos_operations WHERE order_id = ?', [values.id])).toEqual([
      { operation_type: 'email_queued', actor_id: values.current_user_id },
    ]);
    expect(await result.query('SELECT COUNT(*) AS count FROM pos_order_email_runs WHERE order_id = ?', [values.id])).toEqual([{ count: 1 }]);
    expect((await result.querySource(detail, { id: values.id, current_company_name: 'Core3 Vietnam Branch' }, 0, 1)).data).toEqual({});
    database.close();
  });

  test('rejects stale, actor, recipient, content, and permission-boundary replays', async () => {
    const { database, result } = await repository('pos_order_detail_email_guards');
    await expect(result.executeMutation(emailAction.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_EMAIL_STALE' });
    await expect(result.executeMutation(emailAction.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'POS_ORDER_EMAIL_ACTOR_REQUIRED' });
    await expect(result.executeMutation(emailAction.mutation, { ...values, recipient_email: 'not-an-email' })).rejects.toMatchObject({ status: 422, code: 'POS_ORDER_EMAIL_INVALID' });
    await expect(result.executeMutation(emailAction.mutation, { ...values, subject: '' })).rejects.toMatchObject({ status: 422, code: 'POS_ORDER_EMAIL_CONTENT_INVALID' });
    await result.run("UPDATE pos_orders SET customer_email = NULL WHERE id = ?", [values.id]);
    await expect(result.executeMutation(emailAction.mutation, { ...values, recipient_email: '' })).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_EMAIL_RECIPIENT_REQUIRED' });
    expect(emailAction.permission).toBe('pos.write');
    expect(await result.query('SELECT COUNT(*) AS count FROM pos_order_email_runs')).toEqual([{ count: 0 }]);
    database.close();
  });

  test('preserves queued detail emails across a file-backed restart and replay', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'core3-pos-order-detail-email-'));
    const databasePath = join(workDir, 'pos.duckdb');
    const migrationName = `pos_order_detail_email_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await repository(migrationName, databasePath);
    await first.result.executeMutation(emailAction.mutation, values);
    first.database.close();

    const reopened = await repository(migrationName, databasePath);
    expect(await reopened.result.query('SELECT recipient_email, state FROM pos_order_email_runs WHERE order_id = ?', [values.id])).toEqual([
      { recipient_email: values.recipient_email, state: 'Queued' },
    ]);
    await migrateDatabase(reopened.result, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await reopened.result.query('SELECT COUNT(*) AS count FROM pos_order_email_runs WHERE order_id = ?', [values.id])).toEqual([{ count: 1 }]);
    reopened.database.close();
    rmSync(workDir, { recursive: true, force: true });
  });
});
