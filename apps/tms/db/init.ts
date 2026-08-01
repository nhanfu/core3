import { join } from 'node:path';
import { migrateDatabase } from '../../lib/server/migrations.ts';

export async function initTmsDatabase(repository: any, root: string): Promise<void> {
  await migrateDatabase(repository, join(root, 'db', 'migrations'));
}
