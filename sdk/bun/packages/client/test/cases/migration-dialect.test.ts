import { describe, expect, it } from 'vitest';
import { createDialect } from '@core3/server/database/dialects';
import { migrationSqlForDriver } from '@core3/server/migrations';
import type { DatabaseDriver } from '@core3/server/database/types';

describe('database dialect contract', () => {
  it.each(['postgres', 'duckdb', 'mysql', 'oracle', 'sqlserver'] as DatabaseDriver[])('declares %s migration behavior', (driver) => {
    const dialect = createDialect(driver);
    expect(dialect.driver).toBe(driver);
    expect(dialect.quoteIdentifier('orders').toLowerCase()).toMatch(/orders/);
    expect(dialect.placeholder(1)).toBe(driver === 'postgres' ? '$1' : driver === 'oracle' ? ':1' : '?');
  });

  it('selects the database-specific migration SQL without translating between drivers', () => {
    const migration = {
      file: '001-example.yaml',
      sql: {
        postgres: { up: 'CREATE TABLE postgres_table ();', down: 'DROP TABLE postgres_table;' },
        mysql: { up: 'CREATE TABLE mysql_table ();', down: 'DROP TABLE mysql_table;' },
      },
    } as any;

    expect(migrationSqlForDriver(migration, 'postgres').up).toContain('postgres_table');
    expect(migrationSqlForDriver(migration, 'mysql').up).toContain('mysql_table');
    expect(() => migrationSqlForDriver(migration, 'oracle')).toThrow('does not support database type oracle');
  });

});
