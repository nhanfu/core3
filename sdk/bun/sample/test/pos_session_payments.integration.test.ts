import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS session Payments smart button parity', () => {
  test('keeps the Odoo action and page/API contracts separate', () => {
    const sessionPage = yaml('pages/pos-session-detail.yaml');
    const sessionApi = yaml('api/pos-session-detail.yaml');
    const paymentsPage = yaml('pages/pos-session-payments.yaml');
    const paymentsApi = yaml('api/pos-session-payments.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_session_view.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_session.py', 'utf8');
    const statButton = sessionPage.components[0].stat_buttons.find((candidate: any) => candidate.id === 'open_session_payments');
    const action = sessionApi.actions.find((candidate: any) => candidate.id === 'open_session_payments');

    expect(sessionApi.page.id).toBe(sessionPage.page.id);
    expect(paymentsApi.page.id).toBe(paymentsPage.page.id);
    expect(statButton).toMatchObject({ label: 'Payments', permission: 'pos.read', value_field: 'total_payments_amount' });
    expect(action).toMatchObject({ type: 'navigate', permission: 'pos.read', navigate_to: '/point-of-sale/session-payments' });
    expect(paymentsApi.datasources[0].query).toContain("o.state IN ('Paid', 'Invoiced', 'Done')");
    expect(paymentsPage.components[0].default_group_by).toBe('method');
    expect(paymentsPage.components[0].empty_state).toMatchObject({ title: 'No session payments' });
    expect(paymentsApi.datasources[0].error_states).toMatchObject({
      unauthorized: { status: 401 },
      forbidden: { status: 403 },
      transport_error: { status: 503 },
    });
    expect(sourceView).toContain('name="action_show_payments_list"');
    expect(sourceModel).toContain('def action_show_payments_list(self):');
    expect(sourceModel).toContain("'search_default_group_by_payment_method': 1");
  });

  test('projects only captured payments for the selected session and company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `pos_session_payments_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const api = yaml('api/pos-session-payments.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'pos_session_payments');
    const rows = await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(rows.data.length).toBeGreaterThan(0);
    expect(rows.data.every((row: any) => row.company === 'Core3 Demo Company')).toBe(true);
    expect(rows.data.every((row: any) => row.state === 'Posted')).toBe(true);
    expect((await repository.querySource(source, { session_id: 'pos-session-demo-opening', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.query("SELECT COUNT(*) AS count FROM pos_payments p JOIN pos_orders o ON o.id = p.order_id WHERE o.session_id = ? AND p.company = ? AND o.state IN ('Paid', 'Invoiced', 'Done')", ['pos-session-demo-001', 'Core3 Vietnam Branch']))[0].count).toBe(0);
    expect(source).toMatchObject({ permission: 'pos.read' });
    database.close();
  });

  test('keeps the captured payment projection durable after migration replay and restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `pos_session_payments_replay_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const api = yaml('api/pos-session-payments.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'pos_session_payments');
    const first = await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const second = await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(second.data).toEqual(first.data);
    database.close();
  });
});
