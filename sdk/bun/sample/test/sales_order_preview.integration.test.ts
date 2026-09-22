import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Sales order Preview parity slice', () => {
  test('maps Odoo action_preview_sale_order to a separate page/API preview contract', () => {
    const detailPage = yaml('pages/sale-order-detail.yaml');
    const detailApi = yaml('api/sale-order-detail.yaml');
    const previewPage = yaml('pages/sale-order-preview.yaml');
    const previewApi = yaml('api/sale-order-preview.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/sale/models/sale_order.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/sale/views/sale_order_views.xml', 'utf8');

    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(previewApi.page.id).toBe(previewPage.page.id);
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'preview_sale_order', label: 'Preview', permission: 'orders.read' }));
    expect(detailApi.actions).toContainEqual(expect.objectContaining({ id: 'preview_sale_order', type: 'navigate', navigate_to: '/order/sale-order/preview' }));
    expect(previewPage.components[1]).toMatchObject({ type: 'OdooFormView', source: 'sale_order_portal_preview', editable: false });
    expect(previewPage.components[2]).toMatchObject({ type: 'LineItemGrid', source: 'sale_order_portal_preview_lines' });
    expect(previewApi.actions).toContainEqual(expect.objectContaining({ id: 'back_to_sale_order', navigate_to: '/order/sale-order' }));
    expect(() => validatePageDefinition(previewApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...previewPage, actions: previewApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(source).toContain('def action_preview_sale_order(self):');
    expect(source).toContain("'url': self.get_portal_url()");
    expect(view).toContain('name="action_preview_sale_order"');
    expect(view).toContain('string="Preview"');
  });

  test('serves populated, empty, scope, and file-backed restart preview states', async () => {
    const databasePath = `/tmp/core3-sales-order-preview-${crypto.randomUUID()}.duckdb`;
    const migrationName = `sales_order_preview_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    const previewApi = yaml('api/sale-order-preview.yaml');
    const detail = previewApi.datasources.find((source: any) => source.id === 'sale_order_portal_preview');
    const lines = previewApi.datasources.find((source: any) => source.id === 'sale_order_portal_preview_lines');
    const params = { id: 'order-demo-01', view_scope: 'all', current_branch_id: 'branch-hcm' };
    try {
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      expect(await repository.querySource(detail, params, 0, 1)).toMatchObject({ data: expect.objectContaining({ order_number: 'DH-2026-0101', status_label: 'Quotation', total_amount: 18500000 }) });
      expect((await repository.querySource(lines, params, 0, 50)).data).toHaveLength(1);
      expect((await repository.querySource(detail, { ...params, id: 'missing-order' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(detail, { ...params, view_scope: 'branch', current_branch_id: 'branch-hn' }, 0, 1)).data).toEqual({});
      await database.close();

      const reopened = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopened);
      await migrateDatabase(reopenedRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      expect(await reopenedRepository.querySource(detail, params, 0, 1)).toMatchObject({ data: expect.objectContaining({ order_number: 'DH-2026-0101', customer_name: 'Công ty TNHH Minh Long' }) });
      await reopened.close();
    } finally {
      try { await database.close(); } catch (error) { void error; }
      rmSync(databasePath, { force: true });
    }
  }, 30000);
});
