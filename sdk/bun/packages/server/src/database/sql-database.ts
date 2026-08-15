import { convertRow } from './sql.ts';
import { createDialect } from './dialects.ts';
import type { DatabaseAdapter, DatabaseConnection, DatabaseDriver } from './types.ts';

type SqlExecutor = {
  query(sql: string, params: any[]): Promise<any[]>;
  execute(sql: string, params: any[]): Promise<void>;
  close(): Promise<void>;
};

function translatePlaceholders(sql: string, driver: DatabaseDriver): string {
  if (driver === 'postgres' || driver === 'duckdb' || driver === 'mysql') return sql;
  let index = 0;
  return sql.replace(/\?/g, () => driver === 'sqlserver' ? `@p${++index}` : `:${++index}`);
}

export function translateSql(sql: string, driver: DatabaseDriver): string {
  let result = translatePlaceholders(sql, driver).replace(/;\s*$/, '');
  if (driver === 'mysql') {
    result = result.replace(/\bgen_random_uuid\(\)/gi, 'UUID()')
      .replace(/\s+DEFAULT\s+UUID\(\)/gi, '')
      .replace(/^BEGIN\s+TRANSACTION$/i, 'START TRANSACTION')
      .replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT IGNORE INTO')
      .replace(/\bCREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\b/gi, 'CREATE INDEX')
      .replace(/\bstring_agg\(([^,]+),\s*'([^']*)'\)/gi, "GROUP_CONCAT($1 SEPARATOR '$2')")
      .replace(/\bbool_or\(/gi, 'MAX(')
      .replace(/\bILIKE\b/gi, 'LIKE')
      .replace(/\bDATE\s+'([^']+)'/gi, "'$1'")
      .replace(/\bTRUE\b/gi, '1').replace(/\bFALSE\b/gi, '0')
      .replace(/\bVARCHAR\b(?=\s*(?:PRIMARY|NOT|UNIQUE|DEFAULT|,|\)))/gi, 'VARCHAR(255)')
      .replace(/CAST\(([^()]+) AS VARCHAR\(255\)\)/gi, '$1')
      .replace(/CAST\(([^()]+) AS VARCHAR\)/gi, '$1')
      .replace(/CAST\(([^()]+) AS CHAR\)/gi, '$1')
      .replace(/printf\('\%,\.0f ₫',\s*(COALESCE\([^)]*\))\)/gi, "CONCAT(FORMAT($1, 0), ' ₫')")
      .replace(/printf\('\%,\.0f ₫',\s*([^()]+)\)/gi, "CONCAT(FORMAT($1, 0), ' ₫')")
      .replace(/printf\('\%,\.3f',\s*([^()]+)\)/gi, 'FORMAT($1, 3)')
      .replace(/printf\('\%.2f%%',\s*([^()]+)\)/gi, "CONCAT(FORMAT($1, 2), '%')");
  } else if (driver === 'oracle') {
    result = result.replace(/\bgen_random_uuid\(\)/gi, 'RAWTOHEX(SYS_GUID())')
      .replace(/\bVARCHAR\b/gi, 'VARCHAR2').replace(/\bBIGINT\b/gi, 'NUMBER(19)')
      .replace(/CAST\(([^()]+) AS VARCHAR2\)/gi, 'CAST($1 AS VARCHAR2(4000))')
      .replace(/\bCURRENT_TIMESTAMP\b/gi, 'SYSTIMESTAMP')
      .replace(/\)\s+AS\s+([A-Za-z_][A-Za-z0-9_]*)/gi, ') $1')
      .replace(/^BEGIN\s+TRANSACTION$/i, '');
  } else if (driver === 'sqlserver') {
    result = result.replace(/\bgen_random_uuid\(\)/gi, 'CONVERT(VARCHAR(36), NEWID())')
      .replace(/\bCURRENT_TIMESTAMP\b/gi, 'SYSUTCDATETIME()')
      .replace(/\bVARCHAR\b/gi, 'NVARCHAR').replace(/\bBIGINT\b/gi, 'BIGINT');
  }
  return result;
}

export class SqlDatabase implements DatabaseAdapter {
  readonly dialect;

  constructor(readonly driver: DatabaseDriver, private readonly executor: SqlExecutor) {
    this.dialect = createDialect(driver);
  }

  connect(): DatabaseConnection {
    let inTransaction = false;
    return {
      run: async (sql: string, ...args: any[]) => {
        const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const translated = translateSql(sql, this.driver);
        const promise = (translated ? this.executor.execute(translated, params) : Promise.resolve()).then(() => {
          if (/^BEGIN\b/i.test(sql.trim())) inTransaction = true;
          if (/^(COMMIT|ROLLBACK)\b/i.test(sql.trim())) inTransaction = false;
        });
        if (callback) promise.then(() => callback(null), callback);
        return promise;
      },
      all: async (sql: string, ...args: any[]) => {
        const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const promise = this.executor.query(translateSql(sql, this.driver), params).then((rows) => rows.map(convertRow));
        if (callback) promise.then((rows) => callback(null, rows), callback);
        return promise;
      },
      close: (callback?: () => void) => Promise.resolve(callback?.()),
      get inTransaction() { return inTransaction; },
    };
  }

  close(callback?: () => void): void { this.executor.close().then(() => callback?.()); }
}

export async function openSqlDatabase(driver: Exclude<DatabaseDriver, 'postgres' | 'duckdb'>, url: string): Promise<SqlDatabase> {
  if (driver === 'mysql') {
    const mysql = await import('mysql2/promise');
    const pool = mysql.createPool(url);
    return new SqlDatabase(driver, {
      query: async (sql, params) => {
        const rows = (await pool.query(sql, params))[0] as any;
        return Array.isArray(rows) ? rows : [];
      },
      execute: async (sql, params) => { await pool.query(sql, params); },
      close: async () => { await pool.end(); },
    });
  }
  if (driver === 'sqlserver') {
    const mssql: any = await new Function('return import("mssql")')();
    const parsed = new URL(url);
    const pool = await mssql.default.connect({
      server: parsed.hostname,
      port: Number(parsed.port || 1433),
      database: decodeURIComponent(parsed.pathname.slice(1)),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      options: { encrypt: parsed.searchParams.get('encrypt') === 'true', trustServerCertificate: true },
    });
    const execute = async (sql: string, params: any[]) => {
      const request = pool.request();
      params.forEach((value, index) => request.input(`p${index + 1}`, value));
      await request.query(sql);
    };
    return new SqlDatabase(driver, {
      query: async (sql, params) => { const request = pool.request(); params.forEach((value, index) => request.input(`p${index + 1}`, value)); return (await request.query(sql)).recordset; },
      execute,
      close: async () => { await pool.close(); },
    });
  }
  const oracledb: any = await new Function('return import("oracledb")')();
  const parsed = new URL(url);
  const connection = await oracledb.default.getConnection({
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    connectString: `${parsed.hostname}:${parsed.port || 1521}${parsed.pathname}`,
  });
  return new SqlDatabase(driver, {
    query: async (sql, params) => {
      const rows = (await connection.execute(sql, params, { outFormat: oracledb.default.OUT_FORMAT_OBJECT })).rows || [];
      return rows.map((row: any) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])));
    },
    execute: async (sql, params) => { await connection.execute(sql, params, { autoCommit: true }); },
    close: async () => { await connection.close(); },
  });
}
