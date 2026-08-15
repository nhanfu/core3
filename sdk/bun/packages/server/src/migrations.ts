import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import type { DatabaseDriver } from './database/types.ts';

export type MigrationRepository = {
  run(sql: string, params?: any[]): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  runStatements(sql: string): Promise<void>;
  partition?(definition: PartitionDefinition): Promise<void>;
  unpartition?(table: string): Promise<void>;
  driver?: DatabaseDriver;
};

export type MigrationKind = 'schema' | 'data';

export type MigrationSql = {
  up: string;
  down: string;
};

export type MigrationOptions = {
  columnstoreTables?: string[];
};

export type PartitionDefinition = {
  table: string;
  column?: string;
  strategy: 'range' | 'time' | 'year' | 'list' | 'hash';
  interval?: 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour';
  bounds?: Array<{ name: string; from?: string; to?: string }>;
  partitions?: Array<{ name: string; values: unknown[] }>;
  buckets?: number;
  default_partition?: string;
  replace?: boolean;
};

export type HotDataDefinition = {
  table: string;
  dateColumn: string;
  windowYears?: number;
  from?: string;
  to?: string;
};

export type Migration = {
  version: string;
  legacyOrder: number;
  name: string;
  kind: MigrationKind;
  file: string;
  sql: Partial<Record<DatabaseDriver, MigrationSql>>;
  partition?: PartitionDefinition;
  downPartition?: string;
  hotData?: HotDataDefinition[];
  rerun?: boolean;
  resetData?: string[];
  generate?: { table: string; count: number; columns: Record<string, unknown> };
};

function versionParts(value: string): [number, number, number] {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) throw new Error(`Invalid migration semantic version: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(left: string, right: string): number {
  const a = versionParts(left);
  const b = versionParts(right);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function columnstoreTableNames(tables: string[]): Set<string> {
  const names = new Set<string>();
  for (const table of tables) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new Error(`Invalid columnstore table identifier: ${table}`);
    names.add(table.toLowerCase());
  }
  return names;
}

function findCreateTableEnd(sql: string, openParen: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = openParen; index < sql.length; index += 1) {
    const character = sql[index];
    if (quote) {
      if (character === quote) {
        if (sql[index + 1] === quote) index += 1;
        else quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')' && --depth === 0) return index;
  }
  return -1;
}

export function addColumnstoreAccessMethod(sql: string, tables: string[]): string {
  const configured = columnstoreTableNames(tables);
  if (!configured.size) return sql;
  const createTable = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_]*"?)\s*\(/gi;
  let result = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = createTable.exec(sql))) {
    const table = match[1].replaceAll('"', '').toLowerCase();
    if (!configured.has(table)) continue;
    const openParen = createTable.lastIndex - 1;
    const closeParen = findCreateTableEnd(sql, openParen);
    if (closeParen < 0) throw new Error(`Could not find the end of CREATE TABLE ${table}`);
    const suffix = sql.slice(closeParen + 1).match(/^\s*(USING\s+\w+)?/i)?.[1];
    if (suffix) continue;
    result += sql.slice(cursor, closeParen + 1);
    result += ' USING columnstore';
    cursor = closeParen + 1;
    createTable.lastIndex = closeParen + 1;
  }
  return result ? result + sql.slice(cursor) : sql;
}

function parseHotData(value: unknown, file: string): HotDataDefinition[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`Migration ${file} hot_data must be a list`);
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Migration ${file} hot_data[${index}] must be an object`);
    const item = entry as Record<string, unknown>;
    const table = String(item.table || '');
    const dateColumn = String(item.date_column || '');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(dateColumn)) {
      throw new Error(`Migration ${file} hot_data[${index}] table and date_column must be safe identifiers`);
    }
    const window = item.window && typeof item.window === 'object' && !Array.isArray(item.window)
      ? item.window as Record<string, unknown>
      : {};
    const windowYears = window.years === undefined ? undefined : Number(window.years);
    const from = window.from === undefined ? undefined : String(window.from);
    const to = window.to === undefined ? undefined : String(window.to);
    if (windowYears !== undefined && (!Number.isInteger(windowYears) || windowYears <= 0)) {
      throw new Error(`Migration ${file} hot_data[${index}].window.years must be a positive integer`);
    }
    if (!windowYears && (!from || !to)) throw new Error(`Migration ${file} hot_data[${index}] requires window.years or window.from/window.to`);
    if (windowYears && (from || to)) throw new Error(`Migration ${file} hot_data[${index}] cannot combine years and explicit bounds`);
    return { table, dateColumn, windowYears, from, to };
  });
}

