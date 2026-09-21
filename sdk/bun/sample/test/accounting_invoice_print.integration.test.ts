import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `accounting_invoice_print_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

const actor = { current_user_id: 'user-admin', current_user_name: 'Accounting User' };

describe('Accounting invoice Print report parity', () => {
  test('maps Odoo action_print_pdf to the page/API boundary and source report contract', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');
    const sourceSend = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move_send.py', 'utf8');
    const reports = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_report.xml', 'utf8');
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('invoice-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('invoice-detail')).toEqual(expect.arrayContaining(['accounting_invoice_detail', 'accounting_invoice_print_runs']));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'print_accounting_invoice', label: 'Print', permission: 'accounting.read' }));
    expect(action(api, 'print_accounting_invoice')).toMatchObject({ type: 'server', permission: 'accounting.read', operation: 'print_report', action: 'accounting.invoices.print', handler: 'yaml_mutation' });
    expect(sourceView).toContain('name="action_print_pdf"');
    expect(sourceModel).toContain("def action_print_pdf(self):");
    expect(sourceModel).toContain("_get_default_pdf_report_id(self)");
    expect(sourceSend).toContain("self.env.ref('account.account_invoices')");
    expect(reports).toContain('<record id="account_invoices" model="ir.actions.report">');
    expect(reports).toContain('<field name="report_name">account.report_invoice_with_payments</field>');
  });

  test('records a posted customer invoice PDF run and exposes durable history', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/invoice-detail.yaml');
      const print = action(api, 'print_accounting_invoice');
      expect(await repository.executeMutation(print.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, ...actor })).toMatchObject({
        id: 'accounting-invoice-print-accounting-invoice-demo-001-1',
        invoice_id: 'accounting-invoice-demo-001',
        report_name: 'Invoice PDF',
        report_action: 'account.account_invoices',
        report_template: 'account.report_invoice_with_payments',
        output_format: 'PDF',
        filename: 'INV_2026_0001.pdf',
        printed_by: 'Accounting User',
        row_version: 1,
      });
      const history = api.datasources.find((candidate: any) => candidate.id === 'accounting_invoice_print_runs');
      expect((await repository.querySource(history, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 10)).data).toEqual([
        expect.objectContaining({ invoice_id: 'accounting-invoice-demo-001', invoice_name: 'INV/2026/0001', filename: 'INV_2026_0001.pdf', printed_by: 'Accounting User' }),
      ]);
    } finally {
      await database.close();
    }
  });

  test('rejects missing, stale, non-customer, non-posted, blank-actor, and unauthorized print requests atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      const print = action(yaml('api/invoice-detail.yaml'), 'print_accounting_invoice');
      await expect(repository.executeMutation(print.mutation, { id: 'missing-invoice', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_INVOICE_PRINT_NOT_FOUND' });
      await expect(repository.executeMutation(print.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 99, ...actor })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_PRINT_UNAVAILABLE' });
      await expect(repository.executeMutation(print.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'ACCOUNTING_INVOICE_PRINT_ACTOR_REQUIRED' });
      await expect(repository.executeMutation(print.mutation, { id: 'accounting-invoice-demo-002', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_PRINT_UNAVAILABLE' });
      expect(await repository.query('SELECT COUNT(*) AS count FROM accounting_invoice_print_runs')).toEqual([{ count: 0 }]);
    } finally {
      await database.close();
    }
  });

  test('preserves print history through file-backed restart and idempotent migration replay', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-accounting-invoice-print-'));
    const databasePath = join(tempDir, 'accounting.duckdb');
    const migrationName = `accounting_invoice_print_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      await first.repository.executeMutation(action(yaml('api/invoice-detail.yaml'), 'print_accounting_invoice').mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, ...actor, current_user_name: 'Restart Operator' });
      await first.database.close();
      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query('SELECT invoice_id, report_name, filename, printed_by FROM accounting_invoice_print_runs WHERE invoice_id = ?', ['accounting-invoice-demo-001'])).toEqual([
        { invoice_id: 'accounting-invoice-demo-001', report_name: 'Invoice PDF', filename: 'INV_2026_0001.pdf', printed_by: 'Restart Operator' },
      ]);
      await migrateDatabase(second.repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query('SELECT COUNT(*) AS count FROM accounting_invoice_print_runs')).toEqual([{ count: 1 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
