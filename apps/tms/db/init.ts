import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { migrateDatabase } from '../../lib/server/migrations.ts';

export async function initTmsDatabase(repository: any, root: string): Promise<void> {
  const dbRoot = join(root, 'db');
  await repository.runStatements(readFileSync(join(dbRoot, 'schema.sql'), 'utf8'));
  if (await repository.countRows('roles') === 0) {
    const seed = readFileSync(join(dbRoot, 'seed.sql'), 'utf8')
      .replace(/\n-- ── Translations[\s\S]*$/m, '\n');
    await repository.runStatements(seed);
    console.log('✓ Database seeded');
  }
  await migrateDatabase(repository, join(dbRoot, 'migrations'));
}