function parseGenerator(value: unknown, file: string): Migration['generate'] | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Migration ${file} generate must be an object`);
  const item = value as Record<string, unknown>;
  const table = String(item.table || '');
  const count = Number(item.count);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) || !Number.isInteger(count) || count < 1 || count > 1_000_000) {
    throw new Error(`Migration ${file} generate requires a safe table and count between 1 and 1000000`);
  }
  if (!item.columns || typeof item.columns !== 'object' || Array.isArray(item.columns)) throw new Error(`Migration ${file} generate.columns must be an object`);
  return { table, count, columns: item.columns as Record<string, unknown> };
}

function parseMigrationSql(value: unknown, file: string): Partial<Record<DatabaseDriver, MigrationSql>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Migration ${file} must define a type mapping with database-specific up and down properties`);
  }
  const definitions = value as Record<string, unknown>;
  const result: Partial<Record<DatabaseDriver, MigrationSql>> = {};
  const resolving = new Set<string>();

  const resolve = (driver: DatabaseDriver): MigrationSql => {
    const existing = result[driver];
    if (existing) return existing;
    if (!(driver in definitions)) throw new Error(`Migration ${file} type.${driver} references an undefined database type`);
    if (resolving.has(driver)) throw new Error(`Migration ${file} has a circular database type alias at ${driver}`);
    resolving.add(driver);
    const definition = definitions[driver];
    if (typeof definition === 'string') {
      if (!['postgres', 'duckdb', 'mysql', 'oracle', 'sqlserver'].includes(definition)) {
        throw new Error(`Migration ${file} type.${driver} references unsupported database type: ${definition}`);
      }
      const resolved = resolve(definition as DatabaseDriver);
      result[driver] = resolved;
      resolving.delete(driver);
      return resolved;
    }
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new Error(`Migration ${file} type.${driver} must be an object or database type alias`);
    }
    const item = definition as Record<string, unknown>;
    if (typeof item.up !== 'string' || typeof item.down !== 'string') {
      throw new Error(`Migration ${file} type.${driver} must define string up and down properties`);
    }
    const resolved = { up: item.up, down: item.down };
    result[driver] = resolved;
    resolving.delete(driver);
    return resolved;
  };

  for (const [driver, definition] of Object.entries(value as Record<string, unknown>)) {
    if (!['postgres', 'duckdb', 'mysql', 'oracle', 'sqlserver'].includes(driver)) {
      throw new Error(`Migration ${file} has unsupported database type: ${driver}`);
    }
    resolve(driver as DatabaseDriver);
  }
  if (!Object.keys(result).length) throw new Error(`Migration ${file} must define at least one database type`);
  return result;
}

export function migrationSqlForDriver(migration: Migration, driver: DatabaseDriver): MigrationSql {
  const sql = migration.sql[driver];
  if (!sql) throw new Error(`Migration ${migration.file} does not support database type ${driver}`);
  return sql;
}

export async function cleanDatabase(
  repository: MigrationRepository,
  migrationsRoot: string,
  migrationTable = 'schema_migrations',
  kinds: MigrationKind[] = ['schema', 'data'],
): Promise<void> {
  const migrations = discoverMigrations(migrationsRoot).filter((migration) => kinds.includes(migration.kind));
  const driver = repository.driver;
  if (!driver) throw new Error('Migration repository must declare its database driver');
  const tableExistsQuery = driver === 'oracle'
    ? 'SELECT 1 AS present FROM user_tables WHERE table_name = UPPER(?)'
    : 'SELECT 1 AS present FROM information_schema.tables WHERE LOWER(table_name) = LOWER(?)';
  const tableExists = await repository.query(
    tableExistsQuery,
    [migrationTable],
  );
  if (!tableExists.length) return;
  const appliedRows = await repository.query(`SELECT version FROM ${migrationTable}`);
  const applied = new Set(appliedRows.map((row) => {
    const stored = String(row.version);
    return /^\d+$/.test(stored) ? `0.0.${stored}` : stored;
  }));
  for (const migration of [...migrations].reverse()) {
    if (!applied.has(migration.version)) continue;
    await repository.runStatements(migrationSqlForDriver(migration, driver).down);
  }
  await repository.run(`DELETE FROM ${migrationTable}`);
}

function generatedValue(value: unknown, index: number): unknown {
  if (typeof value !== 'string') return value;
  return value.replaceAll('${index}', String(index)).replaceAll('${n}', String(index + 1))
    .replace(/\$\{mod:(\d+)\}/g, (_match, modulus) => String((index % Number(modulus)) + 1))
    .replace(/\$\{cycle:([^}]+)\}/g, (_match, values) => String(String(values).split('|')[index % String(values).split('|').length]));
}

