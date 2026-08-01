import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

export async function initTmsDatabase(repository: any, root: string): Promise<void> {
  const dbRoot = join(root, 'db');
  await repository.runStatements(readFileSync(join(dbRoot, 'schema.sql'), 'utf8'));
  await repository.runStatements(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const migrationDir = join(dbRoot, 'migrations');
  for (const file of readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
    const version = file.split('-', 1)[0];
    const applied = await repository.query('SELECT 1 FROM schema_migrations WHERE version = ?', [version]);
    if (applied.length) continue;
    await repository.runStatements(readFileSync(join(migrationDir, file), 'utf8'));
    await repository.run('INSERT INTO schema_migrations(version) VALUES(?)', [version]);
  }
  if (await repository.countRows('roles') === 0) {
    const seed = readFileSync(join(dbRoot, 'seed.sql'), 'utf8')
      .replace(/\n-- ── Translations[\s\S]*$/m, '\n');
    await repository.runStatements(seed);
    console.log('✓ Database seeded');
  }
}
