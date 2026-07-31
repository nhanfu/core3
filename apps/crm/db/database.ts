import duckdb from 'duckdb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const db = new duckdb.Database(process.env.CRM_DB_PATH || join(import.meta.dir, 'crm.duckdb'));

export function run(connection: any, sql: string, params: any[] = []) {
  return new Promise<void>((resolve, reject) => connection.run(sql, ...params, (error: any) => error ? reject(error) : resolve()));
}

export function all(connection: any, sql: string, params: any[] = []) {
  return new Promise<any[]>((resolve, reject) => connection.all(sql, ...params, (error: any, rows: any[]) => {
    if (error) return reject(error);
    resolve((rows || []).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value]))));
  }));
}

export async function withDb<T>(callback: (connection: any) => Promise<T>) {
  const connection = db.connect();
  try { return await callback(connection); } finally { await new Promise<void>(resolve => connection.close(() => resolve())); }
}

export function closeDatabase() {
  return new Promise<void>((resolve, reject) => db.close((error: any) => error ? reject(error) : resolve()));
}

export async function initDatabase() {
  await withDb(async connection => {
    for (const statement of readFileSync(join(import.meta.dir, 'schema.sql'), 'utf8').split(';').map(sql => sql.trim()).filter(Boolean)) await run(connection, statement);
    for (const column of [
      "company VARCHAR DEFAULT ''", "status VARCHAR DEFAULT 'new'", "updated_at TIMESTAMP DEFAULT current_timestamp",
      'expected_revenue DOUBLE DEFAULT 0',
    ]) await run(connection, `ALTER TABLE crm_lead ADD COLUMN IF NOT EXISTS ${column}`);
    for (const statement of readFileSync(join(import.meta.dir, 'seed.sql'), 'utf8').split(';').map(sql => sql.trim()).filter(Boolean)) await run(connection, statement);
  });
}
