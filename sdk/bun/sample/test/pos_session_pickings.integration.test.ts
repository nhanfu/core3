import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS session Pickings smart button parity', () => {
  test('keeps the Odoo action and page/API contracts separate', () => {
    const sessionPage = yaml('pages/pos-session-detail.yaml');
    const sessionApi = yaml('api/pos-session-detail.yaml');
    const pickingsPage = yaml('pages/pos-session-pickings.yaml');
    const pickingsApi = yaml('api/pos-session-pickings.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_session_view.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_session.py', 'utf8');
    const statButton = sessionPage.components[0].stat_buttons.find((candidate: any) => candidate.id === 'open_session_pickings');
    const action = sessionApi.actions.find((candidate: any) => candidate.id === 'open_session_pickings');

    expect(sessionApi.page.id).toBe(sessionPage.page.id);
    expect(pickingsApi.page.id).toBe(pickingsPage.page.id);
    expect(statButton).toMatchObject({ label: 'Pickings', permission: 'pos.read', value_field: 'picking_count' });
    expect(statButton.show_if).toContain('picking_count > 0');
    expect(action).toMatchObject({ type: 'navigate', permission: 'pos.read', navigate_to: '/point-of-sale/session-pickings' });
    expect(pickingsApi.datasources.find((candidate: any) => candidate.id === 'pos_session_pickings').query).toContain('o.session_id = :session_id');
    expect(pickingsPage.components[0]).toMatchObject({ row_open_action: 'view_pos_session_picking', row_double_click_action: 'view_pos_session_picking' });
    expect(pickingsApi.datasources[1].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, not_found: { status: 404 }, transport_error: { status: 503 } });
    expect(sourceView).toContain('name="action_stock_picking"');
    expect(sourceView).toContain('string="Pickings"');
    expect(sourceModel).toContain('def action_stock_picking(self):');
    expect(sourceModel).toContain("action['domain'] = [('id', 'in', self.picking_ids.ids)]");
  });

  test('projects only ready pickings for the selected session and current company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `pos_session_pickings_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const api = yaml('api/pos-session-pickings.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'pos_session_pickings');
    const rows = await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);

    expect(rows.data).toMatchObject([
      { id: 'pos-order-picking-demo-001', order_id: 'pos-order-demo-001', order_name: 'POS/2026/08/17/0001', state: 'Ready', company: 'Core3 Demo Company', move_count: 2 },
    ]);
    expect((await repository.querySource(source, { session_id: 'pos-session-demo-opening', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data).toEqual([]);
    expect(source).toMatchObject({ permission: 'pos.read' });
    database.close();
  });

  test('keeps the session stat count and projection durable after migration replay and restart', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'core3-pos-session-pickings-'));
    const databasePath = join(workDir, 'pos.duckdb');
    const migrationName = `pos_session_pickings_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const source = yaml('api/pos-session-pickings.yaml').datasources.find((candidate: any) => candidate.id === 'pos_session_pickings');
    const stat = await firstRepository.query("SELECT COUNT(*) AS picking_count FROM pos_order_pickings p JOIN pos_orders o ON o.id = p.order_id AND o.company = p.company WHERE o.session_id = ? AND p.company = ?", ['pos-session-demo-001', 'Core3 Demo Company']);
    const before = await firstRepository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(stat).toEqual([{ picking_count: 1 }]);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    first.close();

    const reopened = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopened);
    const after = await reopenedRepository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(after.data).toEqual(before.data);
    reopened.close();
  });
});
