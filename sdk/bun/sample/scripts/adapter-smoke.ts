import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { openSqlDatabase } from '@core3/server/database/sql-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const driver = String(process.argv[2] || process.env.CORE3_DB_DRIVER || 'duckdb') as any;
const url = process.argv[3] || process.env.CORE3_DATABASE_URL;
const table = driver === 'oracle' ? `api_smoke_orders_${process.pid}` : 'api_smoke_orders';
const database = driver === 'duckdb'
  ? await DuckDbDatabase.open(':memory:')
  : driver === 'postgres'
    ? PostgresDatabase.open(String(url))
    : await openSqlDatabase(driver, String(url));
const repository = new YamlRepository(database);

const setup = driver === 'sqlserver'
  ? `IF OBJECT_ID('${table}', 'U') IS NOT NULL DROP TABLE ${table}; CREATE TABLE ${table} (id VARCHAR(64) PRIMARY KEY, status VARCHAR(32) NOT NULL, amount DECIMAL(18,2) NOT NULL, row_version BIGINT NOT NULL DEFAULT 1);`
  : driver === 'oracle'
    ? `CREATE TABLE ${table} (id VARCHAR2(64) PRIMARY KEY, status VARCHAR2(32) NOT NULL, amount NUMBER(18,2) NOT NULL, row_version NUMBER(19) DEFAULT 1 NOT NULL);`
    : `DROP TABLE IF EXISTS ${table}; CREATE TABLE ${table} (id VARCHAR(64) PRIMARY KEY, status VARCHAR(32) NOT NULL, amount DECIMAL(18,2) NOT NULL, row_version BIGINT NOT NULL DEFAULT 1);`;
await repository.runStatements(setup);
for (const row of [
  ['smoke-1', 'Draft', 10], ['smoke-2', 'Approved', 20], ['smoke-3', 'Approved', 30], ['smoke-4', 'Cancelled', 40],
]) await repository.run(`INSERT INTO ${table}(id, status, amount) VALUES(?, ?, ?)`, row);

const source = { id: table, query: `SELECT id, status, amount, row_version FROM ${table}`, pivot: { fields: ['id', 'status', 'amount'] } };
const listBefore = await repository.querySource(source, {}, 0, 100);
const pivot = await repository.querySource(source, {}, 0, 100, undefined, undefined, {
  columns: ['status'], measures: [{ field: 'amount', aggregate: 'sum', label: 'Amount' }],
});
const created = await repository.executeMutation({ operation: 'insert', table, fields: ['status', 'amount'], result: { query: `SELECT * FROM ${table} WHERE id = :id` } }, { id: 'smoke-created', status: 'Draft', amount: 99 });
const updated = await repository.executeMutation({ operation: 'update', table, fields: ['status', 'amount'], result: { query: `SELECT * FROM ${table} WHERE id = :id` } }, { id: 'smoke-created', status: 'Approved', amount: 101, expected_row_version: 1 });
let staleRejected = false;
try {
  await repository.executeMutation({ operation: 'update', table, fields: ['status'], result: { query: `SELECT * FROM ${table} WHERE id = :id` } }, { id: 'smoke-created', status: 'Cancelled', expected_row_version: 1 });
} catch (error: any) {
  staleRejected = error?.status === 409 && error?.code === 'STALE_RECORD';
}
if (!staleRejected) throw new Error('Optimistic concurrency smoke check did not reject a stale update');
await repository.executeMutation({ operation: 'delete', table, result: { query: `SELECT COUNT(*) AS n FROM ${table}` } }, { id: 'smoke-created', expected_row_version: 2 });
const listAfter = await repository.query(`SELECT COUNT(*) AS n FROM ${table}`);
console.log(JSON.stringify({ driver, listRows: listBefore.data.length, listTotal: listBefore.meta.total, pivotTotal: pivot.meta.total, pivotColumns: pivot.meta.pivotColumns, created: Boolean(created?.id), updatedStatus: updated?.status, staleRejected, remainingRows: Number(listAfter[0]?.n) }, null, 2));
database.close();
