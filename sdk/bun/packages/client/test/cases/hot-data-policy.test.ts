import { describe, expect, it } from 'vitest';
import { HybridDuckDbDatabase, hotDataBounds } from '@core3/server/database/hybrid-database';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { discoverMigrations } from '@core3/server/migrations';
import { join } from 'node:path';
import { YamlRepository } from '@core3/server/database/yaml-repository';

describe('migration hot-data policy', () => {
  it.skipIf(!(globalThis as any).Bun)('discovers the order migration hot window', () => {
    const root = join(process.cwd(), '../../sample/services/order/migrations');
    const migration = discoverMigrations(root).find((candidate) => candidate.version === 1);
    expect(migration?.hotData).toEqual([{ table: 'orders', dateColumn: 'order_date', windowYears: 2, from: undefined, to: undefined }]);
  });

  it('keeps hot rows in DuckDB and removes cold rows from the memory cache', async () => {
    const durable = PostgresDatabase.fromExecutor({ unsafe: async () => [] });
    const database = await HybridDuckDbDatabase.open({
      durable,
      kind: 'postgres',
      hotData: [{ table: 'records', dateColumn: 'recorded_on', from: '2025-01-01', to: '2027-01-01' }],
    });
    const connection = database.connect();
    try {
      await connection.run('CREATE TABLE records (id INTEGER, recorded_on DATE)');
      await connection.run("INSERT INTO records VALUES (1, DATE '2024-01-01')");
      await connection.run("INSERT INTO records VALUES (2, DATE '2026-01-01')");
      await database.applyHotDataPolicy();
      expect(await connection.all('SELECT id FROM records ORDER BY id')).toEqual([{ id: 2 }]);
    } finally {
      database.close();
    }
  });

  it('calculates a rolling window when migrations use years', () => {
    const bounds = hotDataBounds({ table: 'records', dateColumn: 'recorded_on', windowYears: 2 });
    expect(bounds.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(bounds.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number(bounds.to.slice(0, 4)) - Number(bounds.from.slice(0, 4))).toBe(2);
  });

  it('loads a permitted cold slice for the query and unloads it afterward', async () => {
    const durable = PostgresDatabase.fromExecutor({
      unsafe: async (sql) => sql.includes('FROM "records"')
        ? [{ id: 1, recorded_on: '2024-01-01' }]
        : [],
    });
    const database = await HybridDuckDbDatabase.open({
      durable,
      kind: 'postgres',
      hotData: [{ table: 'records', dateColumn: 'recorded_on', from: '2025-01-01', to: '2027-01-01' }],
    });
    const repository = new YamlRepository(database);
    try {
      await repository.run('CREATE TABLE records (id INTEGER, recorded_on DATE)');
      const result = await repository.querySource({
        id: 'records',
        query: 'SELECT id FROM records WHERE recorded_on >= CAST(:from_date AS DATE) AND recorded_on < CAST(:to_date AS DATE)',
        query_window: { table: 'records', date_field: 'recorded_on', max_years: 5, deny_unbounded: true },
      }, { from_date: '2024-01-01', to_date: '2025-01-01' });
      expect(result.data).toEqual([{ id: 1 }]);
      expect(await repository.query('SELECT id FROM records')).toEqual([]);
    } finally {
      database.close();
    }
  });

  it('reconstructs the DuckDB schema and hot rows after a Postgres-backed restart', async () => {
    const durable = PostgresDatabase.fromExecutor({
      unsafe: async (sql) => {
        if (sql.includes('information_schema.tables')) return [{ table_name: 'records' }];
        if (sql.includes('information_schema.columns')) return [
          { column_name: 'id', data_type: 'integer', udt_name: 'int4' },
          { column_name: 'recorded_on', data_type: 'date', udt_name: 'date' },
        ];
        if (sql.includes('FROM "records"')) return [{ id: 2, recorded_on: '2026-01-01' }];
        return [];
      },
    });
    const database = await HybridDuckDbDatabase.open({
      durable,
      kind: 'postgres',
      hotData: [{ table: 'records', dateColumn: 'recorded_on', from: '2025-01-01', to: '2027-01-01' }],
    });
    try {
      await database.hydrateFromDurable();
      const rows = await new YamlRepository(database).query('SELECT id FROM records');
      expect(rows).toEqual([{ id: 2 }]);
    } finally {
      database.close();
    }
  });
});
