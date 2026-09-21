import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS order Pickings smart button parity', () => {
  test('keeps the source-backed action and page/API contracts separate', () => {
    const page = yaml('pages/pos-order-detail.yaml');
    const api = yaml('api/pos-order-detail.yaml');
    const pickingsPage = yaml('pages/pos-order-pickings.yaml');
    const pickingsApi = yaml('api/pos-order-pickings.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_order.py', 'utf8');
    const action = api.actions.find((candidate: any) => candidate.id === 'open_pos_order_pickings');
    const header = page.components[0].header_actions.find((candidate: any) => candidate.id === 'open_pos_order_pickings');

    expect(page.page.id).toBe('pos-order-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(header).toMatchObject({ label: 'Pickings', permission: 'pos.read', variant: 'secondary' });
    expect(header.show_if).toContain('picking_count > 0');
    expect(action).toMatchObject({ type: 'navigate', permission: 'pos.read', navigate_to: '/point-of-sale/order-pickings' });
    expect(pickingsApi.page.id).toBe(pickingsPage.page.id);
    expect(pickingsApi.datasources.find((candidate: any) => candidate.id === 'pos_order_pickings').query).toContain('p.order_id = :order_id');
    expect(source).toContain('def action_stock_picking(self):');
    expect(source).toContain("stock.action_picking_tree_ready");
  });

  test('persists the ready picking projection and enforces company and empty-state boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `pos_order_pickings_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const api = yaml('api/pos-order-pickings.yaml');
    const query = 'SELECT p.id, p.name, p.state, p.move_count FROM pos_order_pickings p JOIN pos_orders o ON o.id = p.order_id AND o.company = p.company WHERE p.order_id = ? AND p.company = ? AND p.state = \'Ready\'';

    expect(await repository.query(query, ['pos-order-demo-001', 'Core3 Demo Company'])).toMatchObject([
      { id: 'pos-order-picking-demo-001', name: 'WH/OUT/00001', state: 'Ready', move_count: 2 },
    ]);
    expect(await repository.query(query, ['pos-order-demo-001', 'Core3 Vietnam Branch'])).toEqual([]);
    expect(await repository.query(query, ['pos-order-touch-demo-001', 'Core3 Demo Company'])).toEqual([]);
    expect(api.datasources.find((candidate: any) => candidate.id === 'pos_order_pickings')).toMatchObject({ permission: 'pos.read' });
    database.close();
  });

  test('remains durable after migration replay and restart', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'core3-pos-order-pickings-'));
    const databasePath = join(workDir, 'pos.duckdb');
    const migrationName = `pos_order_pickings_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await firstRepository.query('SELECT name, state, order_id FROM pos_order_pickings WHERE id = ?', ['pos-order-picking-demo-001'])).toEqual([
      { name: 'WH/OUT/00001', state: 'Ready', order_id: 'pos-order-demo-001' },
    ]);
    first.close();

    const reopened = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopened);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM pos_order_pickings WHERE id = ?', ['pos-order-picking-demo-001'])).toEqual([{ count: 1 }]);
    reopened.close();
  });
});
