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

async function migrated(databasePath = ':memory:', migrationName = `accounting_invoice_reset_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

const source = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Accounting invoice Reset to Draft parity', () => {
  test('maps Odoo button_draft to the page/API workflow boundary', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const workflow = yaml('pages/invoices-workflow.yaml').workflow;
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('invoice-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'reset_accounting_invoice_to_draft', label: 'Reset to Draft', permission: 'accounting.write' }));
    expect(source(api, 'reset_accounting_invoice_to_draft')).toMatchObject({
      type: 'server', permission: 'accounting.write', action: 'accounting.invoices.reset_to_draft', handler: 'order_transition', workflow: 'accounting_invoices', operation: 'reset_to_draft',
    });
    expect(workflow.transitions).toContainEqual(expect.objectContaining({ id: 'reset_to_draft', from: ['Posted', 'Cancelled'], to: 'Draft', permission: 'accounting.write' }));
    expect(sourceView).toContain('name="button_draft" string="Reset to Draft" type="object"');
    expect(sourceModel).toContain('def button_draft(self):');
  });

  test('resets posted and cancelled invoices, rejects stale/paid states, and persists after restart', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-reset-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_invoice_reset_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await migrated(databasePath, migrationName);
    try {
      const api = yaml('api/invoice-detail.yaml');
      const transition = yaml('pages/invoices-workflow.yaml').workflow.transitions.find((candidate: any) => candidate.id === 'reset_to_draft');
      const detail = api.datasources.find((candidate: any) => candidate.id === 'accounting_invoice_detail');
      const reset = source(api, 'reset_accounting_invoice_to_draft');
      expect((await first.repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Posted', row_version: 1 });

      const resetPosted = await first.repository.executeMutation(transition.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 1 });
      expect(resetPosted).toMatchObject({ id: 'accounting-invoice-demo-001', state: 'Draft', row_version: 2 });
    } finally {
      await first.database.close();
    }

    const second = await migrated(databasePath, migrationName);
    try {
      const api = yaml('api/invoice-detail.yaml');
      const transition = yaml('pages/invoices-workflow.yaml').workflow.transitions.find((candidate: any) => candidate.id === 'reset_to_draft');
      const reset = source(api, 'reset_accounting_invoice_to_draft');
      const row = await second.repository.query("SELECT state, row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'");
      expect(row).toEqual([{ state: 'Draft', row_version: 2 }]);
      await second.repository.run("UPDATE accounting_invoices SET state = 'Cancelled', row_version = 7 WHERE id = 'accounting-invoice-demo-001'");
      expect(await second.repository.executeMutation(transition.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 7 })).toMatchObject({ state: 'Draft', row_version: 8 });
      await expect(second.repository.executeMutation(transition.mutation, { id: 'accounting-invoice-demo-001', expected_row_version: 7 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_RESET_UNAVAILABLE' });
      await expect(second.repository.executeMutation(transition.mutation, { id: 'accounting-invoice-demo-002', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_RESET_UNAVAILABLE' });
      expect(resetActionGuards(api, reset)).toBe(true);
      const actor: any = { sub: 'accounting-reader', name: 'Accounting Reader', permissions: [] };
      const apiHandler = createYamlApi({
        repository: second.repository,
        authProvider: { async getCurrentUser() { return actor; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map([...api.datasources, ...yaml('pages/invoices.yaml').datasources].map((candidate: any) => [candidate.id, candidate])),
        pageSources: new Map(),
        pages: new Map([['invoice-detail', { actions: api.actions }]]),
        catalogs: new Map(),
        menus: new Map(),
        workflows: new Map([['accounting_invoices', yaml('pages/invoices-workflow.yaml').workflow]]),
        workflowFiles: new Map(),
        permissions: { permissions: ['accounting.read', 'accounting.write'], tables: {}, endpoints: {} },
        uploadRoot: `/tmp/core3-accounting-invoice-reset-files-${crypto.randomUUID()}`,
        eventStore: {},
        topics: {},
        storage: yaml('storage.yaml'),
      });
      await expect(apiHandler(new Request('http://accounting.test/api/actions/accounting.invoices.reset_to_draft', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'accounting-invoice-demo-001', expected_row_version: 8 }) }), new URL('http://accounting.test/api/actions/accounting.invoices.reset_to_draft'))).rejects.toMatchObject({ status: 403 });
    } finally {
      await second.database.close();
      rmSync(databasePath, { force: true });
    }
  });
});

function resetActionGuards(api: any, reset: any) {
  const workflow = yaml('pages/invoices-workflow.yaml').workflow;
  const transition = workflow.transitions.find((candidate: any) => candidate.id === 'reset_to_draft');
  return api.page.id === 'invoice-detail'
    && reset.permission === 'accounting.write'
    && transition.mutation.guards[0].query.includes("state IN ('Posted', 'Cancelled')")
    && transition.mutation.guards[0].query.includes('row_version = :expected_row_version');
}
