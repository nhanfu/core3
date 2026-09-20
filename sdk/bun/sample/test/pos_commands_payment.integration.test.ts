import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS cashier command payment durability', () => {
  test('guards company ownership and preserves the idempotency record across restart', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'core3-pos-command-payment-'));
    const databasePath = join(workDir, 'pos.duckdb');
    const payment = yaml('api/pos-commands.yaml').actions.find((candidate: any) => candidate.id === 'cashier_validate_payment');
    const operation = {
      order_id: 'pos-command-payment-001',
      amount: 20,
      method: 'Cash',
      operation_id: 'pos-command-payment-op-001',
      expected_row_version: 1,
      current_user_id: 'cashier-command-001',
      current_company_name: 'Core3 Demo Company',
      cashier_id: 'cashier-command-001',
    };

    try {
      let database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_commands_payment_restart', ['schema', 'data']);
      await repository.run(`
        INSERT INTO pos_orders(id, name, session_id, state, amount_total, amount_paid, company)
        VALUES ('pos-command-payment-001', 'POS/COMMAND/PAYMENT/001', 'pos-session-demo-001', 'New', 20, 0, 'Core3 Demo Company')
      `);

      await expect(repository.executeMutation(payment.mutation, { ...operation, current_user_id: null }))
        .rejects.toMatchObject({ status: 401, code: 'POS_ORDER_UNAUTHENTICATED' });
      await expect(repository.executeMutation(payment.mutation, { ...operation, current_company_name: 'Core3 Vietnam Branch' }))
        .rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });

      const paid = await repository.executeMutation(payment.mutation, operation) as any;
      expect(paid).toMatchObject({ id: operation.order_id, amount_paid: 20, row_version: 2, actor_id: operation.current_user_id });
      expect(await repository.query('SELECT amount, company, actor_id FROM pos_payments WHERE order_id = ?', [operation.order_id]))
        .toEqual([{ amount: 20, company: operation.current_company_name, actor_id: operation.current_user_id }]);
      database.close();

      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      expect(await repository.query('SELECT amount_paid, row_version, actor_id FROM pos_orders WHERE id = ?', [operation.order_id]))
        .toEqual([{ amount_paid: 20, row_version: 2, actor_id: operation.current_user_id }]);
      expect(await repository.query('SELECT operation_id, operation_type, actor_id FROM pos_operations WHERE order_id = ?', [operation.order_id]))
        .toEqual([{ operation_id: operation.operation_id, operation_type: 'payment', actor_id: operation.cashier_id }]);
      await expect(repository.executeMutation(payment.mutation, operation))
        .rejects.toMatchObject({ status: 409 });
      expect(await repository.query('SELECT COUNT(*) AS count FROM pos_payments WHERE order_id = ?', [operation.order_id]))
        .toEqual([{ count: 1 }]);
      database.close();
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
