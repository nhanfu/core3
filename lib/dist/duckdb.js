/**
 * DuckDB WASM adapter — browser-side SQL engine.
 * Loads @duckdb/duckdb-wasm lazily on first use.
 *
 * Usage:
 *   const db = await getDuckDB();
 *   const rows = await db.query('SELECT * FROM trucks');
 */
let _db = null;
async function initDuckDB() {
    const duckdb = await import('@duckdb/duckdb-wasm');
    const JSDELIVR = duckdb.selectBundle(duckdb.getJsDelivrBundles());
    const worker = new Worker(JSDELIVR.mainWorker, { type: 'module' });
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(JSDELIVR.mainModule, JSDELIVR.pthreadWorker);
    return db;
}
export async function getDuckDB() {
    if (!_db)
        _db = await initDuckDB();
    return _db;
}
export async function queryDuckDB(sql, params = {}) {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
        const stmt = await conn.prepare(sql);
        const result = await stmt.query(...Object.values(params));
        return result.toArray().map(r => r.toJSON());
    }
    finally {
        await conn.close();
    }
}
