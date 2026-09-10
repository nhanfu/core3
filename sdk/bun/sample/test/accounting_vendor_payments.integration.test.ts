import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting vendor payments parity', () => {
  test('records the live Odoo vendor payment menu and responsive view contract', () => {
    const page = yaml('pages/vendor-payments.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.page).toMatchObject({ id: 'vendor-payments', route: '/accounting/vendor-payments' });
    expect(list.view_navigation || 'icons').toBe('icons');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card', 'kanban', 'graph', 'activity']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ mobile: true, label: 'Kanban' });
    expect(list.views.find((view: any) => view.id === 'list')).toMatchObject({ mobile: false });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Date', 'Number', 'Journal', 'Payment Method', 'Vendor', 'Amount', 'State']);
    expect(list.row_open_action).toBe('view_accounting_vendor_payment');
    expect(list.form_view).toEqual({ page: 'apps/services/accounting/pages/payment-detail.yaml', side_panel: false });
  });

  test('keeps vendor payment layout and API fragments joined by page id', () => {
    const page = yaml('pages/vendor-payments.yaml');
    const api = yaml('api/vendor-payments.yaml');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((source: any) => source.id === 'accounting_vendor_payments').query).toContain("payment_type = 'Outbound'");
    expect(api.datasources.find((source: any) => source.id === 'accounting_vendor_payments').permission).toBe('accounting.read');
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'create_accounting_vendor_payment', permission: 'accounting.write' }));
  });

  test('seeds ten deterministic outbound vendor payments with Odoo states', () => {
    const migration = yaml('migrations/20260911090000-014-accounting-vendor-payments.yaml');
    expect(migration.version).toBe('0.0.14');
    expect(migration.type.postgres.up.match(/accounting-vendor-payment-demo-/g)).toHaveLength(10);
    expect(migration.type.postgres.up).toContain("'Outbound'");
    expect(migration.type.postgres.up).toContain("'Manual Payment'");
    expect(migration.type.postgres.up).toContain("'Rejected'");
    expect(migration.type.postgres.down).toContain("accounting-vendor-payment-demo-%");
  });
});
