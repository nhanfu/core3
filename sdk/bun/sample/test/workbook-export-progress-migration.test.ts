import { expect, test } from 'bun:test';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { splitSQL } from '@core3/server/database/sql';

// PostgreSQL is opt-in and must be a disposable database: this exercises rollback.
for (const driver of ['duckdb', ...(process.env.CORE3_TEST_POSTGRES_URL ? ['postgres'] : [])]) test(`export progress migration preserves existing jobs and restores the pending index on upgrade and rollback (${driver})`, async () => {
  const folder = mkdtempSync(join(tmpdir(), 'core3-export-progress-'));
  const db = driver === 'postgres' ? PostgresDatabase.open(process.env.CORE3_TEST_POSTGRES_URL!) : await DuckDbDatabase.open(':memory:');
  try {
    const repository = new YamlRepository(db);
    const root = join(import.meta.dir, '../services/spreadsheet/migrations');
    const prior = '20260915200000-016-export-jobs.yaml', current = '20260915210000-017-export-progress.yaml';
    copyFileSync(join(root, prior), join(folder, prior));
    await migrateDatabase(repository, folder, undefined, 'export_progress_migrations', ['schema']);
    await repository.query("INSERT INTO spreadsheet_export_jobs(id, workbook_id, revision_id, owner_id, company_name, name, state, artifact_base64, required_permissions, created_at_ms, updated_at_ms, expires_at_ms) VALUES ('legacy', 'book', 'r1', 'owner', 'Acme', 'Legacy export', 'completed', 'preserved-file', '[]', 1, 1, 9999999999999)", []);
    copyFileSync(join(root, current), join(folder, current));
    await migrateDatabase(repository, folder, undefined, 'export_progress_migrations', ['schema']);
    const rows = await repository.query('SELECT id, artifact_base64, stage, data_pages_read FROM spreadsheet_export_jobs', []);
    expect(rows.map(row => ({ ...row, data_pages_read: Number(row.data_pages_read) }))).toEqual([{ id: 'legacy', artifact_base64: 'preserved-file', stage: 'queued', data_pages_read: 0 }]);
    const indexes = () => repository.query(driver === 'postgres' ? "SELECT indexname FROM pg_indexes WHERE tablename = 'spreadsheet_export_jobs' AND indexname = 'spreadsheet_export_jobs_pending'" : "SELECT index_name FROM duckdb_indexes() WHERE index_name = 'spreadsheet_export_jobs_pending'", []);
    expect(await indexes()).toHaveLength(1);
    const migration = Bun.YAML.parse(readFileSync(join(root, current), 'utf8')) as any;
    for (const query of splitSQL(migration.type.postgres.down)) await repository.query(query, []);
    expect(await repository.query('SELECT id, artifact_base64 FROM spreadsheet_export_jobs', [])).toEqual([{ id: 'legacy', artifact_base64: 'preserved-file' }]);
    expect(await indexes()).toHaveLength(1);
  } finally { await db.close(); rmSync(folder, { recursive: true, force: true }); }
});
