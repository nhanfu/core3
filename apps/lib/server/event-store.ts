import { RecordBatchStreamWriter, tableFromArrays } from 'apache-arrow';
import { DuckDBInstance } from '@duckdb/node-api';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { v7 as uuidv7 } from 'uuid';

export type EventValueType = 'varchar' | 'bigint' | 'integer' | 'double' | 'boolean';

export type EventSchemaColumn = {
  name: string;
  type: EventValueType;
  source?: string;
  nullable?: boolean;
};

export type EventStoreSchema = {
  table?: string;
  columns: EventSchemaColumn[];
};

export type EventWriteMode = 'low_latency' | 'durable';

export type EventEnvelope = {
  id: string;
  sequence: number;
  at: number;
  topic?: string;
  key?: string;
  sourceNode?: string;
  [key: string]: unknown;
};

export type EventRecord = EventEnvelope;

type EventListener = (event: EventEnvelope) => void;

export type EventSubscription = {
  events: AsyncIterable<EventEnvelope>;
  close: () => void;
  ack?: (sequence: number) => Promise<void>;
};

export type EventBus = Pick<EventStore, 'start' | 'stop' | 'publish' | 'subscribeStream'>;

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) throw new Error(`Invalid event identifier: ${identifier}`);
  return `"${identifier}"`;
}

function valueAt(source: string | undefined, event: EventEnvelope): unknown {
  if (!source) return undefined;
  if (source === '@json') return JSON.stringify(event);
  return source.split('.').reduce((value: any, key) => value?.[key], event);
}

class DuckDbConnectionPool {
  private readonly writer: any;
  private readonly appender: any;
  private readonly readers: any[];
  private readonly readerQueues: Array<Promise<void>>;
  private nextReader = 0;

  private constructor(
    private readonly db: any,
    writer: any,
    appender: any,
    readers: any[],
    private readonly schema: EventStoreSchema,
  ) {
    this.writer = writer;
    this.appender = appender;
    this.readers = readers;
    this.readerQueues = this.readers.map(() => Promise.resolve());
  }

  static async create(db: any, schema: EventStoreSchema, readerCount: number): Promise<DuckDbConnectionPool> {
    const table = quoteIdentifier(schema.table || 'event_log');
    const writer = await db.connect();
    const appender = await writer.createAppender(table.slice(1, -1));
    const readers = await Promise.all(Array.from({ length: Math.max(1, readerCount) }, () => db.connect()));
    return new DuckDbConnectionPool(db, writer, appender, readers, schema);
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    await this.writer.run(sql, params);
  }

  append(event: EventEnvelope, flush = true): void {
    for (const column of this.schema.columns) {
      const value = valueAt(column.source || column.name, event);
      if (value === undefined || value === null) {
        this.appender.appendNull();
      } else if (column.type === 'varchar') {
        this.appender.appendVarchar(String(value));
      } else if (column.type === 'bigint') {
        this.appender.appendBigInt(BigInt(value as number | bigint));
      } else if (column.type === 'integer') {
        this.appender.appendInteger(Number(value));
      } else if (column.type === 'double') {
        this.appender.appendDouble(Number(value));
      } else if (column.type === 'boolean') {
        this.appender.appendBoolean(Boolean(value));
      }
    }
    this.appender.endRow();
    if (flush) this.appender.flushSync();
  }

  appendBatch(events: EventEnvelope[]): void {
    for (const event of events) this.append(event, false);
    if (events.length) this.appender.flushSync();
  }

  query(sql: string, params: any[] = []): Promise<any[]> {
    const index = this.nextReader++ % this.readers.length;
    let rows: any[] = [];
    const task = this.readerQueues[index].then(async () => {
      const result = await this.readers[index].runAndReadAll(sql, params);
      rows = result.getRowObjectsJS();
    });
    this.readerQueues[index] = task.catch(() => {});
    return task.then(() => rows);
  }

  close(): void {
    this.appender.closeSync();
    this.writer.closeSync();
    this.readers.forEach((reader) => reader.closeSync());
    this.db.closeSync();
  }
}

