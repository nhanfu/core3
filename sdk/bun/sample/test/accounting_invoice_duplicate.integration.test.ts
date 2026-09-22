import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `accounting_invoice_duplicate_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Accounting invoice Duplicate parity', () => {
  test('maps Odoo action_duplicate and copy behavior to the page/API action menu', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const duplicate = action(api, 'duplicate_accounting_invoice');
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.action_menu.actions).toContainEqual(expect.objectContaining({ id: 'duplicate_accounting_invoice', label: 'Duplicate', permission: 'accounting.write' }));
    expect(duplicate).toMatchObject({ type: 'server', permission: 'accounting.write', action: 'accounting.invoices.duplicate', handler: 'yaml_mutation', operation: 'duplicate' });
    expect(duplicate.mutation).toMatchObject({ table: 'accounting_invoices', generated: ['duplicate_id'] });
    expect(duplicate.mutation.steps[0].query).toContain("state, reference, source_service");
    expect(duplicate.mutation.steps[0].query).toContain("'Draft'");
    expect(duplicate.mutation.steps[1].query).toContain("'accounting.invoices.duplicate'");
    expect(sourceView).toContain('<form string="Account Entry"');
    expect(sourceModel).toContain('def action_duplicate(self):');
    expect(sourceModel).toContain("action['res_id'] = self.copy().id");
    expect(sourceModel).toContain("This entry has been duplicated from %s");
    expect(sourceModel).toContain("invoice_date = fields.Date(");
    expect(sourceModel).toContain("copy=False");
  });

  test('duplicates an unchanged invoice as a new draft with reset lifecycle fields and origin message', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/invoice-detail.yaml');
      const detail = api.datasources.find((source: any) => source.id === 'accounting_invoice_detail');
      const duplicate = action(api, 'duplicate_accounting_invoice');
      expect((await repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Posted', row_version: 1, amount_total: 1650 });
      await expect(repository.executeMutation(duplicate.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'ACCOUNTING_INVOICE_DUPLICATE_ACTOR_REQUIRED' });

      const copy = await repository.executeMutation(duplicate.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Accounting QA' });
      expect(copy).toMatchObject({
        id: 'accounting-invoice-copy-accounting-invoice-demo-001-1',
        row_version: 1,
        name: 'INV/2026/0001 (copy)',
        partner_name: 'Gemini Furniture',
        invoice_type: 'Customer Invoice',
        state: 'Draft',
        amount_total: 1650,
        amount_residual: 1650,
        reference: null,
        source_service: null,
        checked: false,
        payment_state: 'not_paid',
        locked: false,
      });
      expect(await repository.query("SELECT invoice_id, actor_name, action, action_label, detail FROM accounting_invoice_messages WHERE invoice_id = 'accounting-invoice-copy-accounting-invoice-demo-001-1'")).toEqual([{
        invoice_id: 'accounting-invoice-copy-accounting-invoice-demo-001-1',
        actor_name: 'Accounting QA',
        action: 'accounting.invoices.duplicate',
        action_label: 'Duplicated',
        detail: 'This invoice was duplicated from INV/2026/0001.',
      }]);

      await expect(repository.executeMutation(duplicate.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 2, current_user_name: 'Accounting QA' })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_DUPLICATE_STALE' });
      expect(await repository.executeMutation(duplicate.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Accounting QA' })).toMatchObject({ id: 'accounting-invoice-copy-accounting-invoice-demo-001-2' });
      await expect(repository.executeMutation(duplicate.mutation, { id: 'missing-invoice', expected_row_version: 1, current_user_name: 'Accounting QA' })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_INVOICE_DUPLICATE_NOT_FOUND' });
    } finally {
      await database.close();
    }
  });

  test('keeps duplicated records and idempotent migration state across restart', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-accounting-invoice-duplicate-'));
    const databasePath = join(tempDir, 'accounting.duckdb');
    const migrationName = `accounting_invoice_duplicate_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      const duplicate = action(yaml('api/invoice-detail.yaml'), 'duplicate_accounting_invoice');
      await first.repository.executeMutation(duplicate.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Restart Operator' });
      await first.database.close();

      const second = await openRepository(databasePath, migrationName);
      try {
        expect(await second.repository.query("SELECT id, state, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-copy-accounting-invoice-demo-001-1'")).toEqual([{ id: 'accounting-invoice-copy-accounting-invoice-demo-001-1', state: 'Draft', row_version: 1 }]);
        await migrateDatabase(second.repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
        expect(await second.repository.query("SELECT COUNT(*) AS count FROM accounting_invoices WHERE id LIKE 'accounting-invoice-copy-accounting-invoice-demo-001-%'")).toEqual([{ count: 1 }]);
      } finally {
        await second.database.close();
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
