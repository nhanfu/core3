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

async function openRepository(databasePath = ':memory:', migrationName = `accounting_invoice_lock_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Accounting invoice Lock parity', () => {
  test('maps Odoo button_hash to the page/API-bound permissioned action', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const workflow = yaml('pages/invoices-workflow.yaml').workflow;
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const lock = action(api, 'lock_accounting_invoice');

    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'lock_accounting_invoice', label: 'Lock', permission: 'accounting.write' }));
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'reset_accounting_invoice_to_draft', show_if: expect.stringContaining('!state.accounting_invoice_detail.locked') }));
    expect(lock).toMatchObject({ type: 'server', permission: 'accounting.write', action: 'accounting.invoices.lock', handler: 'yaml_mutation', operation: 'lock' });
    expect(lock.mutation.concurrency).toEqual({ required: true });
    expect(lock.mutation.steps[0].query).toContain('locked = TRUE');
    expect(lock.mutation.steps[1].query).toContain('Locked journal entry');
    expect(workflow.transitions.find((transition: any) => transition.id === 'reset_to_draft').mutation.guards[0].query).toContain('COALESCE(locked, FALSE) = FALSE');
    expect(sourceView).toContain('name="button_hash" string="Lock"');
    expect(sourceView).toContain("invisible=\"not restrict_mode_hash_table or inalterable_hash or state != 'posted'\"");
    expect(sourceModel).toContain('def button_hash(self):');
    expect(sourceModel).toContain('self._hash_moves(force_hash=True)');
    expect(sourceModel).toContain('if move.inalterable_hash:');
  });

  test('locks an unchanged posted invoice atomically and rejects invalid attempts', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/invoice-detail.yaml');
      const detail = api.datasources.find((source: any) => source.id === 'accounting_invoice_detail');
      const lock = action(api, 'lock_accounting_invoice');
      expect((await repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Posted', locked: false, hash_lock_enabled: true, row_version: 1 });
      await expect(repository.executeMutation(lock.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'ACCOUNTING_INVOICE_LOCK_ACTOR_REQUIRED' });

      expect(await repository.executeMutation(lock.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Accounting QA' })).toMatchObject({
        id: 'accounting-invoice-demo-001', row_version: 2, state: 'Posted', locked: true, locked_by: 'Accounting QA',
      });
      expect(await repository.query("SELECT locked, locked_by, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'")).toMatchObject([{ locked: true, locked_by: 'Accounting QA', row_version: 2 }]);
      expect(await repository.query("SELECT action, action_label, detail FROM accounting_invoice_messages WHERE invoice_id = 'accounting-invoice-demo-001' ORDER BY created_at DESC LIMIT 1")).toEqual([{ action: 'accounting.invoices.lock', action_label: 'Locked journal entry', detail: 'This journal entry has been secured.' }]);
      await expect(repository.executeMutation(lock.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 2, current_user_name: 'Accounting QA' })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_LOCK_UNAVAILABLE' });
      await expect(repository.executeMutation(lock.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Accounting QA' })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_LOCK_UNAVAILABLE' });
      await expect(repository.executeMutation(lock.mutation, { id: 'missing-invoice', expected_row_version: 1, current_user_name: 'Accounting QA' })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_INVOICE_LOCK_NOT_FOUND' });
      await expect(repository.executeMutation(lock.mutation, { id: 'accounting-invoice-demo-002', expected_row_version: 1, current_user_name: 'Accounting QA' })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_LOCK_UNAVAILABLE' });
      expect(await repository.query("SELECT locked, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'")).toEqual([{ locked: true, row_version: 2 }]);
    } finally {
      await database.close();
    }
  });

  test('preserves the lock across restart, replay, and reset-to-draft protection', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-accounting-invoice-lock-'));
    const databasePath = join(tempDir, 'accounting.duckdb');
    const migrationName = `accounting_invoice_lock_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      const lock = action(yaml('api/invoice-detail.yaml'), 'lock_accounting_invoice');
      await first.repository.executeMutation(lock.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Restart Operator' });
      const reset = yaml('pages/invoices-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'reset_to_draft');
      await expect(first.repository.executeMutation(reset.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_RESET_UNAVAILABLE' });
      await first.database.close();

      const second = await openRepository(databasePath, migrationName);
      try {
        expect(await second.repository.query("SELECT locked, locked_by, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'")).toEqual([{ locked: true, locked_by: 'Restart Operator', row_version: 2 }]);
        await migrateDatabase(second.repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
        expect(await second.repository.query("SELECT locked, locked_by, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'")).toEqual([{ locked: true, locked_by: 'Restart Operator', row_version: 2 }]);
      } finally {
        await second.database.close();
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
