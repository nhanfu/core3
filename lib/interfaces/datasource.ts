// @core3/backend — datasource contracts

export type DbEngine = 'postgres' | 'sqlserver' | 'sqlite' | 'duckdb';
export type Protocol = 'http' | 'websocket' | 'sse' | 'grpc';
export type CrudOp = 'create' | 'update' | 'delete';
export type ScriptLanguage = 'javascript' | 'typescript' | 'python' | 'lua' | 'shell';

// ─── Param definitions ───────────────────────────────────────────────────────

export interface ParamDef {
  type: 'string' | 'number' | 'boolean' | 'uuid' | 'date' | 'json';
  required?: boolean;
  default?: unknown;
  /** 'route' | 'query' | 'body' — where to pull the value from */
  from?: string;
  /** Bind to another component's state: 'component-id.field' */
  bind?: string;
}

// ─── CRUD configuration ──────────────────────────────────────────────────────

export interface CrudFn {
  language: ScriptLanguage;
  permission: string;
  script: string;
}

export type CrudConfig =
  | true                          // auto-generate all three operations
  | CrudOp[]                      // selectively enable operations
  | { [K in CrudOp]?: CrudFn };  // custom function per operation

// ─── DataSource ──────────────────────────────────────────────────────────────

export interface DataSource {
  id: string;

  // Public HTTP exposure is opt-in. Private datasources need no transport metadata.
  public?: boolean;
  endpoint?: string;

  // Database
  db?: DbEngine;
  table?: string;               // required when crud: true | CrudOp[]

  // Transport
  protocol: Protocol;

  // Access control (both must pass)
  roles: string[];
  permission: string;

  // Data retrieval — exactly one of query OR script/script_file
  query?: string;               // parameterized SQL (use :paramName)
  language?: ScriptLanguage;    // required with script / script_file
  script?: string;              // inline script
  script_file?: string;         // path relative to the YAML file

  // Mutations
  crud?: CrudConfig;
  create?: CrudFn;              // overrides generated create
  update?: CrudFn;              // overrides generated update
  delete?: CrudFn;              // overrides generated delete

  // Parameters
  params?: Record<string, ParamDef>;

  // Optional caching
  cache?: { ttl: string };      // e.g. '30s' | '5m'

  // Component to bind results to (YAML shorthand)
  component?: string;
}

// ─── Runtime response shape ──────────────────────────────────────────────────

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

// ─── Repository interface ─────────────────────────────────────────────────────

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

// ─── Action handler ───────────────────────────────────────────────────────────

export interface ActionHandler {
  name: string;
  permission: string;
  roles?: string[];
  language?: ScriptLanguage;
  script?: string;
  query?: string;
  params?: Record<string, ParamDef>;
}

// ─── Full page datasources block ─────────────────────────────────────────────

export interface PageDataSources {
  datasources: DataSource[];
  actions?: ActionHandler[];
}