function loadMigrations(root: string): Migration[] {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  const migrations = entries
    .filter((name) => /^\d{14}-\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*\.ya?ml$/.test(name))
    .map((name) => {
      const match = /^(\d{14})-(\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)\.ya?ml$/.exec(name);
      if (!match) throw new Error(`Invalid migration filename: ${name}`);
      const [, timestamp, order, description] = match;
      const parsed = Bun.YAML.parse(readFileSync(join(root, name), 'utf8')) as {
        version?: unknown;
        kind?: unknown;
        type?: unknown;
        partition?: unknown;
        down_partition?: unknown;
        hot_data?: unknown;
        rerun?: unknown;
        reset_data?: unknown;
        generate?: unknown;
      };
      const sql = parseMigrationSql(parsed?.type, name);
      const kind = parsed.kind === undefined ? 'schema' : String(parsed.kind);
      if (kind !== 'schema' && kind !== 'data') throw new Error(`Migration ${name} kind must be schema or data`);
      const version = parsed.version === undefined ? `0.0.${Number(order)}` : String(parsed.version);
      versionParts(version);
      const resetData = parsed.reset_data === undefined ? undefined
        : Array.isArray(parsed.reset_data) ? parsed.reset_data.map(String) : (() => { throw new Error(`Migration ${name} reset_data must be a table list`); })();
      return {
        version,
        legacyOrder: Number(order),
        name: order,
        kind: kind as MigrationKind,
        file: name,
        sql,
        timestamp,
        description,
        partition: parsed.partition as PartitionDefinition | undefined,
        downPartition: typeof parsed.down_partition === 'string'
          ? parsed.down_partition
          : (parsed.down_partition as { table?: string } | undefined)?.table,
        hotData: parseHotData(parsed.hot_data, name),
        rerun: parsed.rerun === true,
        resetData,
        generate: parseGenerator(parsed.generate, name),
      };
    })
    .sort((a, b) => compareVersions(a.version, b.version) || a.legacyOrder - b.legacyOrder);

  for (let index = 1; index < migrations.length; index += 1) {
    if (migrations[index - 1].version === migrations[index].version) {
      throw new Error(`Duplicate migration order: ${migrations[index].name}`);
    }
  }
  return migrations;
}

export async function migrateDatabase(
  repository: MigrationRepository,
  migrationsRoot: string,
  target?: number | string,
  migrationTable = 'schema_migrations',
  kinds: MigrationKind[] = ['schema', 'data'],
  options: MigrationOptions = {},
): Promise<void> {
  const migrations = loadMigrations(migrationsRoot).filter((migration) => kinds.includes(migration.kind));
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(migrationTable)) throw new Error(`Invalid migration table: ${migrationTable}`);
  await repository.runStatements(`
    CREATE TABLE IF NOT EXISTS ${migrationTable} (
      version VARCHAR PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const appliedRows = await repository.query(`SELECT version FROM ${migrationTable}`);
  const applied = new Set(appliedRows.map((row) => {
    const stored = String(row.version);
    return /^\d+$/.test(stored) ? `0.0.${stored}` : stored;
  }));
  const desired = target === undefined ? migrations.at(-1)?.version || '0.0.0'
    : typeof target === 'number' ? `0.0.${target}` : target;
  versionParts(desired);
  const driver = repository.driver;
  if (!driver) throw new Error('Migration repository must declare its database driver');

  for (const migration of migrations) {
    if (compareVersions(migration.version, desired) <= 0 && (!applied.has(migration.version) || migration.rerun)) {
      if (migration.resetData?.length) {
        if (process.env.CORE3_ENV && process.env.CORE3_ENV !== 'development') throw new Error(`Migration ${migration.file} reset_data is development-only`);
        for (const table of migration.resetData) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new Error(`Invalid reset table: ${table}`);
          await repository.runStatements(`DELETE FROM ${table}`);
        }
      }
      const sql = migrationSqlForDriver(migration, driver);
      await repository.runStatements(addColumnstoreAccessMethod(sql.up, options.columnstoreTables || []));
      if (migration.generate) {
        const columns = Object.keys(migration.generate.columns);
        if (!columns.every((column) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column))) throw new Error(`Migration ${migration.file} has an invalid generated column`);
        const placeholders = columns.map(() => '?').join(', ');
        for (let index = 0; index < migration.generate.count; index += 1) {
          await repository.run(
            `INSERT INTO ${migration.generate.table}(${columns.join(', ')}) VALUES(${placeholders})`,
            columns.map((column) => generatedValue(migration.generate!.columns[column], index)),
          );
        }
      }
      if (migration.partition) {
        if (!repository.partition) throw new Error(`Database does not support partitioning ${migration.partition.table}`);
        await repository.partition(migration.partition);
      }
      if (applied.has(migration.version)) {
        await repository.run(`UPDATE ${migrationTable} SET applied_at = CURRENT_TIMESTAMP WHERE version = ?`, [migration.version]);
      } else {
        await repository.run(`INSERT INTO ${migrationTable}(version) VALUES(?)`, [migration.version]);
      }
      applied.add(migration.version);
    }
  }
  for (const migration of [...migrations].reverse()) {
    if (compareVersions(migration.version, desired) > 0 && applied.has(migration.version)) {
      if (migration.downPartition) {
        if (!repository.unpartition) throw new Error(`Database does not support unpartitioning ${migration.downPartition}`);
        await repository.unpartition(migration.downPartition);
      }
      const sql = migrationSqlForDriver(migration, driver);
      await repository.runStatements(sql.down);
      await repository.run(`DELETE FROM ${migrationTable} WHERE version = ?`, [migration.version]);
    }
  }
}

export function discoverMigrations(root: string): Migration[] {
  return loadMigrations(root);
}
