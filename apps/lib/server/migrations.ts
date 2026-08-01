import { join } from 'node:path';
import { readdirSync, readFileSync, statSync } from 'node:fs';

export type MigrationRepository = {
  run(sql: string, params?: any[]): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  runStatements(sql: string): Promise<void>;
};

export type Migration = {
  version: number;
  name: string;
  root: string;
  up: string;
  down: string;
};

function loadMigrations(root: string): Migration[] {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  return entries
    .map((name) => ({ name, root: join(root, name) }))
    .filter(({ name, root: migrationRoot }) => /^\d+$/.test(name) && statSync(migrationRoot).isDirectory())
    .map(({ name, root: migrationRoot }) => ({
      version: Number(name),
      name,
      root: migrationRoot,
      up: readFileSync(join(migrationRoot, 'up.sql'), 'utf8'),
      down: readFileSync(join(migrationRoot, 'down.sql'), 'utf8'),
    }))
    .sort((a, b) => a.version - b.version);
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
      await repository.run('INSERT INTO schema_migrations(version) VALUES(?)', [migration.name]);
      applied.add(migration.version);
    }
  }
  for (const migration of [...migrations].reverse()) {
    if (migration.version > desired && applied.has(migration.version)) {
      await repository.runStatements(migration.down);
      await repository.run('DELETE FROM schema_migrations WHERE version = ?', [migration.name]);
    }
  }
}

export function discoverMigrations(root: string): Migration[] {
  return loadMigrations(root);
}