export class EventStore {
  private readonly listeners = new Set<EventListener>();
  private db: any = null;
  private cacheDb: any = null;
  private pool: DuckDbConnectionPool | null = null;
  private cachePool: DuckDbConnectionPool | null = null;
  private nextSequence = 1;
  private readonly databasePath: string;
  private readonly retentionMs: number;
  private readonly maxRows: number;
  private readonly hotMaxRows: number;
  private readonly hotMaxBytes: number;
  private readonly hotRetentionMs: number;
  private readonly hotConsumerTtlMs: number;
  private readonly readerCount: number;
  private readonly bufferMaxRows: number;
  private readonly schema: EventStoreSchema;
  private readonly writeMode: EventWriteMode;
  private readonly pending: EventEnvelope[] = [];
  private readonly batchSize = 256;
  private workerRunning = false;
  private cacheMaintenance: Promise<void> = Promise.resolve();
  private cacheMaintenanceScheduled = false;
  private cacheDirtyRows = 0;
  private lastCachePruneAt = 0;
  private flushWaiters: Array<() => void> = [];
  private readonly cachePruneBatch = 256;
  private readonly cachePruneIntervalMs = 1000;
  private readonly hotEvents: EventEnvelope[] = [];
  private hotBytes = 0;
  private readonly activeCursors = new Map<string, { sequence: number; touchedAt: number }>();

  constructor(options: {
    schema: EventStoreSchema;
    databasePath?: string;
    retentionMs?: number;
    maxRows?: number;
    hotMaxRows?: number;
    hotMaxBytes?: number;
    hotRetentionMs?: number;
    hotConsumerTtlMs?: number;
    readerCount?: number;
    bufferMaxRows?: number;
    writeMode?: EventWriteMode;
  }) {
    this.schema = options.schema;
    this.databasePath = options.databasePath || './events.duckdb';
    this.retentionMs = Math.max(0, options.retentionMs ?? 60 * 60 * 1000);
    this.maxRows = Math.max(1, Math.floor(options.maxRows || 1000));
    this.hotMaxRows = Math.max(1, Math.floor(options.hotMaxRows || this.maxRows));
    this.hotMaxBytes = Math.max(1024, Math.floor(options.hotMaxBytes || 128 * 1024 * 1024));
    this.hotRetentionMs = Math.max(0, options.hotRetentionMs ?? options.retentionMs ?? 60 * 60 * 1000);
    this.hotConsumerTtlMs = Math.max(1000, Math.floor(options.hotConsumerTtlMs || 30000));
    this.readerCount = Math.max(1, Math.floor(options.readerCount || 2));
    this.bufferMaxRows = Math.max(this.batchSize, Math.floor(options.bufferMaxRows || 10000));
    this.writeMode = options.writeMode || 'low_latency';
    if (!this.schema.columns.some((column) => column.name === 'id' && column.source === 'id')) throw new Error('Event schema requires id');
    if (!this.schema.columns.some((column) => column.name === 'sequence' && column.source === 'sequence')) throw new Error('Event schema requires sequence');
    if (!this.schema.columns.some((column) => column.name === 'event_at' && column.source === 'at')) throw new Error('Event schema requires event_at');
  }

  private table(): string {
    return quoteIdentifier(this.schema.table || 'event_log');
  }

  async start(): Promise<void> {
    if (this.pool) return;
    if (this.databasePath !== ':memory:') await mkdir(dirname(this.databasePath), { recursive: true });
    this.db = await DuckDBInstance.create(this.databasePath);
    this.cacheDb = await DuckDBInstance.create(':memory:');
    await Promise.all([this.createSchema(this.db), this.createSchema(this.cacheDb)]);
    const metadata = await this.db.connect();
    await metadata.run(`CREATE TABLE IF NOT EXISTS "_event_consumer_offsets" (
      "consumer_group" VARCHAR PRIMARY KEY,
      "sequence" BIGINT NOT NULL,
      "updated_at" BIGINT NOT NULL
    )`);
    metadata.closeSync();
    this.pool = await DuckDbConnectionPool.create(this.db, this.schema, this.readerCount);
    this.cachePool = await DuckDbConnectionPool.create(this.cacheDb, this.schema, this.readerCount);
    const rows = await this.pool.query(`SELECT COALESCE(MAX("sequence"), 0) AS sequence FROM ${this.table()}`);
    this.nextSequence = Number(rows[0]?.sequence || 0) + 1;
  }

