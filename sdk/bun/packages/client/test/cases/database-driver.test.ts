import { describe, expect, it } from 'vitest';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import type { DatabaseAdapter } from '@core3/server/database/types';

async function readRows(database: DatabaseAdapter): Promise<any[]> {
  const connection = database.connect();
  try {
    return await connection.all('SELECT id, label FROM driver_contract ORDER BY id');
  } finally {
    await new Promise<void>((resolve) => connection.close(resolve));
  }
}

describe('database driver contract', () => {
  it('keeps application interaction engine-neutral for memory DuckDB', async () => {
    const database: DatabaseAdapter = await DuckDbDatabase.open(':memory:');
    const connection = database.connect();
    await connection.run('CREATE TABLE driver_contract(id INTEGER, label VARCHAR)');
    await connection.run('INSERT INTO driver_contract VALUES (?, ?)', [1, 'memory']);
    await connection.close();

    expect(await readRows(database)).toEqual([{ id: 1, label: 'memory' }]);
    database.close();
  });
});
