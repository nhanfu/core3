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

async function migrated(databasePath = ':memory:', migrationName = `accounting_invoice_cancel_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Accounting invoice Cancel parity', () => {
  test('maps Odoo button_cancel to the page/API detail action and draft-only contract', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const list = yaml('pages/invoices.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const workflow = yaml('pages/invoices-workflow.yaml').workflow;
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const listView = list.components.find((candidate: any) => candidate.type === 'ListView');
    const transition = workflow.transitions.find((candidate: any) => candidate.id === 'cancel');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('invoice-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'cancel_accounting_invoice_detail', label: 'Cancel', permission: 'accounting.write' }));
    expect(action(api, 'cancel_accounting_invoice_detail')).toMatchObject({
      type: 'server', permission: 'accounting.write', action: 'accounting.invoices.cancel', handler: 'order_transition', workflow: 'accounting_invoices', operation: 'cancel',
    });
    expect(action(api, 'cancel_accounting_invoice_detail').params).toEqual({ id: '{state.accounting_invoice_detail.id}', expected_row_version: '{state.accounting_invoice_detail.row_version}' });
    expect(listView.actions).toContainEqual(expect.objectContaining({ id: 'cancel_accounting_invoice', show_if: "row.state === 'Draft' && row.invoice_type !== 'Journal Entry'" }));
    expect(transition).toMatchObject({ id: 'cancel', from: ['Draft'], to: 'Cancelled', permission: 'accounting.write' });
    expect(transition.mutation).toMatchObject({ concurrency: { required: true } });
    expect(transition.mutation.guards[0].query).toContain("state = 'Draft'");
    expect(transition.mutation.guards[0].query).toContain('row_version = :expected_row_version');
    expect(sourceView).toContain('name="button_cancel" string="Cancel" type="object"');
    expect(sourceModel).toContain('def button_cancel(self):');
    expect(sourceModel).toContain("self.write({'auto_post': 'no', 'state': 'cancel'})");
  });

  test('cancels a draft invoice durably and rejects posted, paid, stale, and unauthorized requests', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-cancel-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_invoice_cancel_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await migrated(databasePath, migrationName);
    try {
      await first.repository.run("UPDATE accounting_invoices SET state = 'Draft', row_version = 4 WHERE id = 'accounting-invoice-demo-001'");
      const workflow = yaml('pages/invoices-workflow.yaml').workflow;
      const transition = workflow.transitions.find((candidate: any) => candidate.id === 'cancel');
      const cancelled = await first.repository.executeMutation(transition.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 4 });
      expect(cancelled).toMatchObject({ id: 'accounting-invoice-demo-001', state: 'Cancelled', row_version: 5 });
      await expect(first.repository.executeMutation(transition.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 5 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_CANCEL_UNAVAILABLE' });
      await expect(first.repository.executeMutation(transition.mutation, { id: 'accounting-invoice-demo-002', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_CANCEL_UNAVAILABLE' });
      await first.repository.run("UPDATE accounting_invoices SET state = 'Draft', row_version = 8 WHERE id = 'accounting-invoice-demo-001'");
      await expect(first.repository.executeMutation(transition.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 7 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_CANCEL_UNAVAILABLE' });

      const api = yaml('api/invoice-detail.yaml');
      const user: any = { sub: 'accounting-reader', name: 'Accounting Reader', permissions: [] };
      const apiHandler = createYamlApi({
        repository: first.repository,
        authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map([...api.datasources, ...yaml('pages/invoices.yaml').datasources].map((candidate: any) => [candidate.id, candidate])), pageSources: new Map(), pages: new Map([['invoice-detail', { actions: api.actions }]]),
        catalogs: new Map(), menus: new Map(), workflows: new Map([['accounting_invoices', yaml('pages/invoices-workflow.yaml').workflow]]), workflowFiles: new Map(),
        permissions: { permissions: ['accounting.read', 'accounting.write'], tables: {}, endpoints: {} }, uploadRoot: `/tmp/core3-accounting-invoice-cancel-files-${crypto.randomUUID()}`,
        eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(apiHandler(new Request('http://accounting.test/api/actions/accounting.invoices.cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'accounting-invoice-demo-001', expected_row_version: 8 }) }), new URL('http://accounting.test/api/actions/accounting.invoices.cancel'))).rejects.toMatchObject({ status: 403 });
    } finally {
      await first.database.close();
    }

    const second = await migrated(databasePath, migrationName);
    try {
      expect(await second.repository.query("SELECT state, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'")).toEqual([{ state: 'Draft', row_version: 8 }]);
    } finally {
      await second.database.close();
      rmSync(databasePath, { force: true });
    }
  });
});
