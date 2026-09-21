import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS Delete Order action', () => {
  test('joins the Odoo detail action through separate page and API contracts', () => {
    const page = yaml('pages/pos-order-detail.yaml');
    const api = yaml('api/pos-order-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const action = api.actions.find((candidate: any) => candidate.id === 'delete_pos_order_detail');

    expect(page.page.id).toBe('pos-order-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(form.header_actions).toContainEqual(expect.objectContaining({
      id: 'delete_pos_order_detail', label: 'Delete', permission: 'pos.write', variant: 'danger',
    }));
    expect(action).toMatchObject({ type: 'server', action: 'pos.orders.delete', permission: 'pos.write', operation: 'delete' });
    expect(action.mutation).toMatchObject({ operation: 'delete', table: 'pos_orders', concurrency: { required: true } });
    expect(action.mutation.before_steps).toHaveLength(6);
  });

  test('deletes only new/cancelled same-company orders and remains absent after restart', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'core3-pos-delete-'));
    const databasePath = join(workDir, 'pos.duckdb');
    const migrationName = `pos_order_delete_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await repository.run("INSERT INTO pos_orders(id, row_version, name, session_id, state, amount_total, amount_paid, company) VALUES ('pos-order-delete-cancelled-001', 1, 'POS/DELETE/CANCELLED', 'pos-session-demo-001', 'Cancelled', 0, 0, 'Core3 Demo Company')");
    await repository.run("INSERT INTO pos_order_lines(id, order_id, product_name, quantity, price_unit) VALUES ('pos-line-delete-001', 'pos-order-delete-cancelled-001', 'Delete fixture line', 1, 1)");
    const action = yaml('api/pos-order-detail.yaml').actions.find((candidate: any) => candidate.id === 'delete_pos_order_detail');
    const base = { id: 'pos-order-delete-cancelled-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_id: 'pos-manager' };

    await expect(repository.executeMutation(action.mutation, { ...base, expected_row_version: 9 })).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_DELETE_STALE' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_company_name: 'Core3 Vietnam Branch' })).rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });
    await repository.run("UPDATE pos_orders SET state = 'Paid' WHERE id = 'pos-order-delete-cancelled-001'");
    await expect(repository.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_DELETE_STATE' });
    await repository.run("UPDATE pos_orders SET state = 'Cancelled' WHERE id = 'pos-order-delete-cancelled-001'");
    expect(await repository.query('SELECT state, row_version, company FROM pos_orders WHERE id = ?', [base.id])).toEqual([{ state: 'Cancelled', row_version: 1, company: 'Core3 Demo Company' }]);

    expect(await repository.executeMutation(action.mutation, base)).toEqual({ deleted: true });
    expect(await repository.query('SELECT COUNT(*) AS count FROM pos_orders WHERE id = ?', [base.id])).toEqual([{ count: 0 }]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM pos_order_lines WHERE order_id = ?', [base.id])).toEqual([{ count: 0 }]);
    database.close();

    const reopened = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopened);
    expect(await reopenedRepository.query('SELECT id FROM pos_orders WHERE id = ?', [base.id])).toEqual([]);
    reopened.close();
    rmSync(workDir, { recursive: true, force: true });
  });
});
