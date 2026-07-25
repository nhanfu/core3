/**
 * DataSource adapter — resolves a datasource config to a query function.
 * Routes to DuckDB WASM (protocol: duckdb) or HTTP backend (protocol: http).
 */
export declare function fetchSource(def: any, params?: {}): Promise<any>;
export declare function clearCache(sourceId: any): void;
