import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HybridDuckDbDatabase } from '@core3/server/hybrid-database';

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
  it('keeps schema and rows in a process-local memory database', async () => {
    const database = await HybridDuckDbDatabase.open(':memory:');
    databases.push(database);
    await database.withDurableWrites(async () => {
      await run(database, 'CREATE TABLE records (id BIGINT, label VARCHAR)');
      await run(database, 'INSERT INTO records VALUES (?, ?)', 1, 'one');
    });

    expect(await query(database, 'SELECT * FROM records')).toEqual([{ id: 1n, label: 'one' }]);
  });

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

  it('partitions orders by year while keeping the logical table name', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-hybrid-orders-'));
    const path = join(directory, 'tms.duckdb');
    try {
      const database = await HybridDuckDbDatabase.open(path);
      databases.push(database);
      await run(database, 'CREATE TABLE orders (id VARCHAR PRIMARY KEY, order_date DATE, amount INTEGER)');
      await database.withDurableWrites(() => database.partition({ table: 'orders', column: 'order_date', strategy: 'range', interval: 'year' }));
      await run(database, 'INSERT INTO orders (id, order_date, amount) VALUES (?, ?, ?)', 'order-2024', '2024-06-01', 10);
      await run(database, 'INSERT INTO orders (id, order_date, amount) VALUES (?, ?, ?)', 'order-2025', '2025-06-01', 20);

      expect(await query(database, 'SELECT id, amount FROM orders WHERE order_date >= ? AND order_date < ? ORDER BY id', '2025-01-01', '2026-01-01')).toEqual([
        { id: 'order-2025', amount: 20 },
      ]);
      expect(await query(database, "SELECT table_name FROM duckdb_tables() WHERE table_name LIKE 'orders__p%' ORDER BY table_name")).toEqual([
        { table_name: 'orders__p2024' },
        { table_name: 'orders__p2025' },
        { table_name: 'orders__pdefault' },
      ]);
      database.close();
      databases.splice(databases.indexOf(database), 1);
      const restarted = await HybridDuckDbDatabase.open(path);
      databases.push(restarted);
      expect(await query(restarted, 'SELECT COUNT(*) AS count FROM orders WHERE order_date >= ? AND order_date < ?', '2024-01-01', '2025-01-01')).toEqual([{ count: 1n }]);
      await restarted.withDurableWrites(() => restarted.unpartition('orders'));
      expect(await query(restarted, 'SELECT COUNT(*) AS count FROM orders')).toEqual([{ count: 2n }]);
      await restarted.withDurableWrites(() => restarted.partition({ table: 'orders', column: 'order_date', strategy: 'range', interval: 'year', replace: true }));
      expect(await query(restarted, 'SELECT COUNT(*) AS count FROM orders WHERE order_date >= ? AND order_date < ?', '2025-01-01', '2026-01-01')).toEqual([{ count: 1n }]);
    } finally {
      for (const database of databases.splice(0)) database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('routes list partitions and keeps an explicit default partition', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-hybrid-list-'));
    const path = join(directory, 'tms.duckdb');
    try {
      const database = await HybridDuckDbDatabase.open(path);
      databases.push(database);
      await run(database, 'CREATE TABLE records (id VARCHAR PRIMARY KEY, status VARCHAR)');
      await database.withDurableWrites(() => database.partition({
        table: 'records', column: 'status', strategy: 'list',
        partitions: [{ name: 'open', values: ['Draft', 'Approved'] }, { name: 'closed', values: ['Cancelled'] }],
        default_partition: 'other',
      }));
      await run(database, 'INSERT INTO records (id, status) VALUES (?, ?)', 'r1', 'Draft');
      await run(database, 'INSERT INTO records (id, status) VALUES (?, ?)', 'r2', 'Cancelled');
      await run(database, 'INSERT INTO records (id, status) VALUES (?, ?)', 'r3', 'Unknown');
      expect(await query(database, 'SELECT id FROM records WHERE status = ? ORDER BY id', 'Draft')).toEqual([{ id: 'r1' }]);
      expect(await query(database, 'SELECT id FROM records ORDER BY id')).toEqual([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]);
    } finally {
      for (const database of databases.splice(0)) database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('routes hash partitions and preserves the logical table query', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-hybrid-hash-'));
    const path = join(directory, 'tms.duckdb');
    try {
      const database = await HybridDuckDbDatabase.open(path);
      databases.push(database);
      await run(database, 'CREATE TABLE tenants (id VARCHAR PRIMARY KEY, tenant_id VARCHAR)');
      await database.withDurableWrites(() => database.partition({ table: 'tenants', column: 'tenant_id', strategy: 'hash', buckets: 3 }));
      for (const [id, tenant] of [['r1', 'a'], ['r2', 'b'], ['r3', 'a'], ['r4', 'c']]) {
        await run(database, 'INSERT INTO tenants (id, tenant_id) VALUES (?, ?)', id, tenant);
      }
      expect(await query(database, 'SELECT COUNT(*) AS count FROM tenants WHERE tenant_id = ?', 'a')).toEqual([{ count: 2n }]);
      expect(await query(database, 'SELECT COUNT(*) AS count FROM tenants')).toEqual([{ count: 4n }]);
    } finally {
      for (const database of databases.splice(0)) database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('supports explicit range bounds and a range default partition', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-hybrid-range-bounds-'));
    const path = join(directory, 'tms.duckdb');
    try {
      const database = await HybridDuckDbDatabase.open(path);
      databases.push(database);
      await run(database, 'CREATE TABLE invoices (id VARCHAR PRIMARY KEY, issued_on DATE)');
      await database.withDurableWrites(() => database.partition({
        table: 'invoices', column: 'issued_on', strategy: 'range',
        bounds: [{ name: '2024', from: '2024-01-01', to: '2025-01-01' }, { name: '2025', from: '2025-01-01', to: '2026-01-01' }],
        default_partition: 'other',
      }));
      await run(database, 'INSERT INTO invoices (id, issued_on) VALUES (?, ?)', 'i1', '2024-05-01');
      await run(database, 'INSERT INTO invoices (id, issued_on) VALUES (?, ?)', 'i2', '2027-05-01');
      expect(await query(database, 'SELECT id FROM invoices WHERE issued_on >= ? AND issued_on < ? ORDER BY id', '2024-01-01', '2025-01-01')).toEqual([{ id: 'i1' }]);
      expect(await query(database, 'SELECT id FROM invoices ORDER BY id')).toEqual([{ id: 'i1' }, { id: 'i2' }]);
    } finally {
      for (const database of databases.splice(0)) database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
