import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HybridDuckDbDatabase } from '../../server/hybrid-database.ts';

const databases: HybridDuckDbDatabase[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function run(database: HybridDuckDbDatabase, sql: string, ...params: any[]) {
  return new Promise<void>((resolve, reject) => database.connect().run(sql, ...params, (error: any) => error ? reject(error) : resolve()));
}

function query(database: HybridDuckDbDatabase, sql: string, ...params: any[]) {
  return new Promise<any[]>((resolve, reject) => database.connect().all(sql, ...params, (error: any, rows: any[]) => error ? reject(error) : resolve(rows)));
}

describe('HybridDuckDbDatabase', () => {
  it('writes durably before mirroring reads into memory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-hybrid-db-'));
    const path = join(directory, 'tms.duckdb');
    try {
      const database = await HybridDuckDbDatabase.open(path);
      databases.push(database);
      await run(database, 'CREATE TABLE records (id BIGINT, label VARCHAR)');
      await run(database, 'INSERT INTO records VALUES (?, ?)', 1, 'one');

      expect(await query(database, 'SELECT * FROM records')).toEqual([{ id: 1n, label: 'one' }]);
      database.close();
      databases.splice(databases.indexOf(database), 1);

      const restarted = await HybridDuckDbDatabase.open(path);
      databases.push(restarted);
      expect(await query(restarted, 'SELECT * FROM records')).toEqual([{ id: 1n, label: 'one' }]);
    } finally {
      for (const database of databases.splice(0)) database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('uses the native appender and exposes the appended rows from memory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-hybrid-appender-'));
    const path = join(directory, 'tms.duckdb');
    try {
      const database = await HybridDuckDbDatabase.open(path);
      databases.push(database);
      await run(database, 'CREATE TABLE measurements (id BIGINT, value DOUBLE)');
      await database.append('measurements', [[1, 1.5], [2, 2.5]]);
      expect(await query(database, 'SELECT * FROM measurements ORDER BY id')).toEqual([
        { id: 1n, value: 1.5 },
        { id: 2n, value: 2.5 },
      ]);
    } finally {
      for (const database of databases.splice(0)) database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
