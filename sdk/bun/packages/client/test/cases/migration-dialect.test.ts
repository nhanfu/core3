import { describe, expect, it } from 'vitest';
import { createDialect } from '@core3/server/database/dialects';
import { migrationSqlForDriver } from '@core3/server/migrations';
import { translateSql } from '@core3/server/database/sql-database';
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

  it('translates all order printf formats for MySQL', () => {
    const sql = `SELECT printf('%,.3f', l.quantity), printf('%.2f%%', l.tax_rate), printf('%,.0f ₫', COALESCE(l.line_total, 0))`;
    const translated = translateSql(sql, 'mysql');
    expect(translated).toContain('FORMAT(l.quantity, 3)');
    expect(translated).toContain("CONCAT(FORMAT(l.tax_rate, 2), '%')");
    expect(translated).toContain("CONCAT(FORMAT(COALESCE(l.line_total, 0), 0), ' ₫')");
    expect(translated).not.toContain('printf(');
  });

  it('translates row-version column additions for Oracle and SQL Server', () => {
    const sql = 'ALTER TABLE orders ADD COLUMN row_version BIGINT NOT NULL DEFAULT 1';
    expect(translateSql(sql, 'oracle')).toContain('ADD row_version NUMBER(19)');
    expect(translateSql(sql, 'sqlserver')).toContain('ADD row_version BIGINT');
  });

});
