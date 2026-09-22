import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/purchase-detail.yaml').actions.find((entry: any) => entry.id === id);
const migrate = async (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);

describe('Purchase order chatter parity', () => {
  test('maps Odoo mail.thread chatter to the Purchase detail page/API pair', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/purchase/models/purchase_order.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/purchase/views/purchase_views.xml', 'utf8');
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');

    expect(sourceModel).toContain("'mail.thread'");
    expect(sourceModel).toContain('def message_post');
    expect(sourceView).toContain('<chatter/>');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({
      message_source: 'purchase_order_email_history',
      message_action: 'send_purchase_order_message',
      note_action: 'log_purchase_order_note',
    });
    expect(api.datasources.find((entry: any) => entry.id === 'purchase_order_email_history')?.query)
      .toContain('FROM purchase_order_messages');
    expect(action('send_purchase_order_message')).toMatchObject({
      type: 'server_form', permission: 'purchase.write', handler: 'order_chatter', operation: 'message',
    });
    expect(action('log_purchase_order_note')).toMatchObject({
      type: 'server_form', permission: 'purchase.write', handler: 'order_chatter', operation: 'note',
    });
  });

  test('persists public messages and internal notes with actor and version guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'purchase_order_chatter_crud');
    const send = action('send_purchase_order_message');
    const note = action('log_purchase_order_note');
    const before = (await repository.query("SELECT row_version FROM purchase_orders WHERE id = 'po-demo-005'"))[0].row_version;
    const sent = await repository.executeMutation(send.mutation, {
      id: 'po-demo-005', expected_row_version: before, current_user_id: 'purchase-user', current_user_name: 'Purchase User',
      values: { content: 'Please confirm the delivery window.' },
    }) as any;
    expect(sent).toMatchObject({
      id: 'purchase-chatter-po-demo-005-2', purchase_order_id: 'po-demo-005', actor_name: 'Purchase User',
      action: 'purchase.orders.chatter.message', action_label: 'Message', detail: 'Please confirm the delivery window.',
    });
    const noted = await repository.executeMutation(note.mutation, {
      id: 'po-demo-005', expected_row_version: before + 1, current_user_id: 'purchase-user', current_user_name: 'Purchase User',
      values: { content: 'Internal purchasing follow-up.' },
    }) as any;
    expect(noted).toMatchObject({ id: 'purchase-chatter-po-demo-005-3', action: 'purchase.orders.chatter.note', action_label: 'Internal note' });
    expect(await repository.query("SELECT row_version FROM purchase_orders WHERE id = 'po-demo-005'"))
      .toEqual([{ row_version: before + 2 }]);
    const timeline = yaml('api/purchase-detail.yaml').datasources.find((entry: any) => entry.id === 'purchase_order_email_history');
    expect((await repository.querySource(timeline, { id: 'po-demo-005' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: sent.id }), expect.objectContaining({ id: noted.id })]));
    await database.close();
  });

  test('rejects anonymous, blank, missing, and stale chatter writes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'purchase_order_chatter_guards');
    const send = action('send_purchase_order_message');
    const base = {
      id: 'po-demo-005', expected_row_version: 1, current_user_id: 'purchase-user', current_user_name: 'Purchase User',
      values: { content: 'A valid purchase message' },
    };
    await expect(repository.executeMutation(send.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'PURCHASE_ORDER_MESSAGE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, { ...base, values: { content: '   ' } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_MESSAGE_CONTENT_INVALID' });
    await expect(repository.executeMutation(send.mutation, { ...base, id: 'missing-purchase-order' })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_ORDER_CHATTER_NOT_FOUND' });
    await expect(repository.executeMutation(send.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_MESSAGE_PARENT_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_order_messages WHERE purchase_order_id = 'po-demo-005'"))
      .toEqual([{ count: 1 }]);
    await database.close();
  });

  test('keeps seeded and posted chatter entries after migration replay and restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-purchase-order-chatter-'));
    const databasePath = join(directory, 'purchase.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'purchase_order_chatter_restart');
      await migrate(firstRepository, 'purchase_order_chatter_restart');
      await firstRepository.executeMutation(action('log_purchase_order_note').mutation, {
        id: 'po-demo-002', expected_row_version: 1, current_user_id: 'purchase-manager', current_user_name: 'Purchase Manager',
        values: { content: 'Restart-safe Purchase note.' },
      });
      await firstDatabase.close();

      const secondDatabase = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(secondDatabase);
      await migrate(secondRepository, 'purchase_order_chatter_restart');
      expect(await secondRepository.query("SELECT purchase_order_id, actor_name, action, detail FROM purchase_order_messages WHERE id = 'purchase-chatter-po-demo-002-2'"))
        .toEqual([{ purchase_order_id: 'po-demo-002', actor_name: 'Purchase Manager', action: 'purchase.orders.chatter.note', detail: 'Restart-safe Purchase note.' }]);
      expect(await secondRepository.query("SELECT COUNT(*) AS count FROM purchase_order_messages WHERE id = 'purchase-chatter-demo-002-1'"))
        .toEqual([{ count: 1 }]);
      await secondDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
