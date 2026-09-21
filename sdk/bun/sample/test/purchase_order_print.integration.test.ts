import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `purchase_order_print_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

const actor = { current_user_id: 'user-admin', current_user_name: 'Purchase User' };

describe('Purchase Order Print report parity', () => {
  test('maps both Odoo Print buttons to the detail/API boundary and source report definitions', () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/purchase/views/purchase_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/purchase/models/purchase_order.py', 'utf8');
    const reports = readFileSync('/home/nhanjs/projects/odoo/addons/purchase/report/purchase_reports.xml', 'utf8');
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('purchase-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(detail.header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'print_purchase_quotation_detail', label: 'Print', permission: 'purchase.read' }),
      expect.objectContaining({ id: 'print_purchase_order_detail', label: 'Print', permission: 'purchase.read' }),
    ]));
    expect(action(api, 'print_purchase_quotation_detail')).toMatchObject({ type: 'server', permission: 'purchase.read', operation: 'print_report', action: 'purchase.report_purchase_quotation', handler: 'yaml_mutation' });
    expect(action(api, 'print_purchase_order_detail')).toMatchObject({ type: 'server', permission: 'purchase.read', operation: 'print_report', action: 'purchase.action_report_purchase_order', handler: 'yaml_mutation' });
    expect(sourceView).toContain('name="print_quotation" string="Print" type="object"');
    expect(sourceView).toContain('name="%(purchase.action_report_purchase_order)d" string="Print" type="action"');
    expect(sourceModel).toContain("self.env.ref('purchase.report_purchase_quotation').report_action(self)");
    expect(reports).toContain('<record id="action_report_purchase_order" model="ir.actions.report">');
    expect(reports).toContain('<record id="report_purchase_quotation" model="ir.actions.report">');
    expect(api.datasources.find((candidate: any) => candidate.id === 'purchase_order_print_runs').query).toContain('purchase_order_print_runs');
  });

  test('prepares quotation and Purchase Order PDF runs with Odoo state behavior', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/purchase-detail.yaml');
      const quotation = action(api, 'print_purchase_quotation_detail');
      const purchaseOrder = action(api, 'print_purchase_order_detail');

      expect(await repository.executeMutation(quotation.mutation, { id: 'po-demo-001', expected_row_version: 1, ...actor })).toMatchObject({
        id: 'purchase-print-po-demo-001-1', purchase_order_id: 'po-demo-001', report_name: 'Request for Quotation',
        report_action: 'purchase.report_purchase_quotation', report_template: 'purchase.report_purchasequotation', output_format: 'PDF', printed_by: 'Purchase User', row_version: 1,
      });
      expect(await repository.query('SELECT state, row_version FROM purchase_orders WHERE id = ?', ['po-demo-001'])).toEqual([{ state: 'Sent', row_version: 2 }]);

      expect(await repository.executeMutation(purchaseOrder.mutation, { id: 'po-demo-005', expected_row_version: 1, ...actor })).toMatchObject({
        id: 'purchase-print-po-demo-005-1', purchase_order_id: 'po-demo-005', report_name: 'Purchase Order',
        report_action: 'purchase.action_report_purchase_order', report_template: 'purchase.report_purchaseorder', output_format: 'PDF', printed_by: 'Purchase User', row_version: 1,
      });
      expect(await repository.query('SELECT state, row_version FROM purchase_orders WHERE id = ?', ['po-demo-005'])).toEqual([{ state: 'Confirmed', row_version: 1 }]);
      const history = api.datasources.find((candidate: any) => candidate.id === 'purchase_order_print_runs');
      expect((await repository.querySource(history, { id: 'po-demo-005', fixture_state: null }, 0, 10)).data).toEqual([
        expect.objectContaining({ report_name: 'Purchase Order', purchase_order_name: 'PO/2026/0005', printed_by: 'Purchase User' }),
      ]);
    } finally {
      await database.close();
    }
  });

  test('enforces state, actor, missing-record, stale, and permission boundaries without partial runs', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/purchase-detail.yaml');
      const quotation = action(api, 'print_purchase_quotation_detail');
      const purchaseOrder = action(api, 'print_purchase_order_detail');
      await expect(repository.executeMutation(quotation.mutation, { id: 'missing-purchase-order', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_ORDER_PRINT_NOT_FOUND' });
      await expect(repository.executeMutation(quotation.mutation, { id: 'po-demo-001', expected_row_version: 99, ...actor })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_QUOTATION_PRINT_NOT_ALLOWED' });
      await expect(repository.executeMutation(quotation.mutation, { id: 'po-demo-001', expected_row_version: 1, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'PURCHASE_ORDER_PRINT_ACTOR_REQUIRED' });
      await expect(repository.executeMutation(purchaseOrder.mutation, { id: 'po-demo-001', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_PRINT_NOT_ALLOWED' });
      await expect(repository.executeMutation(purchaseOrder.mutation, { id: 'po-demo-005', expected_row_version: 99, ...actor })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_PRINT_NOT_ALLOWED' });
      expect(await repository.query('SELECT COUNT(*) AS count FROM purchase_order_print_runs')).toEqual([{ count: 0 }]);
    } finally {
      await database.close();
    }
  });

  test('preserves print history through migration replay and file-backed restart', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-purchase-order-print-'));
    const databasePath = join(tempDir, 'purchase.duckdb');
    const migrationName = `purchase_order_print_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      await first.repository.executeMutation(action(yaml('api/purchase-detail.yaml'), 'print_purchase_order_detail').mutation, { id: 'po-demo-005', expected_row_version: 1, ...actor, current_user_name: 'Restart Operator' });
      await first.database.close();
      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query('SELECT purchase_order_id, report_name, printed_by FROM purchase_order_print_runs WHERE purchase_order_id = ?', ['po-demo-005'])).toEqual([
        { purchase_order_id: 'po-demo-005', report_name: 'Purchase Order', printed_by: 'Restart Operator' },
      ]);
      await migrateDatabase(second.repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query('SELECT COUNT(*) AS count FROM purchase_order_print_runs')).toEqual([{ count: 1 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
