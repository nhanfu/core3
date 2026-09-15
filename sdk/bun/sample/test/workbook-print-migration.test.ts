import { expect, test } from 'bun:test';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { splitSQL } from '@core3/server/database/sql';

// PostgreSQL must be a disposable database; this test executes a schema rollback.
for (const driver of ['duckdb', ...(process.env.CORE3_TEST_POSTGRES_URL ? ['postgres'] : [])]) test(`job kind migration preserves legacy XLSX and removes incompatible print and share artifacts on rollback (${driver})`, async () => {
  const folder = mkdtempSync(join(tmpdir(), 'core3-print-migration-'));
  const db = driver === 'postgres' ? PostgresDatabase.open(process.env.CORE3_TEST_POSTGRES_URL!) : await DuckDbDatabase.open(':memory:');
  try {
    const repository = new YamlRepository(db);
    const root = join(import.meta.dir, '../services/spreadsheet/migrations');
    const current = '20260915230000-019-print-jobs.yaml';
    for (const file of readdirSync(root).filter(file => file.endsWith('.yaml') && file < current)) copyFileSync(join(root, file), join(folder, file));
    await migrateDatabase(repository, folder, undefined, 'print_migration_test', ['schema', 'data']);
    await repository.query("INSERT INTO spreadsheet_export_jobs(id, workbook_id, revision_id, owner_id, company_name, name, state, artifact_base64, required_permissions, created_at_ms, updated_at_ms, expires_at_ms) VALUES ('legacy', 'book', 'r1', 'owner', 'Acme', 'Legacy export', 'completed', 'original-xlsx', '[]', 1, 1, 9999999999999)", []);
    copyFileSync(join(root, current), join(folder, current));
    await migrateDatabase(repository, folder, undefined, 'print_migration_test', ['schema', 'data']);
    expect(await repository.query('SELECT id, kind, artifact_base64 FROM spreadsheet_export_jobs', [])).toEqual([{ id: 'legacy', kind: 'xlsx', artifact_base64: 'original-xlsx' }]);
    await repository.query("INSERT INTO spreadsheet_export_jobs(id, workbook_id, revision_id, owner_id, company_name, name, state, kind, artifact_base64, required_permissions, created_at_ms, updated_at_ms, expires_at_ms) VALUES ('preview', 'book', 'r1', 'owner', 'Acme', 'Print preview', 'completed', 'print', 'preview-json', '[]', 1, 1, 9999999999999)", []);
    await repository.query("INSERT INTO spreadsheet_export_jobs(id, workbook_id, revision_id, owner_id, company_name, name, state, kind, artifact_base64, required_permissions, created_at_ms, updated_at_ms, expires_at_ms) VALUES ('link', 'book', 'r1', 'owner', 'Acme', 'Public link', 'completed', 'share', 'link-json', '[]', 1, 1, 9999999999999)", []);
    const migration = Bun.YAML.parse(readFileSync(join(root, current), 'utf8')) as any;
    for (const query of splitSQL(migration.type.postgres.down)) await repository.query(query, []);
    expect(await repository.query('SELECT id, artifact_base64 FROM spreadsheet_export_jobs', [])).toEqual([{ id: 'legacy', artifact_base64: 'original-xlsx' }]);
    const indexes = await repository.query(driver === 'postgres' ? "SELECT indexname FROM pg_indexes WHERE tablename = 'spreadsheet_export_jobs' AND indexname IN ('spreadsheet_export_jobs_pending', 'spreadsheet_export_jobs_owner_pending')" : "SELECT index_name FROM duckdb_indexes() WHERE index_name IN ('spreadsheet_export_jobs_pending', 'spreadsheet_export_jobs_owner_pending')", []);
    expect(indexes).toHaveLength(2);
  } finally { await new Promise<void>(resolve => db.close(resolve)); rmSync(folder, { recursive: true, force: true }); }
});
