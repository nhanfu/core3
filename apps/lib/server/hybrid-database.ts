import { DuckDBInstance } from '@duckdb/node-api';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

type NativeConnection = any;
type PartitionDefinition = {
  table: string;
  column?: string;
  strategy: 'range' | 'time' | 'year' | 'list' | 'hash';
  interval?: 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour';
  bounds?: Array<{ name: string; from?: string; to?: string }>;
  partitions?: Array<{ name: string; values: unknown[] }>;
  buckets?: number;
  default_partition?: string;
};
type PartitionState = PartitionDefinition & { physicalTables: string[]; logicalView: string };

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Invalid database identifier: ${value}`);
  return `"${value}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return quoteLiteral(String(value));
}

function safeSuffix(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'default';
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
  private readonly partitions = new Map<string, PartitionState>();

  private constructor(
    private disk: any,
    private memory: any,
    private readonly path: string,
  ) {}

  static async open(path: string): Promise<HybridDuckDbDatabase> {
    const parent = dirname(path);
    if (path !== ':memory:' && parent !== '.') await mkdir(parent, { recursive: true });
    const disk = await DuckDBInstance.create(path);
    const memory = await DuckDBInstance.create(':memory:');
    const database = new HybridDuckDbDatabase(disk, memory, path);
    await database.copySchema();
    await database.loadPartitions();
    return database;
  }

  private async loadPartitions(): Promise<void> {
    const connection = await this.disk.connect();
    try {
      await connection.run('ALTER TABLE __core3_partition_config ADD COLUMN IF NOT EXISTS partition_interval VARCHAR').catch(() => {});
      await connection.run('ALTER TABLE __core3_partition_config ADD COLUMN IF NOT EXISTS definition_json VARCHAR').catch(() => {});
      const rows = (await connection.runAndReadAll(
        'SELECT table_name, partition_column, strategy, partition_interval, definition_json FROM __core3_partition_config',
      )).getRowObjectsJS();
      for (const row of rows) {
        const table = String(row.table_name);
        this.partitions.set(table, {
          table,
          ...(row.definition_json ? JSON.parse(String(row.definition_json)) : {}),
          column: row.partition_column ? String(row.partition_column) : undefined,
          strategy: String(row.strategy) as PartitionDefinition['strategy'],
          interval: row.partition_interval ? String(row.partition_interval) as PartitionDefinition['interval'] : undefined,
          logicalView: `__core3_partitioned_${table}`,
          physicalTables: (await connection.runAndReadAll(
            `SELECT table_name FROM duckdb_tables() WHERE table_name LIKE ? ORDER BY table_name`,
            [`${table}__p%`],
          )).getRowObjectsJS().map((item: any) => String(item.table_name)),
        });
      }
    } catch {
      // The metadata table is created by the first partitioning migration.
    } finally {
      connection.closeSync();
    }
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
    let tables: any[] = [];
    let views: any[] = [];
    try {
      tables = (await diskConnection.runAndReadAll(
        "SELECT table_name, sql FROM duckdb_tables() WHERE schema_name = 'main' ORDER BY table_name",
      )).getRowObjectsJS();
      views = (await diskConnection.runAndReadAll(
        "SELECT view_name, sql FROM duckdb_views() WHERE schema_name = 'main'",
      )).getRowObjectsJS();
      if (tables.length && this.path !== ':memory:') await diskConnection.run('CHECKPOINT');
    } finally {
      diskConnection.closeSync();
    }

    if (!tables.length && !views.length) return;
    if (this.path !== ':memory:') this.disk.closeSync();
    const memoryConnection = await this.memory.connect();
    try {
      if (tables.length && this.path !== ':memory:') {
        // DuckDB on Windows cannot attach a file while another instance in
        // this process owns its write lock. Close and reopen the durable
        // instance around the read-only cache snapshot.
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
      for (const view of views) {
        if (view.sql) await memoryConnection.run(String(view.sql));
      }
    } finally {
      memoryConnection.closeSync();
      if (this.path !== ':memory:') this.disk = await DuckDBInstance.create(this.path);
    }
  }

  async partition(definition: PartitionDefinition): Promise<void> {
    if (!['range', 'time', 'year', 'list', 'hash'].includes(definition.strategy)) throw new Error(`Unsupported partition strategy: ${definition.strategy}`);
    if (!definition.column) throw new Error(`${definition.strategy} partitions require a column`);
    const interval = definition.interval || (definition.strategy === 'year' ? 'year' : undefined);
    if (['range', 'time', 'year'].includes(definition.strategy) && !definition.bounds?.length && !interval) throw new Error('Range/time partitions require an interval');
    if (['range', 'time', 'year'].includes(definition.strategy) && interval && interval !== 'year' && !definition.bounds?.length) throw new Error(`Range interval is not implemented yet: ${interval}`);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(definition.table) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(definition.column)) {
      throw new Error('Partition table and column must be simple identifiers');
    }
    if (this.partitions.has(definition.table)) {
      if (!definition.replace) return;
      await this.unpartition(definition.table);
    }
    const connection = await this.disk.connect();
    try {
      await connection.run(`CREATE TABLE IF NOT EXISTS __core3_partition_config (
        table_name VARCHAR PRIMARY KEY,
        partition_column VARCHAR,
        strategy VARCHAR NOT NULL,
        partition_interval VARCHAR,
        definition_json VARCHAR
      )`);
      await connection.run('ALTER TABLE __core3_partition_config ADD COLUMN IF NOT EXISTS partition_interval VARCHAR');
      await connection.run('ALTER TABLE __core3_partition_config ADD COLUMN IF NOT EXISTS definition_json VARCHAR');
      const existing = (await connection.runAndReadAll(
        `SELECT sql FROM duckdb_tables() WHERE table_name = ?`, [definition.table],
      )).getRowObjectsJS()[0];
      if (!existing?.sql) throw new Error(`Partition source table does not exist: ${definition.table}`);
      let physicalTables: string[];
      if (['range', 'time', 'year'].includes(definition.strategy)) {
        if (definition.bounds?.length) {
          physicalTables = definition.bounds.map((bound) => `${definition.table}__p_${safeSuffix(bound.name)}`);
          if (definition.default_partition) physicalTables.push(`${definition.table}__p_${safeSuffix(definition.default_partition)}`);
        } else {
          const years = (await connection.runAndReadAll(
            `SELECT DISTINCT EXTRACT(YEAR FROM ${quoteIdentifier(definition.column)}) AS year
             FROM ${quoteIdentifier(definition.table)}
             WHERE ${quoteIdentifier(definition.column)} IS NOT NULL
             ORDER BY year`,
          )).getRowObjectsJS().map((row: any) => Number(row.year)).filter(Number.isInteger);
          physicalTables = years.length ? years.map((year: number) => this.partitionTable(definition.table, year)) : [this.partitionTable(definition.table, null)];
        }
      } else if (definition.strategy === 'list') {
        if (!definition.partitions?.length) throw new Error('List partitions require partitions with names and values');
        physicalTables = definition.partitions.map((part) => `${definition.table}__p_${safeSuffix(part.name)}`);
        if (definition.default_partition) physicalTables.push(`${definition.table}__p_${safeSuffix(definition.default_partition)}`);
      } else {
        const buckets = Math.max(1, Math.floor(definition.buckets || 0));
        if (!buckets) throw new Error('Hash partitions require a positive bucket count');
        physicalTables = Array.from({ length: buckets }, (_, bucket) => `${definition.table}__p${bucket}`);
      }
      for (const physical of physicalTables) {
        await connection.run(`CREATE TABLE ${quoteIdentifier(physical)} AS SELECT * FROM ${quoteIdentifier(definition.table)} WHERE FALSE`);
      }
      if (['range', 'time', 'year'].includes(definition.strategy)) {
        if (definition.bounds?.length) {
          for (const [index, bound] of definition.bounds.entries()) {
            const clauses = [bound.from ? `${quoteIdentifier(definition.column)} >= ${quoteLiteral(bound.from)}` : 'TRUE', bound.to ? `${quoteIdentifier(definition.column)} < ${quoteLiteral(bound.to)}` : 'TRUE'];
            await connection.run(`INSERT INTO ${quoteIdentifier(physicalTables[index])} SELECT * FROM ${quoteIdentifier(definition.table)} WHERE ${clauses.join(' AND ')}`);
          }
          if (definition.default_partition) {
            const covered = definition.bounds.map((bound) => `(${bound.from ? `${quoteIdentifier(definition.column)} >= ${quoteLiteral(bound.from)}` : 'TRUE'} AND ${bound.to ? `${quoteIdentifier(definition.column)} < ${quoteLiteral(bound.to)}` : 'TRUE'})`).join(' OR ');
            const physical = `${definition.table}__p_${safeSuffix(definition.default_partition)}`;
            await connection.run(`INSERT INTO ${quoteIdentifier(physical)} SELECT * FROM ${quoteIdentifier(definition.table)} WHERE ${quoteIdentifier(definition.column)} IS NULL OR NOT (${covered || 'FALSE'})`);
          }
        } else for (const physical of physicalTables) {
          const year = physical.endsWith('__pdefault') ? null : Number(physical.slice(physical.lastIndexOf('__p') + 3));
          if (year !== null) await connection.run(`INSERT INTO ${quoteIdentifier(physical)} SELECT * FROM ${quoteIdentifier(definition.table)} WHERE EXTRACT(YEAR FROM ${quoteIdentifier(definition.column)}) = ?`, [year]);
        }
      } else if (definition.strategy === 'list') {
        for (const part of definition.partitions || []) {
          const physical = `${definition.table}__p_${safeSuffix(part.name)}`;
          const values = part.values.map(sqlLiteral).join(', ');
          await connection.run(`INSERT INTO ${quoteIdentifier(physical)} SELECT * FROM ${quoteIdentifier(definition.table)} WHERE ${quoteIdentifier(definition.column)} IN (${values})`);
        }
        if (definition.default_partition) {
          const covered = (definition.partitions || []).flatMap((part) => part.values).map(sqlLiteral).join(', ');
          const physical = `${definition.table}__p_${safeSuffix(definition.default_partition)}`;
          await connection.run(`INSERT INTO ${quoteIdentifier(physical)} SELECT * FROM ${quoteIdentifier(definition.table)} WHERE ${quoteIdentifier(definition.column)} IS NULL OR ${quoteIdentifier(definition.column)} NOT IN (${covered || 'NULL'})`);
        }
      } else {
        for (const physical of physicalTables) {
          const bucket = Number(physical.slice(physical.lastIndexOf('__p') + 3));
          await connection.run(`INSERT INTO ${quoteIdentifier(physical)} SELECT * FROM ${quoteIdentifier(definition.table)} WHERE hash(${quoteIdentifier(definition.column)}) % ? = ?`, [physicalTables.length, bucket]);
        }
      }
      const logicalView = `__core3_partitioned_${definition.table}`;
      await connection.run(`CREATE VIEW ${quoteIdentifier(logicalView)} AS ${this.partitionViewSql(definition, physicalTables)}`);
      await connection.run('INSERT INTO __core3_partition_config(table_name, partition_column, strategy, partition_interval, definition_json) VALUES (?, ?, ?, ?, ?)', [definition.table, definition.column, definition.strategy, interval ?? null, JSON.stringify(definition)]);
      this.partitions.set(definition.table, { ...definition, interval, physicalTables, logicalView });
    } finally {
      connection.closeSync();
    }
  }

  async unpartition(table: string): Promise<void> {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new Error(`Invalid partition table: ${table}`);
    const connection = await this.disk.connect();
    try {
      const physicalTables = (await connection.runAndReadAll(
        `SELECT table_name FROM duckdb_tables() WHERE table_name LIKE ? ORDER BY table_name`,
        [`${table}__p%`],
      )).getRowObjectsJS().map((row: any) => String(row.table_name));
      await connection.run(`DROP VIEW IF EXISTS ${quoteIdentifier(`__core3_partitioned_${table}`)}`);
      for (const physical of physicalTables) await connection.run(`DROP TABLE IF EXISTS ${quoteIdentifier(physical)}`);
      await connection.run('DELETE FROM __core3_partition_config WHERE table_name = ?', [table]).catch(() => {});
      this.partitions.delete(table);
    } finally {
      connection.closeSync();
    }
  }

  private partitionTable(table: string, year: number | null): string {
    return `${table}__p${year === null ? 'default' : year}`;
  }

  private partitionViewSql(state: PartitionDefinition, physicalTables: string[]): string {
    if (state.strategy === 'list') {
      const branches = (state.partitions || []).map((part) => {
        const table = `${state.table}__p_${safeSuffix(part.name)}`;
        return `SELECT * FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(state.column!)} IN (${part.values.map(sqlLiteral).join(', ')})`;
      });
      if (state.default_partition) {
        const covered = (state.partitions || []).flatMap((part) => part.values).map(sqlLiteral).join(', ');
        branches.push(`SELECT * FROM ${quoteIdentifier(`${state.table}__p_${safeSuffix(state.default_partition)}`)} WHERE ${quoteIdentifier(state.column!)} IS NULL OR ${quoteIdentifier(state.column!)} NOT IN (${covered || 'NULL'})`);
      }
      return branches.join(' UNION ALL ');
    }
    if (state.strategy === 'hash') {
      const buckets = Math.max(1, Math.floor(state.buckets || 1));
      return physicalTables.map((table) => {
        const bucket = Number(table.slice(table.lastIndexOf('__p') + 3));
        return `SELECT * FROM ${quoteIdentifier(table)} WHERE hash(${quoteIdentifier(state.column!)}) % ${buckets} = ${bucket}`;
      }).join(' UNION ALL ');
    }
    if (state.bounds?.length) {
      const branches = state.bounds.map((bound, index) => {
        const column = quoteIdentifier(state.column!);
        const predicate = [bound.from ? `${column} >= ${quoteLiteral(bound.from)}` : 'TRUE', bound.to ? `${column} < ${quoteLiteral(bound.to)}` : 'TRUE'].join(' AND ');
        return `SELECT * FROM ${quoteIdentifier(physicalTables[index])} WHERE ${predicate}`;
      });
      if (state.default_partition) {
        const column = quoteIdentifier(state.column!);
        const covered = state.bounds.map((bound) => `(${bound.from ? `${column} >= ${quoteLiteral(bound.from)}` : 'TRUE'} AND ${bound.to ? `${column} < ${quoteLiteral(bound.to)}` : 'TRUE'})`).join(' OR ');
        branches.push(`SELECT * FROM ${quoteIdentifier(`${state.table}__p_${safeSuffix(state.default_partition)}`)} WHERE ${column} IS NULL OR NOT (${covered || 'FALSE'})`);
      }
      return branches.join(' UNION ALL ');
    }
    return physicalTables.map((table) => {
      const suffix = table.slice(table.lastIndexOf('__p') + 3);
      if (suffix === 'default') return `SELECT * FROM ${quoteIdentifier(table)}`;
      const year = Number(suffix);
      const column = quoteIdentifier(state.column);
      // Branch predicates let DuckDB prune UNION ALL branches when the query
      // includes the declared partition column.
      return `SELECT * FROM ${quoteIdentifier(table)} WHERE ${column} >= DATE '${year}-01-01' AND ${column} < DATE '${year + 1}-01-01'`;
    }).join(' UNION ALL ');
  }

  private async ensurePhysicalTable(state: PartitionState, year: number, disk: NativeConnection, memory: NativeConnection): Promise<string> {
    const physical = this.partitionTable(state.table, year);
    if (!state.physicalTables.includes(physical)) {
      const template = state.physicalTables[0];
      await disk.run(`CREATE TABLE ${quoteIdentifier(physical)} AS SELECT * FROM ${quoteIdentifier(template)} WHERE FALSE`);
      await memory.run(`CREATE TABLE ${quoteIdentifier(physical)} AS SELECT * FROM ${quoteIdentifier(template)} WHERE FALSE`);
      state.physicalTables.push(physical);
      await disk.run(`CREATE OR REPLACE VIEW ${quoteIdentifier(state.logicalView)} AS ${this.partitionViewSql(state, state.physicalTables)}`);
      await memory.run(`CREATE OR REPLACE VIEW ${quoteIdentifier(state.logicalView)} AS ${this.partitionViewSql(state, state.physicalTables)}`);
    }
    return physical;
  }

  private async routedStatements(sql: string, params: any[], disk: NativeConnection, memory: NativeConnection): Promise<string[]> {
    const stateEntry = [...this.partitions.entries()].find(([table]) => new RegExp(`\\b${table}\\b`, 'i').test(sql));
    const state = stateEntry?.[1];
    if (!state) return [sql];
    if (/^\s*INSERT\s+/i.test(sql)) {
      const columns = new RegExp(`INSERT\\s+(?:OR\\s+IGNORE\\s+)?INTO\\s+${state.table}\\s*\\(([^)]+)\\)`, 'i').exec(sql)?.[1]
        ?.split(',').map((column) => column.trim().replaceAll('"', '').toLowerCase());
      const index = columns?.indexOf(state.column!.toLowerCase()) ?? -1;
      if (index < 0 || params[index] === undefined) throw new Error(`Partitioned ${state.table} inserts require ${state.column}`);
      let physical: string;
      if (['range', 'time', 'year'].includes(state.strategy)) {
        if (state.bounds?.length) {
          const value = String(params[index]);
          const boundIndex = state.bounds.findIndex((bound) => (!bound.from || value >= bound.from) && (!bound.to || value < bound.to));
          const name = boundIndex >= 0 ? state.bounds[boundIndex].name : state.default_partition;
          if (!name) throw new Error(`No range partition matches ${state.column}=${value}`);
          physical = `${state.table}__p_${safeSuffix(name)}`;
        } else {
          const year = new Date(String(params[index])).getUTCFullYear();
          physical = await this.ensurePhysicalTable(state, year, disk, memory);
        }
      } else if (state.strategy === 'list') {
        const part = (state.partitions || []).find((candidate) => candidate.values.some((value) => String(value) === String(params[index])));
        const name = part?.name || state.default_partition;
        if (!name) throw new Error(`No list partition matches ${state.column}=${String(params[index])}`);
        physical = `${state.table}__p_${safeSuffix(name)}`;
      } else {
        const buckets = Math.max(1, Math.floor(state.buckets || 1));
        const result = (await disk.runAndReadAll(`SELECT hash(?) % ? AS bucket`, [params[index], buckets])).getRowObjectsJS()[0];
        physical = `${state.table}__p${Number(result.bucket)}`;
      }
      return [sql, sql.replace(new RegExp(`\\b${state.table}\\b`, 'i'), physical)];
    }
    if (new RegExp(`^\\s*(UPDATE\\s+${state.table}|DELETE\\s+FROM\\s+${state.table})\\b`, 'i').test(sql)) {
      return [sql, ...state.physicalTables.map((table) => sql.replace(new RegExp(`\\b${state.table}\\b`, 'i'), table))];
    }
    return [sql];
  }

  private rewriteReadSql(sql: string): string {
    let rewritten = sql;
    for (const state of this.partitions.values()) {
      rewritten = rewritten.replace(new RegExp(`\\b${state.table}\\b`, 'gi'), state.logicalView);
    }
    return rewritten;
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
          if (/^BEGIN\b/i.test(normalized)) inTransaction = true;
          if (isRead(normalized)) {
            await (this.mirroring ? memory : disk).run(normalized, params);
          } else {
            const statements = this.mirroring
              ? await this.routedStatements(normalized, params, disk, memory)
              : [normalized];
            for (const statement of statements) {
              // Durability is established before the cache sees the mutation.
              await disk.run(statement, params);
              if (this.mirroring) await memory.run(statement, params);
            }
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
          const statement = this.mirroring && isRead(sql) ? this.rewriteReadSql(sql) : sql;
          const result = await (this.mirroring && isRead(sql) ? memory : disk).runAndReadAll(statement, params);
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
