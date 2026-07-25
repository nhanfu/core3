/**
 * DuckDB WASM adapter — browser-side SQL engine.
 * Loads @duckdb/duckdb-wasm lazily on first use.
 *
 * Usage:
 *   const db = await getDuckDB();
 *   const rows = await db.query('SELECT * FROM trucks');
 */
export declare function getDuckDB(): Promise<any>;
export declare function queryDuckDB(sql: any, params?: {}): Promise<any>;
