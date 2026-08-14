import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

export type MigrationRepository = {
  run(sql: string, params?: any[]): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  runStatements(sql: string): Promise<void>;
  partition?(definition: PartitionDefinition): Promise<void>;
  unpartition?(table: string): Promise<void>;
};

export type MigrationKind = 'schema' | 'data';

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
  version: number;
  name: string;
  kind: MigrationKind;
  file: string;
  up: string;
  down: string;
  partition?: PartitionDefinition;
  downPartition?: string;
  hotData?: HotDataDefinition[];
};

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
        kind?: unknown;
        up?: unknown;
        down?: unknown;
        partition?: unknown;
        down_partition?: unknown;
        hot_data?: unknown;
      };
      if (typeof parsed?.up !== 'string' || typeof parsed.down !== 'string') {
        throw new Error(`Migration ${name} must define string up and down properties`);
      }
      const kind = parsed.kind === undefined ? 'schema' : String(parsed.kind);
      if (kind !== 'schema' && kind !== 'data') throw new Error(`Migration ${name} kind must be schema or data`);
      return {
        version: Number(order),
        name: order,
        kind: kind as MigrationKind,
        file: name,
        up: parsed.up,
        down: parsed.down,
        timestamp,
        description,
        partition: parsed.partition as PartitionDefinition | undefined,
        downPartition: typeof parsed.down_partition === 'string'
          ? parsed.down_partition
          : (parsed.down_partition as { table?: string } | undefined)?.table,
        hotData: parseHotData(parsed.hot_data, name),
      };
    })
    .sort((a, b) => a.version - b.version);

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
  target?: number,
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
  const applied = new Set(appliedRows.map((row) => Number(row.version)));
  const desired = target ?? (migrations.at(-1)?.version || 0);
  if (!Number.isInteger(desired) || desired < 0) throw new Error(`Invalid migration target: ${desired}`);

  for (const migration of migrations) {
    if (migration.version <= desired && !applied.has(migration.version)) {
      await repository.runStatements(addColumnstoreAccessMethod(migration.up, options.columnstoreTables || []));
      if (migration.partition) {
        if (!repository.partition) throw new Error(`Database does not support partitioning ${migration.partition.table}`);
        await repository.partition(migration.partition);
      }
      await repository.run(`INSERT INTO ${migrationTable}(version) VALUES(?)`, [migration.name]);
      applied.add(migration.version);
    }
  }
  for (const migration of [...migrations].reverse()) {
    if (migration.version > desired && applied.has(migration.version)) {
      if (migration.downPartition) {
        if (!repository.unpartition) throw new Error(`Database does not support unpartitioning ${migration.downPartition}`);
        await repository.unpartition(migration.downPartition);
      }
      await repository.runStatements(migration.down);
      await repository.run(`DELETE FROM ${migrationTable} WHERE version = ?`, [migration.name]);
    }
  }
}

export function discoverMigrations(root: string): Migration[] {
  return loadMigrations(root);
}
