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
  await migrateDatabase(repository, join(root, 'migrations'), undefined, `purchase_bill_upload_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository, accountingDatabase, accountingRepository };
}

const input = {
  id: 'po-demo-007',
  expected_row_version: 1,
  attachment_id: 'purchase-bill-upload-test-001',
  fileName: 'BILL-2026-0007.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  storageKey: 'purchase-bills/BILL-2026-0007.pdf',
  current_user_id: 'user-purchase',
  current_user_name: 'Purchase User',
};

function action() {
  return yaml('api/purchase-detail.yaml').actions.find((candidate: any) => candidate.id === 'upload_purchase_bill');
}

describe('Purchase Upload Bill parity slice', () => {
  test('binds the Odoo widget to the Purchase page/API and durable attachment source', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const upload = action();
    const attachments = api.datasources.find((source: any) => source.id === 'purchase_order_bill_uploads');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('purchase-detail');
    expect(api.page.id).toBe('purchase-detail');
    expect(discovered.pageDatasources.get('purchase-detail')).toContain('purchase_order_bill_uploads');
    expect(form).toMatchObject({
      attachment_source: 'purchase_order_bill_uploads',
      attachment_upload_action: 'upload_purchase_bill',
      add_attachment_label: 'Upload Bill',
    });
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'upload_purchase_bill', label: 'Upload Bill', permission: 'purchase.write' }));
    expect(upload).toMatchObject({
      type: 'upload', permission: 'purchase.write', kind: 'purchase_bill_attachment',
      action: 'purchase.orders.bill.upload', handler: 'attachment_metadata',
    });
    expect(upload.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'PURCHASE_ORDER_BILL_UPLOAD_NOT_FOUND',
      'PURCHASE_ORDER_BILL_UPLOAD_STALE',
      'PURCHASE_ORDER_BILL_UPLOAD_ALREADY_BILLED',
      'PURCHASE_ORDER_BILL_UPLOAD_INVALID',
      'PURCHASE_ORDER_BILL_UPLOAD_ACTOR_REQUIRED',
    ]);
    expect(attachments.query).toContain('purchase_order_bill_uploads');
    expect(Bun.YAML.parse(readFileSync(join(root, 'storage.yaml'), 'utf8'))).toMatchObject({
      attachments: { purchase_bill_attachment: { download: { route: '/api/purchase/bill-attachments' } } },
    });
  });

  test('uploads a bill, creates the Accounting vendor bill, and refreshes Purchase billing state', async () => {
    const { database, repository, accountingDatabase, accountingRepository } = await repositoryForTest();
    try {
      const created = await repository.executeMutation(action().mutation, input) as any;
      expect(created).toMatchObject({
        id: input.attachment_id,
        purchase_order_id: input.id,
        invoice_number: 'BILL/UPLOAD/PO/2026/0007',
        file_name: input.fileName,
        uploaded_by: input.current_user_id,
        state: 'Draft',
      });
      expect(await repository.query("SELECT purchase_order_id, accounting_invoice_id, invoice_number, row_version FROM purchase_order_bill_uploads WHERE id = ?", [input.attachment_id]))
        .toEqual([{ purchase_order_id: input.id, accounting_invoice_id: expect.any(String), invoice_number: 'BILL/UPLOAD/PO/2026/0007', row_version: 1 }]);
      expect(await repository.query("SELECT purchase_order_id, invoice_number, state, amount FROM purchase_vendor_bills WHERE purchase_order_id = 'po-demo-007'"))
        .toEqual([{ purchase_order_id: 'po-demo-007', invoice_number: 'BILL/UPLOAD/PO/2026/0007', state: 'Draft', amount: 555 }]);
      expect(await accountingRepository.query("SELECT invoice_type, state, amount_total, source_type, source_id FROM accounting_invoices WHERE source_type = 'purchase_order_upload'"))
        .toEqual([{ invoice_type: 'Vendor Bill', state: 'Draft', amount_total: 555, source_type: 'purchase_order_upload', source_id: 'purchase-bill-upload-po-demo-007-' + input.attachment_id }]);
      expect(await repository.query("SELECT state, row_version FROM purchase_orders WHERE id = 'po-demo-007'"))
        .toEqual([{ state: 'Confirmed', row_version: 2 }]);
      const detail = yaml('api/purchase-detail.yaml').datasources.find((source: any) => source.id === 'purchase_order_detail');
      expect(await repository.querySource(detail, { id: input.id, fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ billing_status: 'Invoiced', vendor_bill_count: 1, row_version: 2 }) });
    } finally {
      await database.close();
      await accountingDatabase.close();
    }
  }, 30000);

  test('rejects missing, stale, ineligible, invalid-file, duplicate, and anonymous uploads atomically', async () => {
    const { database, repository, accountingDatabase } = await repositoryForTest();
    try {
      await expect(repository.executeMutation(action().mutation, { ...input, id: 'missing-purchase-order' })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_ORDER_BILL_UPLOAD_NOT_FOUND' });
      await expect(repository.executeMutation(action().mutation, { ...input, id: 'po-demo-007', expected_row_version: 9 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_BILL_UPLOAD_STALE' });
      await expect(repository.executeMutation(action().mutation, { ...input, id: 'po-demo-001' })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_BILL_UPLOAD_STALE' });
      await expect(repository.executeMutation(action().mutation, { ...input, fileName: '', sizeBytes: 0 })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_BILL_UPLOAD_INVALID' });
      await expect(repository.executeMutation(action().mutation, { ...input, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'PURCHASE_ORDER_BILL_UPLOAD_ACTOR_REQUIRED' });
      await repository.executeMutation(action().mutation, input);
      await expect(repository.executeMutation(action().mutation, { ...input, attachment_id: 'purchase-bill-upload-test-002', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_BILL_UPLOAD_ALREADY_BILLED' });
      expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_order_bill_uploads WHERE purchase_order_id = 'po-demo-007'"))
        .toEqual([{ count: 1 }]);
    } finally {
      await database.close();
      await accountingDatabase.close();
    }
  }, 30000);

  test('does not leave a Purchase attachment or bill link when Accounting rejects the upload', async () => {
    const { database, repository, accountingDatabase } = await repositoryForTest(':memory:', async () => {
      throw { status: 503, code: 'ACCOUNTING_UNAVAILABLE', message: 'Accounting service is unavailable' };
    });
    try {
      await expect(repository.executeMutation(action().mutation, input)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_UNAVAILABLE' });
      expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_order_bill_uploads WHERE purchase_order_id = 'po-demo-007'"))
        .toEqual([{ count: 0 }]);
      expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_vendor_bills WHERE purchase_order_id = 'po-demo-007'"))
        .toEqual([{ count: 0 }]);
    } finally {
      await database.close();
      await accountingDatabase.close();
    }
  });

  test('keeps the uploaded bill link after a file-backed restart and migration replay', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-purchase-bill-upload-'));
    const databasePath = join(tempDir, 'purchase.duckdb');
    try {
      const first = await repositoryForTest(databasePath);
      await first.repository.executeMutation(action().mutation, input);
      await first.database.close();
      await first.accountingDatabase.close();

      const second = await repositoryForTest(databasePath);
      expect(await second.repository.query("SELECT purchase_order_id, file_name, invoice_number FROM purchase_order_bill_uploads WHERE id = ?", [input.attachment_id]))
        .toEqual([{ purchase_order_id: 'po-demo-007', file_name: input.fileName, invoice_number: 'BILL/UPLOAD/PO/2026/0007' }]);
      await migrateDatabase(second.repository, join(root, 'migrations'), undefined, `purchase_bill_upload_replay_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
      expect(await second.repository.query("SELECT COUNT(*) AS count FROM purchase_order_bill_uploads WHERE id = ?", [input.attachment_id]))
        .toEqual([{ count: 1 }]);
      await second.database.close();
      await second.accountingDatabase.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
