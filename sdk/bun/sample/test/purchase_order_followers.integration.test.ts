import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/purchase-detail.yaml').actions.find((entry: any) => entry.id === id);
const migrate = (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('Purchase order followers parity', () => {
  test('maps Odoo Add/Remove Followers to the Purchase detail page/API pair', () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(api.page).toEqual({ id: 'purchase-detail' });
    expect(() => validatePageDefinition({ ...page, actions: [...(api.actions || []), ...(page.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(form).toMatchObject({
      follower_source: 'purchase_order_followers',
      follower_candidates_source: 'purchase_order_follower_candidates',
      follower_add_action: 'add_purchase_order_follower',
      follower_remove_action: 'remove_purchase_order_follower',
      add_follower_label: 'Add Followers',
    });
    expect(action('add_purchase_order_follower')).toMatchObject({ action: 'purchase.orders.followers.add', permission: 'purchase.write' });
    expect(action('remove_purchase_order_follower')).toMatchObject({ action: 'purchase.orders.followers.remove', permission: 'purchase.write' });
  });

  test('adds and removes followers idempotently with row-version and restart guards', async () => {
    const databasePath = `/tmp/core3-purchase-followers-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    try {
      const repository = new YamlRepository(database);
      await migrate(repository, 'purchase_order_followers_migrations');
      await migrate(repository, 'purchase_order_followers_migrations');
      const add = action('add_purchase_order_follower');
      const remove = action('remove_purchase_order_follower');
      const input = { id: 'po-demo-005', user_id: 'purchase-user-qa', expected_row_version: 1, current_user_id: 'purchase-user-admin', current_user_name: 'Mitchell Admin' };
      await expect(repository.executeMutation(add.mutation, input)).resolves.toMatchObject({ user_id: 'purchase-user-qa', removed: false });
      await expect(repository.executeMutation(add.mutation, { ...input, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_FOLLOWER_EXISTS' });
      expect(await repository.query("SELECT purchase_order_id, user_id, added_by FROM purchase_order_followers WHERE purchase_order_id = 'po-demo-005' ORDER BY user_id")).toEqual([
        { purchase_order_id: 'po-demo-005', user_id: 'purchase-user-admin', added_by: 'purchase-user-admin' },
        { purchase_order_id: 'po-demo-005', user_id: 'purchase-user-qa', added_by: 'purchase-user-admin' },
      ]);
      await expect(repository.executeMutation(remove.mutation, { ...input, expected_row_version: 2 })).resolves.toMatchObject({ user_id: 'purchase-user-qa', removed: true });
      await expect(repository.executeMutation(remove.mutation, { ...input, expected_row_version: 3 })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_ORDER_FOLLOWER_NOT_FOUND' });
      await database.close();
      const restarted = await DuckDbDatabase.open(databasePath);
      const restartedRepository = new YamlRepository(restarted);
      await migrate(restartedRepository, 'purchase_order_followers_migrations');
      expect(await restartedRepository.query("SELECT user_id FROM purchase_order_followers WHERE purchase_order_id = 'po-demo-005'")).toEqual([{ user_id: 'purchase-user-admin' }]);
      await restarted.close();
    } finally {
      try { await database.close(); } catch {}
    }
  });
});
