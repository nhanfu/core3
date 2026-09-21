import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS linked invoice smart button', () => {
  test('maps Odoo action_view_invoice through separate page/API contracts', () => {
    const orderPage = yaml('pages/pos-order-detail.yaml');
    const orderApi = yaml('api/pos-order-detail.yaml');
    const invoicePage = yaml('pages/pos-invoice-detail.yaml');
    const invoiceApi = yaml('api/pos-invoice-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_order.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_order_view.xml', 'utf8');
    const header = orderPage.components[0].header_actions.find((action: any) => action.id === 'view_pos_order_invoice');
    const action = orderApi.actions.find((candidate: any) => candidate.id === 'view_pos_order_invoice');

    expect(orderApi.page.id).toBe(orderPage.page.id);
    expect(invoiceApi.page.id).toBe(invoicePage.page.id);
    expect(header).toMatchObject({ label: 'Invoice', permission: 'pos.read', variant: 'secondary' });
    expect(header.show_if).toContain('invoice_id');
    expect(action).toMatchObject({ type: 'navigate', permission: 'pos.read', navigate_to: '/point-of-sale/invoice-detail' });
    expect(action.params).toEqual({ id: '{state.invoice_id}' });
    expect(invoiceApi.datasources.find((sourceConfig: any) => sourceConfig.id === 'pos_invoice_detail')).toMatchObject({ permission: 'pos.read', single: true });
    expect(source).toContain('def action_view_invoice(self):');
    expect(source).toContain("'name': _('Customer Invoice')");
    expect(view).toContain('name="action_view_invoice"');
    expect(view).toContain('string="Invoice"');
  });

  test('projects the linked invoice only through the current company boundary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `pos_order_invoice_smart_button_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const source = yaml('api/pos-invoice-detail.yaml').datasources[0];

    expect(await repository.querySource(source, { id: 'pos-invoice-smart-button-001', current_company_name: 'Core3 Demo Company' })).toMatchObject({
      data: { invoice_id: 'pos-invoice-smart-button-001', invoice_number: 'POS/2026/09/22/INV-001', state: 'Posted', order_name: 'POS/2026/09/22/INVOICE-SMART-BUTTON', amount: 24.2 },
    });
    expect(await repository.querySource(source, { id: 'pos-invoice-smart-button-001', current_company_name: 'Core3 Vietnam Branch' })).toMatchObject({ data: {} });
    expect(await repository.querySource(source, { id: 'missing-invoice', current_company_name: 'Core3 Demo Company' })).toMatchObject({ data: {} });
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, not_found: { status: 404 }, transport_error: { status: 503 } });
    database.close();
  });

  test('keeps the linked order and invoice durable across migration replay and restart', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'core3-pos-invoice-smart-button-'));
    const databasePath = join(workDir, 'pos.duckdb');
    const migrationName = `pos_order_invoice_smart_button_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await firstRepository.query('SELECT invoice_id, state FROM pos_orders WHERE id = ?', ['pos-order-invoice-smart-button-001'])).toEqual([{ invoice_id: 'pos-invoice-smart-button-001', state: 'Invoiced' }]);
    first.close();

    const reopened = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopened);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM pos_invoices WHERE id = ?', ['pos-invoice-smart-button-001'])).toEqual([{ count: 1 }]);
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM pos_orders WHERE id = ?', ['pos-order-invoice-smart-button-001'])).toEqual([{ count: 1 }]);
    reopened.close();
    rmSync(workDir, { recursive: true, force: true });
  });
});
