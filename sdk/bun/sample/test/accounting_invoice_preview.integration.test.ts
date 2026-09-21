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

describe('Accounting invoice Preview parity', () => {
  test('maps Odoo preview_invoice to a page/API-bound posted customer preview', () => {
    const detailPage = yaml('pages/invoice-detail.yaml');
    const detailApi = yaml('api/invoice-detail.yaml');
    const previewPage = yaml('pages/invoice-preview.yaml');
    const previewApi = yaml('api/invoice-preview.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(previewApi.page.id).toBe(previewPage.page.id);
    expect(previewApi.datasources.map((source: any) => source.id)).toContain('accounting_invoice_preview');
    expect(() => validatePageDefinition(previewApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...previewPage, actions: previewApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'preview_accounting_invoice', label: 'Preview', permission: 'accounting.read' }));
    expect(detailApi.actions).toContainEqual(expect.objectContaining({ id: 'preview_accounting_invoice', type: 'navigate', navigate_to: '/accounting/invoice-preview' }));
    expect(previewPage.components[1]).toMatchObject({ type: 'OdooFormView', source: 'accounting_invoice_preview', editable: false });
    expect(source).toContain('def preview_invoice(self):');
    expect(source).toContain("'url': self.get_portal_url()");
    expect(view).toContain('name="preview_invoice"');
    expect(view).toContain('string="Preview"');
  });

  test('reads only posted customer invoices and retains the preview after restart', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-preview-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_invoice_preview_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const previewApi = yaml('api/invoice-preview.yaml');
    const source = previewApi.datasources[0];
    try {
      expect(await repository.querySource(source, { id: 'accounting-invoice-demo-001' }, 0, 1)).toMatchObject({
        data: expect.objectContaining({ name: 'INV/2026/0001', invoice_type: 'Customer Invoice', portal_document_label: 'Invoice', amount_total: 1650 }),
      });
      expect((await repository.querySource(source, { id: 'accounting-invoice-demo-002' }, 0, 1)).data).toEqual({});
      await database.close();

      const reopened = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopened);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await reopenedRepository.querySource(source, { id: 'accounting-invoice-demo-001' }, 0, 1)).toMatchObject({
        data: expect.objectContaining({ name: 'INV/2026/0001', portal_payment_state: 'Open' }),
      });
      await reopened.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });

  test('enforces the accounting.read boundary on preview queries and actions', async () => {
    const page = yaml('pages/invoice-preview.yaml');
    const apiDocument = yaml('api/invoice-preview.yaml');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `accounting_invoice_preview_permissions_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const user: any = { sub: 'preview-user', name: 'Preview User', permissions: [] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(apiDocument.datasources.map((item: any) => [item.id, item])), pageSources: new Map(), pages: new Map([['invoice-preview', { actions: apiDocument.actions }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['accounting.read'], tables: {}, endpoints: {} },
      uploadRoot: `/tmp/core3-accounting-invoice-preview-files-${crypto.randomUUID()}`, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    try {
      await expect(api(new Request('http://accounting.test/api/query', { method: 'POST', body: JSON.stringify({ sourceId: 'accounting_invoice_preview', params: { id: 'accounting-invoice-demo-001' } }) }), new URL('http://accounting.test/api/query'))).rejects.toMatchObject({ status: 403 });
      expect(page.page.auth.require).toEqual(['accounting.read']);
    } finally {
      await database.close();
    }
  });
});
