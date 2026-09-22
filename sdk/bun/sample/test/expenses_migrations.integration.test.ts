import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const migrationsRoot = join(import.meta.dir, '../services/expenses/migrations');

describe('Expenses migration persistence gate', () => {
  test('keeps seeded expenses, receipts, activities, and split lines stable across upgrade and replay', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationTable = 'expenses_replay_test_migrations';

    await migrateDatabase(repository, migrationsRoot, '0.0.2', migrationTable, ['schema', 'data']);
    await migrateDatabase(repository, migrationsRoot, undefined, migrationTable, ['schema', 'data']);

    const beforeReplay = await repository.query(`
      SELECT
        (SELECT COUNT(*) FROM expense_sheets WHERE id LIKE 'expense-sheet-demo-%') AS sheets,
        (SELECT COUNT(*) FROM expenses WHERE id LIKE 'expense-demo-%') AS expenses,
        (SELECT COUNT(*) FROM expense_activity WHERE expense_id LIKE 'expense-demo-%') AS activities,
        (SELECT COUNT(*) FROM expense_attachments WHERE expense_id LIKE 'expense-demo-%') AS attachments,
        (SELECT COUNT(*) FROM expense_duplicate_candidates WHERE expense_id LIKE 'expense-demo-%') AS duplicates,
        (SELECT COUNT(*) FROM expense_split_lines WHERE expense_id LIKE 'expense-demo-%') AS split_lines
    `);

    await migrateDatabase(repository, migrationsRoot, undefined, migrationTable, ['schema', 'data']);

    const afterReplay = await repository.query(`
      SELECT
        (SELECT COUNT(*) FROM expense_sheets WHERE id LIKE 'expense-sheet-demo-%') AS sheets,
        (SELECT COUNT(*) FROM expenses WHERE id LIKE 'expense-demo-%') AS expenses,
        (SELECT COUNT(*) FROM expense_activity WHERE expense_id LIKE 'expense-demo-%') AS activities,
        (SELECT COUNT(*) FROM expense_attachments WHERE expense_id LIKE 'expense-demo-%') AS attachments,
        (SELECT COUNT(*) FROM expense_duplicate_candidates WHERE expense_id LIKE 'expense-demo-%') AS duplicates,
        (SELECT COUNT(*) FROM expense_split_lines WHERE expense_id LIKE 'expense-demo-%') AS split_lines
    `);

    expect(afterReplay).toEqual(beforeReplay);
    expect(afterReplay[0]).toMatchObject({
      sheets: 2,
      expenses: 9,
      activities: 8,
      attachments: 0,
      duplicates: 1,
      split_lines: 2,
    });
    expect(await repository.query(`SELECT version FROM ${migrationTable} ORDER BY version`)).toHaveLength(15);
    expect(await repository.query(
      "SELECT receipt_checksum FROM expenses WHERE id = 'expense-demo-submitted-2'",
    )).toEqual([{ receipt_checksum: 'sha256:receipt-air-duplicate' }]);
  });
});
