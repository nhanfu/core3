import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => yaml('api/transfer-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Inventory receipts and deliveries transfer workflow parity', () => {
  test('keeps list/detail layout and API ownership aligned with page ids and Odoo view order', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    for (const [pageFile, pageId, apiFile, apiSource] of [
      ['pages/receipts.yaml', 'receipts', 'transfers.yaml', 'inventory_receipts'],
      ['pages/deliveries.yaml', 'deliveries', 'deliveries.yaml', 'inventory_deliveries'],
      ['pages/transfer-detail.yaml', 'transfer-detail', 'transfer-detail.yaml', 'inventory_transfer_detail'],
    ] as const) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.id, pageFile).toBe(pageId);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(yaml(`api/${apiFile}`).page.id, apiFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(apiSource);
    }

    for (const file of ['pages/receipts.yaml', 'pages/deliveries.yaml']) {
      const list = yaml(file).components.find((component: any) => component.type === 'ListView');
      expect(list.view_navigation, file).toBe('tabs');
      expect(list.views.map((view: any) => view.id), file).toEqual(['list', 'kanban', 'form', 'calendar', 'activity']);
      expect(list.columns.map((column: any) => column.label), file).toEqual(['Reference', 'Contact', 'Scheduled Date', 'Source Document', 'Company', 'Status']);
      expect(list.form_view).toMatchObject({ page: 'apps/services/inventory/pages/transfer-detail.yaml', side_panel: true });
    }

    const detail = yaml('pages/transfer-detail.yaml').components.find((component: any) => component.type === 'OdooFormView');
    expect(detail.statusbar.map((state: any) => state.value)).toEqual(['Draft', 'Waiting', 'Ready', 'Done', 'Cancelled']);
    expect(detail.header_actions.map((candidate: any) => candidate.label)).toEqual(['Mark as Todo', 'Check Availability', 'Validate', 'Cancel']);
    expect(detail.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Operations', 'Additional Info', 'Note']);
    expect(Bun.YAML.parse(readFileSync(join(serviceRoot, 'manifest.yaml'), 'utf8')).menu.groups.map((group: any) => group.label)).toEqual(['Transfers', 'Procurement', 'Reporting', 'Products', 'Configuration']);
  });

  test('returns realistic deterministic fixtures and explicit empty/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_transfer_parity_test_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_transfer_parity_test_schema_migrations', ['schema', 'data']);

    const receipts = source('transfers.yaml', 'inventory_receipts');
    const deliveries = source('deliveries.yaml', 'inventory_deliveries');
    expect((await repository.querySource(receipts, { q: null, state: null, scheduled_date: null, fixture_state: null }, 0, 50)).data).toHaveLength(6);
    expect((await repository.querySource(deliveries, { q: 'WH/OUT/00008', state: null, scheduled_date: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ name: 'WH/OUT/00008', contact_name: 'Gemini Furniture, Oscar Morgan', state: 'Ready' });
    expect((await repository.querySource(receipts, { q: null, state: null, scheduled_date: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(receipts, { q: null, state: null, scheduled_date: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_TRANSFER_DATA_UNAVAILABLE' });

    const detail = source('transfer-detail.yaml', 'inventory_transfer_detail');
    const lines = source('transfer-detail.yaml', 'inventory_transfer_lines');
    const timeline = source('transfer-detail.yaml', 'inventory_transfer_timeline');
    expect(await repository.querySource(detail, { id: 'receipt-00001', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'WH/IN/00001', move_count: 2, state: 'Ready' }) });
    expect((await repository.querySource(lines, { id: 'receipt-00001', fixture_state: null }, 0, 50)).data.map((row: any) => row.product_name)).toEqual(['Desk Combination', 'Storage Box']);
    expect((await repository.querySource(timeline, { id: 'receipt-00001', fixture_state: null }, 0, 50)).data[0]).toMatchObject({ actor_name: 'OdooBot', action_label: 'Transfer created' });
    expect((await repository.querySource(detail, { id: 'receipt-00001', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(lines, { id: 'receipt-00001', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503 });
  });

  test('enforces guarded Odoo-style state transitions and optimistic concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_transfer_workflow_test_schema_migrations', ['schema', 'data']);

    await repository.executeMutation(action('mark_inventory_transfer_todo').mutation, { id: 'receipt-00003', expected_row_version: 1, current_user_name: 'Admin User' });
    await repository.executeMutation(action('check_inventory_transfer_availability').mutation, { id: 'receipt-00003', expected_row_version: 2, current_user_name: 'Admin User' });
    await expect(repository.executeMutation(action('validate_inventory_transfer').mutation, { id: 'receipt-00003', expected_row_version: 2, current_user_name: 'Admin User' })).rejects.toMatchObject({ status: 409 });
    const validated = await repository.executeMutation(action('validate_inventory_transfer').mutation, { id: 'receipt-00003', expected_row_version: 3, current_user_name: 'Admin User' }) as any;
    expect(validated).toMatchObject({ state: 'Done', row_version: 4 });
    expect((await repository.querySource(source('transfer-detail.yaml', 'inventory_transfer_lines'), { id: 'receipt-00003', fixture_state: null }, 0, 50)).data[0].quantity).toBe(18);

    await expect(repository.executeMutation(action('cancel_inventory_transfer').mutation, { id: 'receipt-00004', expected_row_version: 99 })).rejects.toMatchObject({ status: 409 });
    const cancelled = await repository.executeMutation(action('cancel_inventory_transfer').mutation, { id: 'receipt-00004', expected_row_version: 1 }) as any;
    expect(cancelled).toMatchObject({ state: 'Cancelled', row_version: 2 });
  });
});
