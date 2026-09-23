import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlMutationRuntime } from '@core3/server/yaml-mutation-runtime';

// The opt-in PostgreSQL URL must point to a disposable test database: migrations write fixtures.
for (const driver of ['duckdb', ...(process.env.CORE3_TEST_POSTGRES_URL ? ['postgres'] : [])]) for (const nested of [false, true]) test(`concurrent ${nested ? 'dashboard' : 'group'} reorders cannot both commit from the same list version (${driver})`, async () => {
  const database = driver === 'postgres' ? PostgresDatabase.open(process.env.CORE3_TEST_POSTGRES_URL!) : await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const root = join(import.meta.dir, '../services/spreadsheet');
  await migrateDatabase(repository, join(root, 'migrations'), undefined, 'reorder_concurrency_migrations', ['schema', 'data']);
  const apiFile = nested ? 'api/dashboard-group.yaml' : 'api/dashboard-groups.yaml';
  const actionId = nested ? 'reorder_group_dashboards' : 'reorder_dashboard_groups';
  const mutation = (Bun.YAML.parse(readFileSync(join(root, apiFile), 'utf8')) as any).actions.find((action: any) => action.id === actionId).mutation;
  const query = nested
    ? "SELECT id, row_version FROM spreadsheet_dashboards WHERE group_id = 'sdg-custom' AND company_name = 'Global' ORDER BY sequence, name, id"
    : "SELECT id, row_version FROM spreadsheet_dashboard_groups WHERE company_name = 'Global' ORDER BY sequence, name, id";
  const untouchedQuery = nested
    ? "SELECT id, sequence, row_version FROM spreadsheet_dashboards WHERE group_id <> 'sdg-custom' ORDER BY id"
    : "SELECT id, sequence, row_version FROM spreadsheet_dashboard_groups WHERE company_name <> 'Global' ORDER BY id";
  const untouched = await repository.query(untouchedQuery);
  const rows = await repository.query(query);
  expect(rows.length).toBeGreaterThan(1);
  const signature = rows.map(row => `${row.id}:${row.row_version}`).join('|');
  const connect = database.connect.bind(database);
  let arrivals = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const deadline = setTimeout(release, 3000);
  database.connect = () => {
    const connection = connect();
    const run = connection.run.bind(connection);
    connection.run = async (sql: string, ...args: any[]) => {
      if (sql.startsWith('WITH ranked AS')) {
        arrivals++;
        if (arrivals === 2) release();
        await barrier;
      }
      return run(sql, ...args);
    };
    return connection;
  };
  try {
    const results = await Promise.allSettled([
      repository.executeMutation(mutation, { id: rows[0].id, target_id: rows.at(-1)!.id, order_signature: signature, company_name: 'Global' }),
      repository.executeMutation(mutation, { id: rows.at(-1)!.id, target_id: rows[0].id, order_signature: signature, company_name: 'Global' }),
    ]);
    expect(arrivals).toBe(2);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409, code: nested ? 'SPREADSHEET_DASHBOARD_ORDER_STALE' : 'SPREADSHEET_DASHBOARD_GROUP_ORDER_STALE' });
    const actual = await repository.query(query);
    const expected = results[0].status === 'fulfilled'
      ? [...rows.slice(1), rows[0]] : [rows.at(-1)!, ...rows.slice(0, -1)];
    expect(actual.map(row => row.id)).toEqual(expected.map(row => row.id));
    expect(actual.map(row => Number(row.row_version))).toEqual(expected.map(row => Number(row.row_version) + 1));
    expect(await repository.query(untouchedQuery)).toEqual(untouched);
  } finally { clearTimeout(deadline); release(); await new Promise<void>(resolve => database.close(resolve)); }
});

test('maps only declared transaction conflicts after rollback', async () => {
  const runtime = new YamlMutationRuntime();
  for (const code of ['40001', '40P01', '40003', '23505']) {
    const statements: string[] = [];
    const original = Object.assign(new Error('Database detail'), { code });
    const connection = {
      async run(sql: string) { statements.push(sql); if (sql === 'UPDATE records SET value = 1') throw original; },
      all() { throw new Error('Unexpected query'); },
    };
    const definition = { steps: ['UPDATE records SET value = 1'], transaction_conflict: { code: 'ORDER_STALE', message: 'Reload the list.' } };
    const error = await runtime.execute(connection, definition).catch(error => error);
    if (['40001', '40P01'].includes(code)) expect(error).toMatchObject({ status: 409, code: 'ORDER_STALE', message: 'Reload the list.', cause: original });
    else expect(error).toBe(original);
    expect(statements).toEqual(['BEGIN TRANSACTION', 'UPDATE records SET value = 1', 'ROLLBACK']);
    expect(await runtime.execute(connection, { steps: definition.steps }).catch(error => error)).toBe(original);
  }
});

test('rejects malformed isolation settings before beginning a mutation', async () => {
  let calls = 0;
  const connection = { run() { calls++; }, all() { calls++; } };
  const runtime = new YamlMutationRuntime(undefined, 'postgres');
  await expect(runtime.execute(connection, { transaction_isolation: { postgresql: 'serializable' } } as any)).rejects.toMatchObject({ status: 500 });
  expect(calls).toBe(0);
});
