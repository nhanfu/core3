import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function migrated(databasePath = ':memory:', migrationName = `accounting_invoice_payment_block_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Accounting invoice payment block parity', () => {
  test('maps Odoo action_toggle_block_payment to the page/API action', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const sourceAction = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const toggle = action(api, 'toggle_accounting_invoice_payment_block');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('invoice-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'toggle_accounting_invoice_payment_block', label: '(Un)Block Payment', permission: 'accounting.write' }));
    expect(toggle).toMatchObject({ type: 'server', permission: 'accounting.write', action: 'accounting.invoices.toggle_payment_block', handler: 'yaml_mutation', operation: 'toggle_payment_block' });
    expect(toggle.mutation.concurrency).toEqual({ required: true });
    expect(toggle.mutation.steps[0].query).toContain("CASE WHEN payment_state = 'blocked' THEN 'not_paid' ELSE 'blocked' END");
    expect(sourceAction).toContain('<field name="name">(Un)Block Payment</field>');
    expect(sourceAction).toContain('records.action_toggle_block_payment()');
    expect(sourceModel).toContain('def action_toggle_block_payment(self):');
    expect(sourceModel).toContain("if self.payment_state == 'blocked':");
    expect(sourceModel).toContain("if self.payment_state in ('paid', 'in_payment'):");
  });

  test('toggles the durable state, rejects paid/stale/missing entries, and keeps the update atomic', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-payment-block-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_invoice_payment_block_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await migrated(databasePath, migrationName);
    try {
      const api = yaml('api/invoice-detail.yaml');
      const toggle = action(api, 'toggle_accounting_invoice_payment_block');
      expect(await first.repository.query("SELECT payment_state FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'")).toEqual([{ payment_state: 'not_paid' }]);

      expect(await first.repository.executeMutation(toggle.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1 })).toMatchObject({
        id: 'accounting-invoice-demo-001', row_version: 2, payment_state: 'blocked', state: 'Posted', amount_residual: 1650,
      });
      expect(await first.repository.executeMutation(toggle.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 2 })).toMatchObject({ payment_state: 'not_paid', row_version: 3 });
      await expect(first.repository.executeMutation(toggle.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_PAYMENT_BLOCK_UNAVAILABLE' });
      await expect(first.repository.executeMutation(toggle.mutation, { id: 'missing-invoice', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_INVOICE_PAYMENT_BLOCK_NOT_FOUND' });

      await first.repository.run("UPDATE accounting_invoices SET payment_state = 'paid', row_version = 5 WHERE id = 'accounting-invoice-demo-001'");
      await expect(first.repository.executeMutation(toggle.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 5 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_PAYMENT_BLOCK_UNAVAILABLE' });
      expect(await first.repository.query("SELECT payment_state, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'")).toEqual([{ payment_state: 'paid', row_version: 5 }]);
    } finally {
      await first.database.close();
    }

    const second = await migrated(databasePath, migrationName);
    try {
      expect(await second.repository.query("SELECT payment_state, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'")).toEqual([{ payment_state: 'paid', row_version: 5 }]);
      const api = yaml('api/invoice-detail.yaml');
      const user: any = { sub: 'accounting-reader', name: 'Accounting Reader', permissions: [] };
      const apiHandler = createYamlApi({
        repository: second.repository,
        authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map([...api.datasources, ...yaml('pages/invoices.yaml').datasources].map((candidate: any) => [candidate.id, candidate])),
        pageSources: new Map(), pages: new Map([['invoice-detail', { actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map([['accounting_invoices', yaml('pages/invoices-workflow.yaml').workflow]]), workflowFiles: new Map(),
        permissions: { permissions: ['accounting.read', 'accounting.write'], tables: {}, endpoints: {} }, uploadRoot: `/tmp/core3-accounting-invoice-payment-block-files-${crypto.randomUUID()}`, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(apiHandler(new Request('http://accounting.test/api/actions/accounting.invoices.toggle_payment_block', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'accounting-invoice-demo-001', expected_row_version: 5 }) }), new URL('http://accounting.test/api/actions/accounting.invoices.toggle_payment_block'))).rejects.toMatchObject({ status: 403 });
    } finally {
      await second.database.close();
      rmSync(databasePath, { force: true });
    }
  });
});