  private async createSchema(db: any): Promise<void> {
    const connection = await db.connect();
    const columns = this.schema.columns.map((column) => {
      const nullable = column.nullable === false ? ' NOT NULL' : '';
      const sqlType = column.type === 'varchar' ? 'VARCHAR' : column.type === 'bigint' ? 'BIGINT' : column.type === 'integer' ? 'INTEGER' : column.type === 'double' ? 'DOUBLE' : 'BOOLEAN';
      return `${quoteIdentifier(column.name)} ${sqlType}${nullable}`;
    }).join(',\n');
    await connection.run(`CREATE TABLE IF NOT EXISTS ${this.table()} (${columns})`);
    // Keep deployments using an older event schema readable when optional
    // mediator metadata columns are introduced.
    for (const column of this.schema.columns) {
      const sqlType = column.type === 'varchar' ? 'VARCHAR' : column.type === 'bigint' ? 'BIGINT' : column.type === 'integer' ? 'INTEGER' : column.type === 'double' ? 'DOUBLE' : 'BOOLEAN';
      await connection.run(`ALTER TABLE ${this.table()} ADD COLUMN IF NOT EXISTS ${quoteIdentifier(column.name)} ${sqlType}`);
    }
    connection.closeSync();
  }

  private getPool(): DuckDbConnectionPool {
    if (!this.pool) throw new Error('Event store has not been started');
    return this.pool;
  }

  private getCachePool(): DuckDbConnectionPool {
    if (!this.cachePool) throw new Error('Event store has not been started');
    return this.cachePool;
  }

  async publish(event: Omit<EventEnvelope, 'id' | 'sequence' | 'at'>): Promise<EventEnvelope> {
    return (await this.publishBatch([event]))[0];
  }

  async publishBatch(events: Array<Omit<EventEnvelope, 'id' | 'sequence' | 'at'>>): Promise<EventEnvelope[]> {
    const items = events.map((event) => ({
      topic: 'events',
      ...event,
      id: uuidv7(),
      sequence: this.nextSequence++,
      at: Date.now(),
    } as EventEnvelope));
    if (!items.length) return items;
    for (const item of items) {
      this.hotEvents.push(item);
      this.hotBytes += this.eventBytes(item);
    }
    this.trimHot();
    if (this.writeMode === 'durable') this.getPool().appendBatch(items);
    this.getCachePool().appendBatch(items);
    for (const item of items) {
      for (const listener of this.listeners) {
        try { listener(item); } catch {}
      }
    }
    this.scheduleCacheMaintenance(items.length);
    if (this.writeMode === 'low_latency') {
      if (this.pending.length + items.length >= this.bufferMaxRows) await this.flush();
      this.pending.push(...items);
      this.startWorker();
    }
    return items;
  }

  private startWorker(): void {
    if (this.workerRunning) return;
    this.workerRunning = true;
    void this.drainWorker();
  }

  private async drainWorker(): Promise<void> {
    try {
      while (this.pending.length) {
        const batch = this.pending.splice(0, this.batchSize);
        try {
          this.getPool().appendBatch(batch);
        } catch (error) {
          this.pending.unshift(...batch);
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (!this.pool) throw error;
        }
      }
    } finally {
      this.workerRunning = false;
      if (!this.pending.length) {
        const waiters = this.flushWaiters.splice(0);
        waiters.forEach((resolve) => resolve());
      } else if (this.pool) {
        this.startWorker();
      }
    }
  }

  async flush(): Promise<void> {
    if (!this.pending.length && !this.workerRunning) return;
    await new Promise<void>((resolve) => this.flushWaiters.push(resolve));
    if (this.pending.length && !this.workerRunning) this.startWorker();
  }

  private async pruneCache(): Promise<void> {
    await this.getCachePool().run(`DELETE FROM ${this.table()} WHERE "event_at" < ? OR "sequence" <= (
      SELECT COALESCE(MAX("sequence"), 0) - ? FROM ${this.table()}
    )`, [Date.now() - this.hotRetentionMs, this.hotMaxRows]);
  }

