import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

for (const driver of ['duckdb', ...(process.env.CORE3_TEST_POSTGRES_URL ? ['postgres'] : [])]) for (const kind of ['import', 'export']) test(`concurrent ${kind} requests cannot exceed the user's pending-job limit (${driver})`, async () => {
  const db = driver === 'postgres' ? PostgresDatabase.open(process.env.CORE3_TEST_POSTGRES_URL!) : await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(db);
  const root = join(import.meta.dir, '../services/spreadsheet');
  let release!: () => void, arrivals = 0;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const deadline = setTimeout(release, 3000);
  try {
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'job_admission_migrations', ['schema', 'data']);
    const definition = Bun.YAML.parse(readFileSync(join(root, 'workbooks.yaml'), 'utf8')) as any;
    const mutation = definition.operations[`${kind}_job_create`].mutation;
    const connect = db.connect.bind(db);
    db.connect = () => {
      const connection = connect(), run = connection.run.bind(connection);
      connection.run = async (sql: string, ...args: any[]) => {
        if (sql.startsWith('UPDATE spreadsheet_job_admission')) {
          arrivals++; if (arrivals === 2) release(); await barrier;
        }
        return run(sql, ...args);
      };
      return connection;
    };
    const owner = randomUUID();
    const params = { current_user_id: owner, current_company_name: 'Acme', name: 'Admission race', id: 'book', workbook_id: 'copy', revision_id: 'START_REVISION', workbook_snapshot: '{}', input_base64: 'fixture', required_permissions: '[]', now: Date.now(), expires_at_ms: Date.now() + 86400000, max_pending: 1 };
    const results = await Promise.allSettled([1, 2].map(() => repository.executeMutation(mutation, { ...params, job_id: randomUUID(), workbook_id: randomUUID() })));
    expect(arrivals).toBe(2);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect([`WORKBOOK_${kind.toUpperCase()}_LIMIT`, `WORKBOOK_${kind.toUpperCase()}_ADMISSION_BUSY`]).toContain(rejected.reason.code);
    expect([409, 429]).toContain(rejected.reason.status);
    const rows = await repository.query(`SELECT id FROM spreadsheet_${kind}_jobs WHERE owner_id = ? AND company_name = ? AND state = 'queued'`, [owner, 'Acme']);
    expect(rows).toHaveLength(1);
    await expect(repository.executeMutation(mutation, { ...params, job_id: randomUUID(), workbook_id: randomUUID() })).rejects.toMatchObject({ status: 429, code: `WORKBOOK_${kind.toUpperCase()}_LIMIT` });
    for (const scope of [{ current_user_id: randomUUID() }, { current_company_name: 'Other' }]) {
      expect(await repository.executeMutation(mutation, { ...params, ...scope, job_id: randomUUID(), workbook_id: randomUUID() })).toHaveProperty('id');
    }
    await repository.executeMutation(definition.operations[`${kind}_job_cancel`].mutation, { ...params, job_id: rows[0].id });
    expect(await repository.executeMutation(mutation, { ...params, job_id: randomUUID(), workbook_id: randomUUID() })).toHaveProperty('id');
  } finally { clearTimeout(deadline); release(); await new Promise<void>(resolve => db.close(resolve)); }
});
