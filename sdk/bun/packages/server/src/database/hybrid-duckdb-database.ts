import { DuckDBInstance } from '@duckdb/node-api';
import type { DatabaseAdapter, DatabaseConnection } from './types.ts';

function normalizeArgs(args: any[]): { params: any[]; callback?: Function } {
  const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
  const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return { params, callback };
}

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Invalid DuckDB identifier: ${value}`);
  return `"${value}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function valueLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return quoteLiteral(value instanceof Date ? value.toISOString() : String(value));
}

/** Durable DuckDB source of truth with an in-memory read copy. */
export class HybridDuckDbDatabase implements DatabaseAdapter {
  private constructor(private readonly durable: any, private readonly memory: any) {}

  static async open(path: string): Promise<HybridDuckDbDatabase> {
    const durable = await DuckDBInstance.create(path);
    const memory = await DuckDBInstance.create(':memory:');
    const database = new HybridDuckDbDatabase(durable, memory);
    await database.hydrate();
    return database;
  }

  private async hydrate(): Promise<void> {
    const durableConnection = await this.durable.connect();
    const memoryConnection = await this.memory.connect();
    try {
      const tables = (await durableConnection.runAndReadAll(
        "SELECT table_name, sql FROM duckdb_tables() WHERE schema_name = 'main' ORDER BY table_name",
      )).getRowObjectsJS();
      const views = (await durableConnection.runAndReadAll(
        "SELECT view_name, sql FROM duckdb_views() WHERE schema_name = 'main'",
      )).getRowObjectsJS();
      if (!tables.length && !views.length) return;
      const pending = [...tables];
      const created = new Set<string>();
      const orderedTables: any[] = [];
      while (pending.length) {
        let progressed = false;
        for (const table of [...pending]) {
          const tableName = String(table.table_name);
          const references = [...String(table.sql || '').matchAll(/REFERENCES\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map((match) => match[1].toLowerCase());
          const unresolved = references.some((reference) => pending.some((candidate: any) => String(candidate.table_name).toLowerCase() === reference) && !created.has(reference));
          if (unresolved) continue;
          if (table.sql) await memoryConnection.run(String(table.sql));
          created.add(tableName.toLowerCase());
          orderedTables.push(table);
          pending.splice(pending.indexOf(table), 1);
          progressed = true;
        }
        if (!progressed) throw new Error(`Unable to hydrate DuckDB schema: ${pending.map((table: any) => table.table_name).join(', ')}`);
      }
      for (const table of orderedTables) {
        const name = quoteIdentifier(String(table.table_name));
        const rows = (await durableConnection.runAndReadAll(`SELECT * FROM main.${name}`)).getRowObjectsJS();
        if (!rows.length) continue;
        const columns = Object.keys(rows[0]);
        const values = rows.map((row: any) => `(${columns.map((column) => valueLiteral(row[column])).join(', ')})`).join(', ');
        await memoryConnection.run(`INSERT INTO main.${name}(${columns.map(quoteIdentifier).join(', ')}) VALUES ${values}`);
      }
      for (const view of views) if (view.sql) await memoryConnection.run(String(view.sql)).catch(() => {});
    } finally {
      durableConnection.closeSync();
      memoryConnection.closeSync();
    }
  }

  connect(): DatabaseConnection {
    const durableConnectionPromise = this.durable.connect();
    const memoryConnectionPromise = this.memory.connect();
    return {
      run: async (sql: string, ...args: any[]) => {
        const { params, callback } = normalizeArgs(args);
        const promise = durableConnectionPromise
          .then((connection: any) => connection.run(sql, params))
          .then(() => memoryConnectionPromise.then((connection: any) => connection.run(sql, params)));
        if (callback) promise.then(() => callback(null), callback);
        return promise;
      },
      all: async (sql: string, ...args: any[]) => {
        const { params, callback } = normalizeArgs(args);
        const promise = memoryConnectionPromise
          .then((connection: any) => connection.runAndReadAll(sql, params))
          .then((result: any) => result.getRowObjectsJS() as any[]);
        if (callback) promise.then((rows: any[]) => callback(null, rows), callback);
        return promise;
      },
      close: (callback?: () => void) => {
        Promise.all([
          durableConnectionPromise.then((connection: any) => connection.closeSync()),
          memoryConnectionPromise.then((connection: any) => connection.closeSync()),
        ]).then(() => callback?.());
      },
      get inTransaction() { return false; },
    };
  }

  close(callback?: () => void): void {
    this.durable.closeSync();
    this.memory.closeSync();
    callback?.();
  }
}