  private eventBytes(event: EventEnvelope): number {
    // This is deliberately an estimate. The durable/cache append path already
    // serializes the envelope when it materializes event_json; serializing it a
    // second time here makes the hot path pay the payload cost twice.
    let bytes = 128;
    for (const value of Object.values(event)) {
      if (typeof value === 'string') bytes += value.length * 2;
      else if (typeof value === 'number' || typeof value === 'boolean') bytes += 16;
      else if (value !== null && value !== undefined) bytes += 256;
    }
    return bytes;
  }

  private trimHot(): void {
    const now = Date.now();
    for (const [id, cursor] of this.activeCursors) {
      if (now - cursor.touchedAt > this.hotConsumerTtlMs) this.activeCursors.delete(id);
    }
    const protectedSequence = this.activeCursors.size
      ? Math.min(...[...this.activeCursors.values()].map((cursor) => cursor.sequence))
      : Number.POSITIVE_INFINITY;
    while (this.hotEvents.length > 1) {
      const first = this.hotEvents[0];
      const tooOld = first.at < now - this.hotRetentionMs;
      const tooManyRows = this.hotEvents.length > this.hotMaxRows;
      const tooLarge = this.hotBytes > this.hotMaxBytes;
      if ((!tooOld && !tooManyRows && !tooLarge) || first.sequence >= protectedSequence) break;
      this.hotEvents.shift();
      this.hotBytes -= this.eventBytes(first);
    }
  }

  touchCursor(id: string, sequence: number): void {
    this.activeCursors.set(id, { sequence: Math.max(0, Math.floor(sequence)), touchedAt: Date.now() });
  }

  releaseCursor(id: string): void {
    this.activeCursors.delete(id);
    this.trimHot();
  }

