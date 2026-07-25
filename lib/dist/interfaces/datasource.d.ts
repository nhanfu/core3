export type DbEngine = 'postgres' | 'sqlserver' | 'sqlite' | 'duckdb';
export type Protocol = 'http' | 'websocket' | 'sse' | 'grpc';
export type CrudOp = 'create' | 'update' | 'delete';
export type ScriptLanguage = 'javascript' | 'typescript' | 'python' | 'lua' | 'shell';
export interface ParamDef {
    type: 'string' | 'number' | 'boolean' | 'uuid' | 'date' | 'json';
    required?: boolean;
    default?: unknown;
    /** 'route' | 'query' | 'body' — where to pull the value from */
    from?: string;
    /** Bind to another component's state: 'component-id.field' */
    bind?: string;
}
export interface CrudFn {
    language: ScriptLanguage;
    permission: string;
    script: string;
}
export type CrudConfig = true | CrudOp[] | {
    [K in CrudOp]?: CrudFn;
};
export interface DataSource {
    id: string;
    db?: DbEngine;
    table?: string;
    protocol: Protocol;
    roles: string[];
    permission: string;
    query?: string;
    language?: ScriptLanguage;
    script?: string;
    script_file?: string;
    crud?: CrudConfig;
    create?: CrudFn;
    update?: CrudFn;
    delete?: CrudFn;
    params?: Record<string, ParamDef>;
    cache?: {
        ttl: string;
    };
    component?: string;
}
/**
 * Every datasource returns this shape.
 * data is a flat 1D array — every JOIN / lookup has been resolved server-side.
 */
export interface DataResponse {
    data: Record<string, unknown>[];
    meta: {
        total: number;
        page: number;
        pageSize: number;
    };
}
/**
 * Implemented per database engine (Postgres, SQL Server, SQLite, DuckDB).
 * Switching engines = changing one line in the datasource config.
 */
export interface IRepository<T = Record<string, unknown>> {
    findById(id: string): Promise<T | null>;
    findMany(filter: Record<string, unknown>): Promise<T[]>;
    create(entity: Partial<T>): Promise<T>;
    update(id: string, partial: Partial<T>): Promise<T>;
    delete(id: string): Promise<void>;
    /**
     * Raw parameterized query.
     * Called only after roles + permission check passes.
     * Row-level filter values (e.g. :allowed_branches) injected from SecurityContext.
     */
    query(sql: string, params?: Record<string, unknown>): Promise<T[]>;
    nextSequence(name: string): Promise<string>;
}
export interface ActionHandler {
    name: string;
    permission: string;
    roles?: string[];
    language?: ScriptLanguage;
    script?: string;
    query?: string;
    params?: Record<string, ParamDef>;
}
export interface PageDataSources {
    datasources: DataSource[];
    actions?: ActionHandler[];
}
