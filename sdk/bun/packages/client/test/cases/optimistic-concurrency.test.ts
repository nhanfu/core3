import { describe, expect, it } from 'vitest';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

describe('optimistic row-version concurrency', () => {
  it('accepts the first update and rejects a stale second update', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run('CREATE TABLE records(id VARCHAR PRIMARY KEY, name VARCHAR, row_version BIGINT NOT NULL DEFAULT 1)');
    await repository.run('INSERT INTO records(id, name) VALUES (?, ?)', ['record-1', 'before']);

    const mutation = {
      operation: 'update' as const,
      table: 'records',
      fields: ['name'],
      result: { query: 'SELECT id, name, row_version FROM records WHERE id = :id' },
    };
    const first = await repository.executeMutation(mutation, {
      id: 'record-1', name: 'first edit', expected_row_version: 1,
    });
    expect(Number(first.row_version)).toBe(2);

    await expect(repository.executeMutation(mutation, {
      id: 'record-1', name: 'stale edit', expected_row_version: 1,
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await expect(repository.query('SELECT name, row_version FROM records WHERE id = ?', ['record-1']))
      .resolves.toEqual([{ name: 'first edit', row_version: 2 }]);
    database.close();
  });
});
