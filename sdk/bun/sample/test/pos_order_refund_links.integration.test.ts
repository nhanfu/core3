import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS refund relationship smart buttons', () => {
  test('keeps Odoo relationship actions and page/API contracts separate', () => {
    const detailPage = yaml('pages/pos-order-detail.yaml');
    const detailApi = yaml('api/pos-order-detail.yaml');
    const refundsPage = yaml('pages/pos-order-refund-orders.yaml');
    const refundsApi = yaml('api/pos-order-refund-orders.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_order.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_order_view.xml', 'utf8');
    const form = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const refundsHeader = form.header_actions.find((action: any) => action.id === 'open_pos_order_refunds');
    const refundedHeader = form.header_actions.find((action: any) => action.id === 'open_pos_order_refunded_order');
    const refundsAction = detailApi.actions.find((action: any) => action.id === 'open_pos_order_refunds');
    const refundedAction = detailApi.actions.find((action: any) => action.id === 'open_pos_order_refunded_order');

    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(refundsApi.page.id).toBe(refundsPage.page.id);
    expect(refundsHeader).toMatchObject({ label: 'Refunds', permission: 'pos.read', variant: 'secondary' });
    expect(refundsHeader.show_if).toContain('refund_orders_count > 0');
    expect(refundedHeader).toMatchObject({ label: 'Refunded Orders', permission: 'pos.read', variant: 'secondary' });
    expect(refundedHeader.show_if).toContain('original_order_id');
    expect(refundsAction).toMatchObject({ type: 'navigate', permission: 'pos.read', navigate_to: '/point-of-sale/refund-orders' });
    expect(refundedAction).toMatchObject({ type: 'navigate', permission: 'pos.read', navigate_to: '/point-of-sale/order-detail' });
    expect(refundsApi.datasources.find((sourceConfig: any) => sourceConfig.id === 'pos_order_refund_orders')).toMatchObject({ permission: 'pos.read' });
    expect(source).toContain('def action_view_refund_orders(self):');
    expect(source).toContain('def action_view_refunded_order(self):');
    expect(view).toContain('string="Refunds"');
    expect(view).toContain('string="Refunded Orders"');
  });

  test('projects related refunds with search, state, empty, and company boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `pos_order_refund_links_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const refundsSource = yaml('api/pos-order-refund-orders.yaml').datasources.find((sourceConfig: any) => sourceConfig.id === 'pos_order_refund_orders');
    const detailSource = yaml('api/pos-order-detail.yaml').datasources.find((sourceConfig: any) => sourceConfig.id === 'pos_order_detail');

    expect((await repository.querySource(refundsSource, { order_id: 'pos-order-refund-links-source-001', current_company_name: 'Core3 Demo Company', q: null, state: null }, 0, 50)).data)
      .toMatchObject([{ id: 'pos-order-refund-linked-001', name: 'POS/2026/09/22/REFUND-LINKS-SOURCE REFUND', state: 'New', amount_total: -12.1 }]);
    expect((await repository.querySource(refundsSource, { order_id: 'pos-order-refund-links-source-001', current_company_name: 'Core3 Demo Company', q: 'missing', state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(refundsSource, { order_id: 'pos-order-refund-links-source-001', current_company_name: 'Core3 Demo Company', q: null, state: 'Paid' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(refundsSource, { order_id: 'pos-order-refund-links-source-001', current_company_name: 'Core3 Vietnam Branch', q: null, state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(refundsSource, { order_id: 'missing-source', current_company_name: 'Core3 Demo Company', q: null, state: null }, 0, 50)).data).toEqual([]);

    expect(await repository.querySource(detailSource, { id: 'pos-order-refund-links-source-001', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: { refund_orders_count: 1, is_refund: false } });
    expect(await repository.querySource(detailSource, { id: 'pos-order-refund-linked-001', current_company_name: 'Core3 Demo Company' })).toMatchObject({ data: { original_order_id: 'pos-order-refund-links-source-001', original_order_name: 'POS/2026/09/22/REFUND-LINKS-SOURCE', is_refund: true, refund_orders_count: 0 } });
    expect(refundsSource.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    database.close();
  });

  test('keeps the relationship durable after migration replay and restart', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'core3-pos-refund-links-'));
    const databasePath = join(workDir, 'pos.duckdb');
    const migrationName = `pos_order_refund_links_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await firstRepository.query('SELECT original_order_id, is_refund, amount_total FROM pos_orders WHERE id = ?', ['pos-order-refund-linked-001']))
      .toEqual([{ original_order_id: 'pos-order-refund-links-source-001', is_refund: true, amount_total: -12.1 }]);
    first.close();

    const reopened = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopened);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM pos_orders WHERE id = ?', ['pos-order-refund-linked-001'])).toEqual([{ count: 1 }]);
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM pos_order_lines WHERE id = ?', ['pos-line-refund-linked-001'])).toEqual([{ count: 1 }]);
    reopened.close();
    rmSync(workDir, { recursive: true, force: true });
  });
});
