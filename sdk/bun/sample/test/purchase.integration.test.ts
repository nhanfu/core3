import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiSource = (file: string, id: string) => yaml(`api/${file}`).datasources.find((source: any) => source.id === id);

describe('Purchase Orders list and detail parity', () => {
  test('keeps the list/detail pages layout-only and owned by page-id API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const screens = [
      ['pages/purchase-orders.yaml', 'purchase-orders', 'purchase-orders.yaml', 'purchase_orders'],
      ['pages/purchase-detail.yaml', 'purchase-detail', 'purchase-detail.yaml', 'purchase_order_detail'],
    ] as const;

    for (const [pageFile, pageId, apiFile, sourceId] of screens) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.auth.require, pageFile).toEqual(['purchase.read']);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
      expect(yaml(`api/${apiFile}`).page.id, apiFile).toBe(pageId);
    }

    const list = yaml('pages/purchase-orders.yaml').components.find((component: any) => component.type === 'ListView');
    expect(list).toMatchObject({ source: 'purchase_orders', row_open_action: 'view_purchase_order', empty_state: { title: 'No purchase orders' } });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'calendar', 'pivot', 'graph', 'activity']);
    expect(list.views.filter((view: any) => view.mobile === false).map((view: any) => view.id)).toEqual(['list', 'calendar', 'pivot', 'graph', 'activity']);
    expect(yaml('pages/purchase-orders.yaml').actions.find((action: any) => action.id === 'view_purchase_order')).toMatchObject({ navigate_to: '/purchase/detail', permission: 'purchase.read' });
  });

  test('returns deterministic purchase-order search, empty, and detail fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_parity_test_schema_migrations', ['schema', 'data']);

    const orders = apiSource('purchase-orders.yaml', 'purchase_orders');
    const defaultOrders = await repository.querySource(orders, { q: null, state: null, vendor_id: null, fixture_state: null }, 0, 50);
    expect(defaultOrders.data.map((row: any) => row.id)).toEqual(['po-demo-005', 'po-demo-006', 'po-demo-007', 'po-demo-003']);
    expect(defaultOrders.data.every((row: any) => row.order_type === undefined || row.order_type === 'purchase')).toBe(true);
    expect(defaultOrders.data.map((row: any) => row.total_amount)).toEqual([1350, 3360, 555, 2220]);

    const searched = await repository.querySource(orders, { q: 'Warehouse', state: null, vendor_id: null, fixture_state: null }, 0, 50);
    expect(searched.data.map((row: any) => row.id)).toEqual(['po-demo-005']);
    const received = await repository.querySource(orders, { q: null, state: 'Received', vendor_id: null, fixture_state: null }, 0, 50);
    expect(received.data.map((row: any) => row.id)).toEqual(['po-demo-006']);
    const empty = await repository.querySource(orders, { q: null, state: null, vendor_id: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);

    const detail = apiSource('purchase-detail.yaml', 'purchase_order_detail');
    const detailRow = await repository.querySource(detail, { id: 'po-demo-005', fixture_state: null }, 0, 1);
    expect(detailRow.data).toMatchObject({ id: 'po-demo-005', name: 'PO/2026/0005', state: 'Confirmed', vendor_name: 'Northwind Components', expected_arrival: '2026-09-16' });
    const missing = await repository.querySource(detail, { id: 'does-not-exist', fixture_state: 'not_found' }, 0, 1);
    expect(missing.data).toEqual({});
  });

  test('keeps Purchase read/write/manage permission boundaries explicit', () => {
    for (const file of ['api/purchase-orders.yaml', 'api/purchase-detail.yaml']) {
      for (const source of yaml(file).datasources) expect(source.permission, file).toBe('purchase.read');
    }
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['purchase.read', 'purchase.write', 'purchase.manage']));
    const workflow = yaml('pages/purchase-workflow.yaml').workflow;
    expect(workflow.permission).toBe('purchase.write');
    expect(workflow.transitions.every((transition: any) => transition.mutation.guards?.[0]?.status === 409)).toBe(true);
    expect(yaml('pages/purchase-orders.yaml').page.auth.require).toEqual(['purchase.read']);
    expect(yaml('pages/purchase-detail.yaml').page.auth.require).toEqual(['purchase.read']);
  });
});
