import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/sale-order-detail.yaml');
const api = yaml('api/sale-order-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);
const detailSource = api.datasources.find((source: any) => source.id === 'sale_order_detail');
const linesSource = api.datasources.find((source: any) => source.id === 'sale_order_lines');
const workflow = yaml('pages/order-workflow.yaml').workflow;

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_order_detail_form_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_order_detail_form_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Sales order form parity slice', () => {
  it('keeps the page and API fragment bound to one dedicated route', () => {
    expect(page.page).toMatchObject({ id: 'sale-order-detail', route: '/order/sale-order' });
    expect(api.page).toEqual({ id: 'sale-order-detail' });
    expect(page.page.route).not.toBe('/order/detail');
    expect(yaml('pages/sale-quotations.yaml').components[0].form_view.page).toContain('sale-order-detail.yaml');
    expect(yaml('pages/sale-orders.yaml').components[0].form_view.page).toContain('sale-order-detail.yaml');
  });

  it('declares Odoo Sales labels, tabs, mapped states, and form sources', () => {
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const lines = page.components.find((component: any) => component.type === 'LineItemGrid');
    expect(form.header_actions.map((item: any) => item.label)).toEqual(['Edit', 'Send', 'Confirm', 'Confirm', 'Create Invoice', 'Cancel', 'Set to Quotation']);
    expect(form.notebook.tabs.map((item: any) => item.label)).toEqual(['Order Lines', 'Other Information']);
    const formLabels = [
      ...form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label)),
      ...form.notebook.tabs.flatMap((tab: any) => (tab.groups || []).flatMap((group: any) => (group.fields || []).map((field: any) => field.label))),
    ];
    expect(formLabels).toEqual(expect.arrayContaining(['Customer', 'Invoice Address', 'Delivery Address', 'Quotation Date', 'Expiration', 'Delivery Date', 'Pricelist', 'Payment Terms']));
    expect(lines.actions[0]).toMatchObject({ id: 'add_sale_order_line', label: 'Add a product', permission: 'orders.write' });
    expect(api.datasources.find((source: any) => source.id === 'sale_order_statuses').query).toContain("('Sent', 'Quotation Sent', 'amber')");
    expect(api.datasources.find((source: any) => source.id === 'sale_order_statuses').query).toContain("('Cancelled', 'Cancelled', 'red')");
  });

  it('keeps action permissions and conflict/not-found boundaries explicit', () => {
    expect(action('send_sale_quotation').permission).toBe('orders.write');
    expect(action('confirm_sale_order').permission).toBe('orders.approve');
    expect(action('cancel_sale_order').permission).toBe('orders.write');
    expect(action('edit_sale_order').mutation.guards.map((guard: any) => guard.status)).toEqual([409, 409]);
    expect(action('edit_sale_order').mutation.concurrency).toEqual({ required: true });
    expect(action('cancel_sale_order').mutation.guards[0]).toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect(action('cancel_sale_order').mutation.guards[1]).toMatchObject({ status: 409, code: 'INVALID_TRANSITION' });
    expect(action('reset_sale_quotation').mutation.guards[0]).toMatchObject({ status: 409, code: 'SALE_ORDER_NOT_CANCELLED' });
    expect(action('add_sale_order_line').mutation.guards.map((guard: any) => guard.status)).toEqual([409, 400]);
    expect(api.datasources.find((source: any) => source.id === 'sale_order_detail').query).toContain('WHERE o.id = :id');
  });

  it('serves form fixtures and enforces permissioned stale and invalid transitions', async () => {
    const { database, repository } = await repositoryForTest();
    const params = { id: 'order-demo-01', view_scope: 'all', current_branch_id: 'branch-hcm', current_user_id: 'user-admin', current_user_name: 'Admin User' };
    const readDetail = async () => (await repository.querySource(detailSource, params, 0, 1)).data;
    const initial = await readDetail();
    expect(initial).toMatchObject({ id: 'order-demo-01', status: 'Quotation', status_label: 'Quotation', order_number: 'DH-2026-0101' });
    expect((await repository.querySource(linesSource, params, 0, 50)).data).toHaveLength(1);

    const send = workflow.transitions.find((transition: any) => transition.id === 'submit_for_approval');
    const approve = workflow.transitions.find((transition: any) => transition.id === 'approve');
    const cancel = action('cancel_sale_order');
    await expect(repository.executeMutation(approve.mutation, { ...params, expected_row_version: initial.row_version })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(send.mutation, { ...params, expected_row_version: Number(initial.row_version) - 1 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await repository.executeMutation(send.mutation, { ...params, expected_row_version: initial.row_version });
    const sent = await readDetail();
    expect(sent).toMatchObject({ status: 'Sent', status_label: 'Quotation Sent', row_version: Number(initial.row_version) + 1 });
    await expect(repository.executeMutation(send.mutation, { ...params, expected_row_version: sent.row_version })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(approve.mutation, { ...params, expected_row_version: initial.row_version })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await repository.executeMutation(approve.mutation, { ...params, expected_row_version: sent.row_version });
    const confirmed = await readDetail();
    expect(confirmed).toMatchObject({ status: 'Sales Order', status_label: 'Sales Order', row_version: Number(sent.row_version) + 1 });
    await expect(repository.executeMutation(cancel.mutation, { ...params, expected_row_version: sent.row_version })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(cancel.mutation, { ...params, expected_row_version: confirmed.row_version });
    const cancelled = await readDetail();
    expect(cancelled).toMatchObject({ status: 'Cancelled', status_label: 'Cancelled', row_version: Number(confirmed.row_version) + 1 });
    await expect(repository.executeMutation(cancel.mutation, { ...params, expected_row_version: cancelled.row_version })).rejects.toMatchObject({ status: 409, code: 'INVALID_TRANSITION' });
    await database.close();
  }, 30000);
});