  private scheduleCacheMaintenance(rows = 1): void {
    this.cacheDirtyRows += rows;
    const now = Date.now();
    if (this.cacheMaintenanceScheduled
      || (this.cacheDirtyRows < this.cachePruneBatch && now - this.lastCachePruneAt < this.cachePruneIntervalMs)) return;
    this.cacheMaintenanceScheduled = true;
    this.cacheMaintenance = this.cacheMaintenance.catch(() => {}).then(async () => {
      await this.pruneCache();
      this.cacheDirtyRows = 0;
      this.lastCachePruneAt = Date.now();
    }).finally(() => {
      this.cacheMaintenanceScheduled = false;
    });
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeStream(): EventSubscription {
    const queue: EventEnvelope[] = [];
    let closed = false;
    let wake: (() => void) | null = null;
    const listener = (event: EventEnvelope) => {
      if (closed) return;
      queue.push(event);
      wake?.();
      wake = null;
    };
    this.listeners.add(listener);
    const close = () => {
      if (closed) return;
      closed = true;
      this.listeners.delete(listener);
      wake?.();
      wake = null;
    };
    const events = {
      async *[Symbol.asyncIterator](): AsyncGenerator<EventEnvelope> {
        while (!closed || queue.length) {
          if (!queue.length) await new Promise<void>((resolve) => { wake = resolve; });
          while (queue.length) yield queue.shift()!;
        }
      },
    };
    return { events, close };
  }

  private async historyRows(options: { afterSequence?: number; limit?: number } = {}): Promise<any[]> {
    const afterSequence = Math.max(0, Math.floor(options.afterSequence || 0));
    const limit = Math.max(1, Math.min(10000, Math.floor(options.limit || 1000)));
    const cacheBounds = await this.getCachePool().query(`SELECT MIN("sequence") AS first_sequence, MAX("sequence") AS last_sequence FROM ${this.table()}`);
    const firstCached = Number(cacheBounds[0]?.first_sequence ?? 0);
    const lastCached = Number(cacheBounds[0]?.last_sequence ?? 0);
    const offsetCached = firstCached > 0 && (afterSequence >= firstCached - 1 || afterSequence >= lastCached);
    const rows = offsetCached
      ? await this.getCachePool().query(`SELECT * FROM ${this.table()} WHERE "sequence" > ? ORDER BY "sequence" LIMIT ?`, [afterSequence, limit])
      : await this.getPool().query(`SELECT * FROM ${this.table()} WHERE "sequence" > ? ORDER BY "sequence" LIMIT ?`, [afterSequence, limit]);
    return rows;
  }

  async records(options: { afterSequence?: number; limit?: number; topic?: string } = {}): Promise<EventEnvelope[]> {
    const afterSequence = Math.max(0, Math.floor(options.afterSequence || 0));
    const limit = Math.max(1, Math.min(10000, Math.floor(options.limit || 1000)));
    const firstHot = this.hotEvents[0]?.sequence || 0;
    if (firstHot > 0 && afterSequence >= firstHot - 1) {
      return this.hotEvents
        .filter((event) => event.sequence > afterSequence && (!options.topic || String(event.topic || 'events') === options.topic))
        .slice(0, limit);
    }
    const rows = await this.historyRows(options);
    const topic = options.topic;
    return rows
      .filter((row) => !topic || String(row.topic || 'events') === topic)
      .map((row) => {
        const normalized = Object.fromEntries(Object.entries(row)
          .filter(([name]) => name !== 'event_at' && name !== 'event_json')
          .map(([name, value]) => [name, typeof value === 'bigint' ? Number(value) : value]));
        let envelope: Record<string, unknown> = {};
        if (typeof row.event_json === 'string') {
          try { envelope = JSON.parse(row.event_json); } catch {}
        }
        return {
          ...envelope,
          ...normalized,
          sequence: Number(row.sequence),
          at: Number(row.event_at),
          topic: row.topic || 'events',
        } as EventEnvelope;
      });
  }

  async consumerOffset(group: string): Promise<number> {
    const rows = await this.getPool().query('SELECT "sequence" FROM "_event_consumer_offsets" WHERE "consumer_group" = ?', [group]);
    return Number(rows[0]?.sequence || 0);
  }

  async acknowledge(group: string, sequence: number): Promise<void> {
    const offset = Math.max(0, Math.floor(sequence));
    await this.getPool().run(`INSERT INTO "_event_consumer_offsets" ("consumer_group", "sequence", "updated_at")
      VALUES (?, ?, ?) ON CONFLICT ("consumer_group") DO UPDATE SET
      "sequence" = GREATEST("_event_consumer_offsets"."sequence", excluded."sequence"),
      "updated_at" = excluded."updated_at"`, [group, offset, Date.now()]);
  }

  async *historyStream(options: { afterSequence?: number; limit?: number } = {}): AsyncGenerator<Uint8Array> {
    const rows = await this.historyRows(options);
    const columns = Object.fromEntries(this.schema.columns.map((column) => [
      column.name,
      rows.map((row) => row[column.name] ?? null),
    ]));
    const writer = new RecordBatchStreamWriter();
    const table = tableFromArrays(columns);
    const writing = Promise.resolve().then(() => {
      writer.write(table);
      writer.close();
    });
    try {
      for await (const chunk of writer) yield chunk;
      await writing;
    } catch (error) {
      writer.abort(error);
      throw error;
    }
  }

  async history(options: { afterSequence?: number; limit?: number } = {}): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for await (const chunk of this.historyStream(options)) {
      chunks.push(chunk);
      length += chunk.byteLength;
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  async stop(): Promise<void> {
    if (!this.pool) return;
    await this.flush();
    await this.cacheMaintenance;
    this.pool.close();
    this.cachePool?.close();
    this.pool = null;
    this.cachePool = null;
    this.db = null;
    this.cacheDb = null;
    this.listeners.clear();
    this.hotEvents.length = 0;
    this.hotBytes = 0;
    this.activeCursors.clear();
  }

  async count(): Promise<number> {
    await this.flush();
    const rows = await this.getPool().query(`SELECT COUNT(*) AS count FROM ${this.table()}`);
    return Number(rows[0]?.count || 0);
  }

  async cacheCount(): Promise<number> {
    await this.cacheMaintenance;
    const rows = await this.getCachePool().query(`SELECT COUNT(*) AS count FROM ${this.table()}`);
    return Number(rows[0]?.count || 0);
  }
}
