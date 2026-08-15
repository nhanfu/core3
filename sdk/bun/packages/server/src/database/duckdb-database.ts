import { DuckDBInstance } from '@duckdb/node-api';
import type { DatabaseAdapter, DatabaseConnection } from './types.ts';
import { createDialect } from './dialects.ts';

function normalizeArgs(args: any[]): { params: any[]; callback?: Function } {
  const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
  const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return { params, callback };
}

export class DuckDbDatabase implements DatabaseAdapter {
  readonly driver = 'duckdb' as const;
  readonly dialect = createDialect(this.driver);
  private constructor(private readonly instance: any) {}

  static async open(path = ':memory:'): Promise<DuckDbDatabase> {
    return new DuckDbDatabase(await DuckDBInstance.create(path));
  }

  connect(): DatabaseConnection {
    const connectionPromise = this.instance.connect();
    return {
      run: async (sql: string, ...args: any[]) => {
        const { params, callback } = normalizeArgs(args);
        const promise = connectionPromise.then((connection: any) => connection.run(sql, params));
        if (callback) promise.then(() => callback(null), callback);
        return promise;
      },
      all: async (sql: string, ...args: any[]) => {
        const { params, callback } = normalizeArgs(args);
        const promise = connectionPromise.then((connection: any) => connection.runAndReadAll(sql, params))
          .then((result: any) => result.getRowObjectsJS() as any[]);
        if (callback) promise.then((rows: any[]) => callback(null, rows), callback);
        return promise;
      },
      close: (callback?: () => void) => {
        connectionPromise.then((connection: any) => connection.closeSync()).then(() => callback?.());
      },
      get inTransaction() { return false; },
    };
  }

  close(callback?: () => void): void {
    this.instance.closeSync();
    callback?.();
  }
}
