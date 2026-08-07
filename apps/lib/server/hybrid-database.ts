import { DuckDBInstance } from '@duckdb/node-api';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

type NativeConnection = any;

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Invalid database identifier: ${value}`);
  return `"${value}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function isRead(sql: string): boolean {
  return /^(SELECT|WITH|PRAGMA|SHOW|DESCRIBE|EXPLAIN)\b/i.test(sql.trim());
}

/**
 * Durable-first DuckDB service.
 *
 * The disk instance is the source of truth. The memory instance is a read
 * cache and is updated only after the durable statement/appender succeeds.
 * `connect()` intentionally exposes the callback-shaped API used by the
 * existing repositories, so the migration is local to the database seam.
 */
export class HybridDuckDbDatabase {
  private mirroring = true;

  private constructor(
    private readonly disk: any,
    private memory: any,
    private readonly path: string,
  ) {}

  static async open(path: string): Promise<HybridDuckDbDatabase> {
    if (path !== ':memory:') await mkdir(dirname(path), { recursive: true });
    const disk = await DuckDBInstance.create(path);
    const memory = await DuckDBInstance.create(':memory:');
    const database = new HybridDuckDbDatabase(disk, memory, path);
    await database.copySchema();
    return database;
  }

  async withDurableWrites<T>(fn: () => Promise<T>): Promise<T> {
    this.mirroring = false;
    try {
      return await fn();
    } finally {
      this.mirroring = true;
      await this.refreshCache();
    }
  }

  private async refreshCache(): Promise<void> {
    this.memory.closeSync();
    this.memory = await DuckDBInstance.create(':memory:');
    await this.copySchema();
  }

  private async copySchema(): Promise<void> {
    const diskConnection = await this.disk.connect();
    const memoryConnection = await this.memory.connect();
    try {
      const tables = (await diskConnection.runAndReadAll(
        "SELECT table_name, sql FROM duckdb_tables() WHERE schema_name = 'main' ORDER BY table_name",
      )).getRowObjectsJS();
      if (tables.length && this.path !== ':memory:') {
        // Flush migration WAL pages before the read-only cache snapshot opens
        // the same database file through ATTACH.
        await diskConnection.run('CHECKPOINT');
        await memoryConnection.run(`ATTACH ${quoteLiteral(this.path)} AS disk (READ_ONLY)`);
        const pending = tables.map((row: any) => ({
          name: String(row.table_name || ''),
          sql: String(row.sql || ''),
        })).filter((row: any) => row.name && row.sql);
        const created = new Set<string>();
        while (pending.length) {
          const ready = pending.filter((row: any) => {
            const references = [...row.sql.matchAll(/REFERENCES\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map((match) => match[1].toLowerCase());
            return references.every((reference) => reference === row.name.toLowerCase() || created.has(reference) || !pending.some((candidate: any) => candidate.name.toLowerCase() === reference));
          });
          const batch = ready.length ? ready : [pending[0]];
          for (const row of batch) {
            const index = pending.indexOf(row);
            if (index >= 0) pending.splice(index, 1);
            // DuckDB can expose an extra separator when a table gained a
            // constraint through ALTER TABLE; normalize that harmless form
            // before replaying the schema in the cache.
            const schemaSql = row.sql.replace(/,\s*,/g, ',');
            await memoryConnection.run(schemaSql);
            await memoryConnection.run(`INSERT INTO main.${quoteIdentifier(row.name)} SELECT * FROM disk.main.${quoteIdentifier(row.name)}`);
            created.add(row.name.toLowerCase());
          }
        }
        // `duckdb_tables().sql` contains table constraints, unlike CTAS.
        // Replaying it is necessary because migrations may add tables with
        // foreign keys while the cache is already populated.
        await memoryConnection.run('DETACH disk');
      }
    } finally {
      memoryConnection.closeSync();
      diskConnection.closeSync();
    }
  }

  connect(): any {
    const diskPromise = this.disk.connect();
    const memoryPromise = this.memory.connect();
    let inTransaction = false;
    const close = (callback?: () => void) => {
      Promise.all([diskPromise, memoryPromise]).then(([disk, memory]) => {
        memory.closeSync();
        disk.closeSync();
        callback?.();
      });
    };
    return {
      run: (sql: string, ...args: any[]) => {
        const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const execute = async () => {
          const [disk, memory] = await Promise.all([diskPromise, memoryPromise]);
          const normalized = sql.trim();
          const target = this.mirroring && isRead(normalized) ? memory : disk;
          if (/^BEGIN\b/i.test(normalized)) inTransaction = true;
          await target.run(normalized, params);
          if (!isRead(normalized) && this.mirroring) {
            // Durability is established before the cache sees the mutation.
            await memory.run(normalized, params);
          }
          if (/^(COMMIT|ROLLBACK)\b/i.test(normalized)) inTransaction = false;
        };
        const promise = execute();
        if (callback) promise.then(() => callback(null), (error) => callback(error));
        return promise;
      },
      all: (sql: string, ...args: any[]) => {
        const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const promise = (async () => {
          const [disk, memory] = await Promise.all([diskPromise, memoryPromise]);
          const result = await (this.mirroring && isRead(sql) ? memory : disk).runAndReadAll(sql, params);
          return result.getRowObjectsJS();
        })();
        if (callback) promise.then((rows) => callback(null, rows), (error) => callback(error));
        return promise;
      },
      close,
      get inTransaction() { return inTransaction; },
    };
  }

  /** Append complete rows using DuckDB's native appender, disk first. */
  async append(table: string, rows: unknown[][]): Promise<void> {
    if (!rows.length) return;
    const durable = await this.disk.connect();
    const cached = await this.memory.connect();
    const columnInfo = (await durable.runAndReadAll(`PRAGMA table_info(${quoteIdentifier(table)})`)).getRowObjectsJS();
    const columnTypes = columnInfo.map((column: any) => String(column.type || '').toUpperCase());
    const appendTo = async (connection: NativeConnection) => {
      const appender = await connection.createAppender(table);
      try {
        for (const row of rows) {
          for (const [index, value] of row.entries()) {
            const type = columnTypes[index] || '';
            if (value === null || value === undefined) appender.appendNull();
            else if (type.includes('BIGINT')) appender.appendBigInt(BigInt(value as any));
            else if (type.includes('INT')) appender.appendInteger(Number(value));
            else if (type.includes('DOUBLE') || type.includes('DECIMAL') || type.includes('FLOAT')) appender.appendDouble(Number(value));
            else if (type.includes('BOOL')) appender.appendBoolean(Boolean(value));
            else appender.appendVarchar(String(value));
          }
          appender.endRow();
        }
        appender.flushSync();
      } finally {
        appender.closeSync();
      }
    };
    try {
      await appendTo(durable);
      await appendTo(cached);
    } finally {
      durable.closeSync();
      cached.closeSync();
    }
  }

  close(callback?: () => void): void {
    this.memory.closeSync();
    this.disk.closeSync();
    callback?.();
  }
}
