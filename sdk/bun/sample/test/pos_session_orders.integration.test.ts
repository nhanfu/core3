import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS session Orders smart button parity', () => {
  test('keeps the Odoo action and page/API contracts separate', () => {
    const sessionPage = yaml('pages/pos-session-detail.yaml');
    const sessionApi = yaml('api/pos-session-detail.yaml');
    const ordersPage = yaml('pages/pos-session-orders.yaml');
    const ordersApi = yaml('api/pos-session-orders.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_session_view.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_session.py', 'utf8');
    const statButton = sessionPage.components[0].stat_buttons.find((candidate: any) => candidate.id === 'open_session_orders');
    const action = sessionApi.actions.find((candidate: any) => candidate.id === 'open_session_orders');

    expect(sessionApi.page.id).toBe(sessionPage.page.id);
    expect(ordersApi.page.id).toBe(ordersPage.page.id);
    expect(statButton).toMatchObject({ label: 'Orders', permission: 'pos.read', value_field: 'order_count' });
    expect(action).toMatchObject({ type: 'navigate', permission: 'pos.read', navigate_to: '/point-of-sale/session-orders' });
    expect(ordersApi.datasources.find((candidate: any) => candidate.id === 'pos_session_scoped_orders').query).toContain('o.session_id = :session_id');
    expect(ordersPage.components[0]).toMatchObject({ row_open_action: 'view_pos_session_order', row_double_click_action: 'view_pos_session_order' });
    expect(ordersApi.datasources[1].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, not_found: { status: 404 }, transport_error: { status: 503 } });
    expect(sourceView).toContain('name="action_view_order"');
    expect(sourceModel).toContain('def action_view_order(self):');
    expect(sourceModel).toContain("'domain': [('session_id', 'in', self.ids)]");
  });

  test('projects only the selected session and current company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `pos_session_orders_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const api = yaml('api/pos-session-orders.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'pos_session_scoped_orders');
    const rows = await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(rows.data.length).toBeGreaterThan(0);
    expect(rows.data.every((row: any) => row.session_id === 'pos-session-demo-001')).toBe(true);
    expect(rows.data.every((row: any) => row.company === 'Core3 Demo Company')).toBe(true);
    expect((await repository.querySource(source, { session_id: 'pos-session-demo-opening', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data).toEqual([]);
    expect(source).toMatchObject({ permission: 'pos.read' });
    database.close();
  });

  test('preserves search, status, row navigation, and explicit empty state contracts', () => {
    const page = yaml('pages/pos-session-orders.yaml');
    const api = yaml('api/pos-session-orders.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'pos_session_scoped_orders');
    expect(source.query).toContain('o.name ILIKE');
    expect(source.query).toContain('o.state = :state');
    expect(page.components[0].filters).toEqual([{ field: 'state', label: 'Status', options_source: 'pos_session_order_states' }]);
    expect(page.components[0].empty_state).toMatchObject({ title: 'No orders' });
    expect(api.actions.find((candidate: any) => candidate.id === 'view_pos_session_order')).toMatchObject({ navigate_to: '/point-of-sale/order-detail' });
    expect(page.actions.find((candidate: any) => candidate.id === 'back_to_pos_session_orders')).toMatchObject({ navigate_to: '/point-of-sale/session-detail' });
  });

  test('remains durable after migration replay and file-backed restart', async () => {
    const databasePath = join('/tmp', `core3-pos-session-orders-${crypto.randomUUID()}.duckdb`);
    const migrationName = `pos_session_orders_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const firstDatabase = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(firstDatabase);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const source = yaml('api/pos-session-orders.yaml').datasources.find((candidate: any) => candidate.id === 'pos_session_scoped_orders');
    const first = await firstRepository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    firstDatabase.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    const second = await reopenedRepository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(second.data).toEqual(first.data);
    reopenedDatabase.close();
  });
});
