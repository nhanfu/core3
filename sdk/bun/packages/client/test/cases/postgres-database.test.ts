import { describe, expect, it, vi } from 'vitest';
import { PostgresDatabase, postgresPlaceholders } from '@core3/server/database/postgres-database';

describe('Postgres durable database adapter', () => {
  it('translates positional repository parameters without changing quoted question marks', () => {
    expect(postgresPlaceholders("SELECT '?' AS literal, value FROM records WHERE id = ? AND note = \"?\" AND code = ?"))
      .toBe("SELECT '?' AS literal, value FROM records WHERE id = $1 AND note = \"?\" AND code = $2");
  });

  it('provides the repository callback connection over a Postgres executor', async () => {
    const unsafe = vi.fn(async (sql: string, params: unknown[]) => {
      if (sql.startsWith('SELECT')) return [{ id: 1n, created_at: new Date('2026-01-01T00:00:00Z') }];
      return [];
    });
    const database = PostgresDatabase.fromExecutor({ unsafe });
    const connection = database.connect();
    await connection.run('INSERT INTO records(id) VALUES(?)', 7);
    expect(await connection.all('SELECT id, created_at FROM records WHERE id = ?', 7)).toEqual([
      { id: 1, created_at: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(unsafe).toHaveBeenNthCalledWith(1, 'INSERT INTO records(id) VALUES($1)', [7]);
    expect(unsafe).toHaveBeenNthCalledWith(2, 'SELECT id, created_at FROM records WHERE id = $1', [7]);
  });
});
