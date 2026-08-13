import { describe, expect, it } from 'vitest';
import { HybridDuckDbDatabase } from '@core3/server/database/hybrid-database';
import { PostgresDatabase } from '@core3/server/database/postgres-database';

describe('Postgres-backed hybrid database', () => {
  it('writes durably through Postgres while reading from in-memory DuckDB', async () => {
    const durableStatements: Array<[string, unknown[]]> = [];
    const durable = PostgresDatabase.fromExecutor({
      unsafe: async (sql, params) => {
        durableStatements.push([sql, params || []]);
        return [];
      },
    });
    const database = await HybridDuckDbDatabase.open({ durable, kind: 'postgres' });
    const connection = database.connect();
    try {
      await connection.run('CREATE TABLE records (id INTEGER, label VARCHAR)');
      await connection.run('INSERT INTO records VALUES (?, ?)', 1, 'hot');
      expect(await connection.all('SELECT * FROM records')).toEqual([{ id: 1, label: 'hot' }]);
      expect(durableStatements).toEqual([
        ['CREATE TABLE records (id INTEGER, label VARCHAR)', []],
        ['INSERT INTO records VALUES ($1, $2)', [1, 'hot']],
      ]);
    } finally {
      database.close();
    }
  });
});
