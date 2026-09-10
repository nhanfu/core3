import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/sale-order-detail.yaml');
const api = yaml('api/sale-order-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

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
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(expect.arrayContaining(['Customer', 'Invoice Address', 'Delivery Address', 'Quotation Date', 'Expiration', 'Delivery Date', 'Pricelist', 'Payment Terms']));
    expect(lines.actions[0]).toMatchObject({ id: 'add_sale_order_line', label: 'Add a product', permission: 'orders.write' });
    expect(api.datasources.find((source: any) => source.id === 'sale_order_statuses').query).toContain("('Sales Order', 'Sales Order', 'green')");
  });

  it('keeps action permissions and conflict/not-found boundaries explicit', () => {
    expect(action('send_sale_quotation').permission).toBe('orders.write');
    expect(action('confirm_sale_order').permission).toBe('orders.approve');
    expect(action('cancel_sale_order').permission).toBe('orders.write');
    expect(action('edit_sale_order').mutation.guards.map((guard: any) => guard.status)).toEqual([409, 409]);
    expect(action('reset_sale_quotation').mutation.guards[0]).toMatchObject({ status: 409, code: 'SALE_ORDER_NOT_CANCELLED' });
    expect(action('add_sale_order_line').mutation.guards.map((guard: any) => guard.status)).toEqual([409, 400]);
    expect(api.datasources.find((source: any) => source.id === 'sale_order_detail').query).toContain('WHERE o.id = :id');
  });
});
