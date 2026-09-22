import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const actor = { current_user_id: 'user-admin', current_user_name: 'Sales User', view_scope: 'all', current_branch_id: 'branch-hcm' };

async function openRepository(databasePath = ':memory:', migrationName = `sales_order_print_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Sales order Print report parity', () => {
  test('maps Odoo sale.action_report_saleorder to the separate page/API contract', () => {
    const page = yaml('pages/sale-order-detail.yaml');
    const api = yaml('api/sale-order-detail.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/sale/views/sale_order_views.xml', 'utf8');
    const reports = readFileSync('/home/nhanjs/projects/odoo/addons/sale/report/ir_actions_report.xml', 'utf8');
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    const print = action(api, 'print_sale_order');

    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'print_sale_order', label: 'Print', permission: 'orders.read' }));
    expect(print).toMatchObject({ type: 'server', permission: 'orders.read', operation: 'print_report', action: 'sale.orders.print', handler: 'yaml_mutation' });
    expect(api.datasources.find((candidate: any) => candidate.id === 'sale_order_print_runs').query).toContain('sale_order_print_runs');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(sourceView).toContain('string="Print"');
    expect(sourceView).toContain('name="sale.action_report_saleorder"');
    expect(sourceView).toContain('invisible="state == \'sale\'"');
    expect(reports).toContain('<record id="action_report_saleorder" model="ir.actions.report">');
    expect(reports).toContain('<field name="name">Quotation / Order</field>');
    expect(reports).toContain('<field name="report_name">sale.report_saleorder</field>');
  });

  test('prepares quotation and cancelled-order PDF runs without changing order state', async () => {
    const { database, repository } = await openRepository();
    try {
      const print = action(yaml('api/sale-order-detail.yaml'), 'print_sale_order');
      const quotation = await repository.executeMutation(print.mutation, { id: 'order-demo-01', expected_row_version: 1, ...actor });
      expect(quotation).toMatchObject({
        id: 'sale-print-order-demo-01-1', order_id: 'order-demo-01', report_name: 'Quotation / Order', filename: 'Quotation - DH-2026-0101.pdf',
        report_action: 'sale.action_report_saleorder', report_template: 'sale.report_saleorder', output_format: 'PDF',
        printed_by: 'Sales User', row_version: 1,
      });
      const cancelled = await repository.executeMutation(print.mutation, { id: 'order-demo-08', expected_row_version: 1, ...actor });
      expect(cancelled).toMatchObject({ id: 'sale-print-order-demo-08-1', report_name: 'Quotation / Order', filename: 'Order - DH-2026-0108.pdf', printed_by: 'Sales User' });
      expect(await repository.query('SELECT status, row_version FROM orders WHERE id IN (?, ?) ORDER BY id', ['order-demo-01', 'order-demo-08'])).toEqual([
        { status: 'Draft', row_version: 1 },
        { status: 'Cancelled', row_version: 1 },
      ]);
      const history = yaml('api/sale-order-detail.yaml').datasources.find((candidate: any) => candidate.id === 'sale_order_print_runs');
      expect((await repository.querySource(history, { id: 'order-demo-01', ...actor }, 0, 10)).data).toEqual([
        expect.objectContaining({ order_id: 'order-demo-01', order_number: 'DH-2026-0101', report_name: 'Quotation / Order', filename: 'Quotation - DH-2026-0101.pdf', printed_by: 'Sales User' }),
      ]);
    } finally {
      await database.close();
    }
  });

  test('enforces missing, scope, state, actor, and stale guards without partial print runs', async () => {
    const { database, repository } = await openRepository();
    try {
      const print = action(yaml('api/sale-order-detail.yaml'), 'print_sale_order');
      await expect(repository.executeMutation(print.mutation, { id: 'missing-order', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 404, code: 'SALE_ORDER_PRINT_NOT_FOUND' });
      await expect(repository.executeMutation(print.mutation, { id: 'order-demo-03', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_PRINT_NOT_ALLOWED' });
      await expect(repository.executeMutation(print.mutation, { id: 'order-demo-02', expected_row_version: 1, ...actor, view_scope: 'branch', current_branch_id: 'branch-hcm' })).rejects.toMatchObject({ status: 403 });
      await expect(repository.executeMutation(print.mutation, { id: 'order-demo-01', expected_row_version: 1, ...actor, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'SALE_ORDER_PRINT_ACTOR_REQUIRED' });
      await expect(repository.executeMutation(print.mutation, { id: 'order-demo-01', expected_row_version: 99, ...actor })).rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_PRINT_NOT_ALLOWED' });
      expect(await repository.query('SELECT COUNT(*) AS count FROM sale_order_print_runs')).toEqual([{ count: 0 }]);
    } finally {
      await database.close();
    }
  });

  test('preserves print history through migration replay and file-backed restart', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-sales-order-print-'));
    const databasePath = join(tempDir, 'sales.duckdb');
    const migrationName = `sales_order_print_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      const print = action(yaml('api/sale-order-detail.yaml'), 'print_sale_order');
      await first.repository.executeMutation(print.mutation, { id: 'order-demo-01', expected_row_version: 1, ...actor, current_user_name: 'Restart Operator' });
      await first.database.close();
      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query('SELECT order_id, report_name, filename, printed_by FROM sale_order_print_runs WHERE order_id = ?', ['order-demo-01'])).toEqual([
        { order_id: 'order-demo-01', report_name: 'Quotation / Order', filename: 'Quotation - DH-2026-0101.pdf', printed_by: 'Restart Operator' },
      ]);
      await migrateDatabase(second.repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query('SELECT COUNT(*) AS count FROM sale_order_print_runs')).toEqual([{ count: 1 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
