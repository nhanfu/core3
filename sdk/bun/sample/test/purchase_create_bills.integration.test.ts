import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/purchase');
const accountingRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const accountingYaml = (file: string) => Bun.YAML.parse(readFileSync(join(accountingRoot, file), 'utf8')) as any;

async function repositoryForTest(
  databasePath = ':memory:',
  accountingCall?: (operation: string, request: Record<string, unknown>) => Promise<any>,
) {
  const database = await DuckDbDatabase.open(databasePath);
  const accountingDatabase = await DuckDbDatabase.open(':memory:');
  const accountingRepository = new YamlRepository(accountingDatabase);
  await accountingRepository.run(`CREATE TABLE accounting_invoices (
    id VARCHAR PRIMARY KEY, row_version BIGINT NOT NULL DEFAULT 1, name VARCHAR NOT NULL,
    partner_name VARCHAR, invoice_type VARCHAR NOT NULL DEFAULT 'Customer Invoice',
    invoice_date DATE, due_date DATE, amount_untaxed DECIMAL(18,2) NOT NULL DEFAULT 0,
    amount_tax DECIMAL(18,2) NOT NULL DEFAULT 0, amount_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    amount_residual DECIMAL(18,2) NOT NULL DEFAULT 0, state VARCHAR NOT NULL DEFAULT 'Draft',
    reference VARCHAR, source_service VARCHAR, source_type VARCHAR, source_id VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  const sourceAction = accountingYaml('pages/invoices.yaml').actions.find(
    (candidate: any) => candidate.id === 'create_accounting_invoice_from_source',
  );
  const repository = new YamlRepository(database, (name: string) => name === 'yaml.service.accounting'
    ? {
      call: accountingCall || ((operation: string, request: Record<string, unknown>) => operation === 'accounting.invoices.create_from_source'
        ? accountingRepository.executeMutation(sourceAction.mutation, request)
        : undefined),
    }
    : undefined);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, 'purchase_create_bills_migrations', ['schema', 'data']);
  return { database, repository, accountingDatabase, accountingRepository };
}

describe('Purchase Create Bills parity slice', () => {
  test('declares the Odoo list action and keeps the page/API boundary', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/purchase-orders.yaml');
    const api = yaml('api/purchase-orders.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_purchase_bills');

    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'purchase-orders' });
    expect(discovered.pageDatasources.get('purchase-orders')).toContain('purchase_orders');
    expect(list).toMatchObject({ selectable: true, row_open_action: 'view_purchase_order' });
    expect(list.bulk_actions).toEqual([
      { id: 'create_purchase_bills', label: 'Create Bills', permission: 'purchase.write' },
    ]);
    expect(action).toMatchObject({
      type: 'server', permission: 'purchase.write', operation: 'bulk_create',
      action: 'purchase.orders.create_bills',
    });
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'PURCHASE_BILL_SELECTION_REQUIRED',
      'PURCHASE_BILL_SELECTION_INVALID',
      'PURCHASE_BILL_ORDER_NOT_FOUND',
    ]);
    expect(yaml('pages/purchase-detail.yaml').components[0].stat_buttons).toContainEqual(
      expect.objectContaining({ id: 'open_purchase_vendor_bill', label: 'Vendor Bills', permission: 'purchase.read' }),
    );
    expect(yaml('api/purchase-detail.yaml').actions.find((candidate: any) => candidate.id === 'open_purchase_vendor_bill')).toMatchObject({
      navigate_to: '/accounting/invoice-detail', permission: 'purchase.read',
    });
  });

  test('creates durable draft vendor bills, updates billing status, and blocks invalid retries', async () => {
    const { database, repository, accountingDatabase, accountingRepository } = await repositoryForTest();
    try {
      const api = yaml('api/purchase-orders.yaml');
      const source = api.datasources.find((candidate: any) => candidate.id === 'purchase_orders');
      const action = api.actions.find((candidate: any) => candidate.id === 'create_purchase_bills');
      const params = { q: null, state: null, vendor_id: null, fixture_state: null };
      const selectedIds = ['po-demo-005', 'po-demo-007'];

      expect((await repository.querySource(source, { ...params, q: 'Warehouse' }, 0, 50)).data).toEqual([
        expect.objectContaining({ id: 'po-demo-005', billing_status: 'To Bill' }),
      ]);
      await expect(repository.executeMutation(action.mutation, { selectedIds: ['po-demo-005', 'missing-purchase-order'] })).rejects.toMatchObject({
        status: 404, code: 'PURCHASE_BILL_ORDER_NOT_FOUND',
      });
      const created = await repository.executeMutation(action.mutation, { selectedIds }) as any;
      expect(Number(created.created_count)).toBe(2);
      expect(await repository.query(
        'SELECT purchase_order_id, invoice_number, state, amount FROM purchase_vendor_bills WHERE purchase_order_id IN (?, ?) ORDER BY purchase_order_id',
        selectedIds,
      )).toEqual([
        { purchase_order_id: 'po-demo-005', invoice_number: 'BILL/PO/2026/0005', state: 'Draft', amount: 1350 },
        { purchase_order_id: 'po-demo-007', invoice_number: 'BILL/PO/2026/0007', state: 'Draft', amount: 555 },
      ]);
      expect(await accountingRepository.query(
        "SELECT source_service, source_type, source_id, invoice_type, state, amount_total FROM accounting_invoices WHERE source_service = 'purchase' ORDER BY source_id",
      )).toEqual([
        { source_service: 'purchase', source_type: 'purchase_order', source_id: 'po-demo-005', invoice_type: 'Vendor Bill', state: 'Draft', amount_total: 1350 },
        { source_service: 'purchase', source_type: 'purchase_order', source_id: 'po-demo-007', invoice_type: 'Vendor Bill', state: 'Draft', amount_total: 555 },
      ]);
      expect((await repository.querySource(source, { ...params, q: 'Warehouse' }, 0, 50)).data).toEqual([
        expect.objectContaining({ id: 'po-demo-005', billing_status: 'Invoiced', activity_summary: 'Review vendor bill' }),
      ]);
      const detail = yaml('api/purchase-detail.yaml').datasources.find((candidate: any) => candidate.id === 'purchase_order_detail');
      const detailRow = (await repository.querySource(detail, { id: 'po-demo-005', fixture_state: null }, 0, 1)).data;
      expect(detailRow).toMatchObject({ billing_status: 'Invoiced', vendor_bill_count: 1 });
      expect(typeof detailRow.vendor_bill_id).toBe('string');

      await expect(repository.executeMutation(action.mutation, { selectedIds })).rejects.toMatchObject({
        status: 409, code: 'PURCHASE_BILL_SELECTION_INVALID',
      });
      await expect(repository.executeMutation(action.mutation, { selectedIds: [] })).rejects.toMatchObject({
        status: 400, code: 'PURCHASE_BILL_SELECTION_REQUIRED',
      });
      await expect(repository.executeMutation(action.mutation, { selectedIds: ['po-demo-006'] })).rejects.toMatchObject({
        status: 409, code: 'PURCHASE_BILL_SELECTION_INVALID',
      });
      await expect(repository.executeMutation(action.mutation, { selectedIds: ['missing-purchase-order'] })).rejects.toMatchObject({
        status: 404, code: 'PURCHASE_BILL_ORDER_NOT_FOUND',
      });
      expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_vendor_bills WHERE purchase_order_id IN ('po-demo-005', 'po-demo-006', 'po-demo-007')")).toEqual([{ count: 2 }]);
    } finally {
      await database.close();
      await accountingDatabase.close();
    }
  }, 30000);

  test('rolls back the local link when Accounting rejects the bill request', async () => {
    const { database, repository, accountingDatabase } = await repositoryForTest(':memory:', async () => {
      throw { status: 503, code: 'ACCOUNTING_UNAVAILABLE', message: 'Accounting service is unavailable' };
    });
    try {
      const action = yaml('api/purchase-orders.yaml').actions.find((candidate: any) => candidate.id === 'create_purchase_bills');
      await expect(repository.executeMutation(action.mutation, { selectedIds: ['po-demo-005'] })).rejects.toMatchObject({
        status: 503, code: 'ACCOUNTING_UNAVAILABLE',
      });
      expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_vendor_bills WHERE purchase_order_id = 'po-demo-005'")).toEqual([{ count: 0 }]);
    } finally {
      await database.close();
      await accountingDatabase.close();
    }
  });

  test('persists the bill link across restart and keeps retry idempotent', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-purchase-bills-'));
    const databasePath = join(tempDir, 'purchase.duckdb');
    const api = yaml('api/purchase-orders.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_purchase_bills');
    try {
      const first = await repositoryForTest(databasePath);
      await first.repository.executeMutation(action.mutation, { selectedIds: ['po-demo-005'] });
      expect(await first.repository.query("SELECT purchase_order_id, invoice_number, state FROM purchase_vendor_bills WHERE purchase_order_id = 'po-demo-005'"))
        .toEqual([{ purchase_order_id: 'po-demo-005', invoice_number: 'BILL/PO/2026/0005', state: 'Draft' }]);
      await first.database.close();
      await first.accountingDatabase.close();

      const second = await repositoryForTest(databasePath);
      expect(await second.repository.query("SELECT purchase_order_id, invoice_number, state FROM purchase_vendor_bills WHERE purchase_order_id = 'po-demo-005'"))
        .toEqual([{ purchase_order_id: 'po-demo-005', invoice_number: 'BILL/PO/2026/0005', state: 'Draft' }]);
      await expect(second.repository.executeMutation(action.mutation, { selectedIds: ['po-demo-005'] })).rejects.toMatchObject({
        status: 409, code: 'PURCHASE_BILL_SELECTION_INVALID',
      });
      await second.database.close();
      await second.accountingDatabase.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
