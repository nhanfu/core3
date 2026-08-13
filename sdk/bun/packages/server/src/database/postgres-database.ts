import { convertRow } from './sql.ts';

export type PostgresExecutor = {
  unsafe(sql: string, params?: unknown[]): Promise<any>;
  close?: () => Promise<void> | void;
};

function postgresPlaceholders(sql: string): string {
  let result = '';
  let parameter = 0;
  let quote: string | null = null;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    if (quote) {
      result += char;
      if (char === quote && sql[index - 1] !== '\\') quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      result += char;
      continue;
    }
    if (char === '?') {
      result += `$${++parameter}`;
      continue;
    }
    result += char;
  }
  return result;
}

function postgresSql(sql: string): string {
  const insertIgnore = /\bINSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);
  return postgresPlaceholders(sql)
    .replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT INTO')
    .replace(/;\s*$/, '')
    .concat(insertIgnore ? ' ON CONFLICT DO NOTHING' : '');
}

/**
 * Callback-shaped Postgres database seam used by the generic repository.
 * Bun.SQL supplies the native Postgres pool; the adapter only translates the
 * repository's positional `?` parameters to PostgreSQL `$n` parameters.
 */
export class PostgresDatabase {
  private constructor(private readonly executor: PostgresExecutor) {}

  static open(url: string): PostgresDatabase {
    if (!/^postgres(?:ql)?:\/\//i.test(url)) throw new Error('Postgres storage requires a postgres:// URL');
    const BunRuntime = (globalThis as any).Bun;
    if (!BunRuntime?.SQL) throw new Error('Postgres storage requires the Bun SQL runtime');
    return new PostgresDatabase(new BunRuntime.SQL({ url, prepare: false }) as PostgresExecutor);
  }

  static fromExecutor(executor: PostgresExecutor): PostgresDatabase {
    return new PostgresDatabase(executor);
  }

  connect(): any {
    let inTransaction = false;
    return {
      run: async (sql: string, ...args: any[]) => {
        const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const promise = this.execute(sql, params).then(() => {
          if (/^BEGIN\b/i.test(sql.trim())) inTransaction = true;
          if (/^(COMMIT|ROLLBACK)\b/i.test(sql.trim())) inTransaction = false;
        });
        if (callback) promise.then(() => callback(null), callback);
        return promise;
      },
      all: async (sql: string, ...args: any[]) => {
        const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const promise = this.query(sql, params);
        if (callback) promise.then((rows) => callback(null, rows), callback);
        return promise;
      },
      close: (callback?: () => void) => {
        Promise.resolve().then(() => callback?.());
      },
      get inTransaction() { return inTransaction; },
    };
  }

  private async execute(sql: string, params: unknown[]): Promise<void> {
    await this.executor.unsafe(postgresSql(sql), params);
  }

  private async query(sql: string, params: unknown[]): Promise<any[]> {
    const rows = await this.executor.unsafe(postgresSql(sql), params);
    return (Array.isArray(rows) ? rows : []).map((row) => convertRow(row));
  }

  close(callback?: () => void): void {
    Promise.resolve(this.executor.close?.()).then(() => callback?.());
  }
}

export { postgresPlaceholders, postgresSql };
