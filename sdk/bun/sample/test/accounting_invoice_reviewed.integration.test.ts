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

async function openRepository(databasePath = ':memory:', migrationName = `accounting_invoice_review_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Accounting invoice Reviewed action parity', () => {
  test('maps Odoo button_set_checked to a page/API-bound permissioned action', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const review = action(api, 'review_accounting_invoice');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('invoice-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('invoice-detail')).toEqual(expect.arrayContaining(['accounting_invoice_detail']));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'review_accounting_invoice', label: 'Reviewed', permission: 'accounting.write' }));
    expect(review).toMatchObject({ type: 'server', permission: 'accounting.write', operation: 'review', action: 'accounting.invoices.review', handler: 'yaml_mutation' });
    expect(review.mutation.concurrency).toEqual({ required: true });
    expect(review.mutation.steps[0].query).toContain('checked = TRUE');
    expect(sourceView).toContain('name="button_set_checked"');
    expect(sourceView).toContain('string="Reviewed"');
    expect(sourceView).toContain("invisible=\"state != 'posted' or checked\"");
    expect(sourceModel).toContain('def button_set_checked(self):');
    expect(sourceModel).toContain('self.set_moves_checked()');
  });

  test('marks an unchanged posted invoice reviewed and rejects invalid or duplicate attempts atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/invoice-detail.yaml');
      const detail = api.datasources.find((source: any) => source.id === 'accounting_invoice_detail');
      const review = action(api, 'review_accounting_invoice');
      expect((await repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Posted', checked: false, row_version: 1 });

      expect(await repository.executeMutation(review.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1 })).toMatchObject({ id: 'accounting-invoice-demo-001', state: 'Posted', checked: true, row_version: 2 });
      await expect(repository.executeMutation(review.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_REVIEW_UNAVAILABLE' });
      await expect(repository.executeMutation(review.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_REVIEW_UNAVAILABLE' });
      await expect(repository.executeMutation(review.mutation, { id: 'accounting-invoice-demo-002', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_REVIEW_UNAVAILABLE' });
      await expect(repository.executeMutation(review.mutation, { id: 'missing-invoice', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_INVOICE_REVIEW_NOT_FOUND' });
      expect(await repository.query('SELECT id, checked, row_version FROM accounting_invoices WHERE id = ?', ['accounting-invoice-demo-001'])).toEqual([{ id: 'accounting-invoice-demo-001', checked: true, row_version: 2 }]);
    } finally {
      await database.close();
    }
  });

  test('preserves the reviewed flag through file-backed restart and idempotent migration replay', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-accounting-invoice-reviewed-'));
    const databasePath = join(tempDir, 'accounting.duckdb');
    const migrationName = `accounting_invoice_review_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      await first.repository.executeMutation(action(yaml('api/invoice-detail.yaml'), 'review_accounting_invoice').mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1 });
      await first.database.close();
      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query('SELECT checked, row_version FROM accounting_invoices WHERE id = ?', ['accounting-invoice-demo-001'])).toEqual([{ checked: true, row_version: 2 }]);
      await migrateDatabase(second.repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query('SELECT checked, row_version FROM accounting_invoices WHERE id = ?', ['accounting-invoice-demo-001'])).toEqual([{ checked: true, row_version: 2 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
