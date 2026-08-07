import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

export type MigrationRepository = {
  run(sql: string, params?: any[]): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  runStatements(sql: string): Promise<void>;
  partition?(definition: PartitionDefinition): Promise<void>;
  unpartition?(table: string): Promise<void>;
};

export type PartitionDefinition = {
  table: string;
  column?: string;
  strategy: 'range' | 'time' | 'year' | 'list' | 'hash';
  interval?: 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour';
  partitions?: Array<{ name: string; values: unknown[] }>;
  buckets?: number;
  default_partition?: string;
  replace?: boolean;
};

export type Migration = {
  version: number;
  name: string;
  file: string;
  up: string;
  down: string;
  partition?: PartitionDefinition;
  downPartition?: string;
};

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
        up?: unknown;
        down?: unknown;
        partition?: unknown;
        down_partition?: unknown;
      };
      if (typeof parsed?.up !== 'string' || typeof parsed.down !== 'string') {
        throw new Error(`Migration ${name} must define string up and down properties`);
      }
      return {
        version: Number(order),
        name: order,
        file: name,
        up: parsed.up,
        down: parsed.down,
        timestamp,
        description,
        partition: parsed.partition as PartitionDefinition | undefined,
        downPartition: typeof parsed.down_partition === 'string'
          ? parsed.down_partition
          : (parsed.down_partition as { table?: string } | undefined)?.table,
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
): Promise<void> {
  const migrations = loadMigrations(migrationsRoot);
  await repository.runStatements(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const appliedRows = await repository.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => Number(row.version)));
  const desired = target ?? (migrations.at(-1)?.version || 0);
  if (!Number.isInteger(desired) || desired < 0) throw new Error(`Invalid migration target: ${desired}`);

  for (const migration of migrations) {
    if (migration.version <= desired && !applied.has(migration.version)) {
      await repository.runStatements(migration.up);
      if (migration.partition) {
        if (!repository.partition) throw new Error(`Database does not support partitioning ${migration.partition.table}`);
        await repository.partition(migration.partition);
      }
      await repository.run('INSERT INTO schema_migrations(version) VALUES(?)', [migration.name]);
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
      await repository.run('DELETE FROM schema_migrations WHERE version = ?', [migration.name]);
    }
  }
}

export function discoverMigrations(root: string): Migration[] {
  return loadMigrations(root);
}
