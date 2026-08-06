import { DuckDBInstance } from '@duckdb/node-api';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { v7 as uuidv7 } from 'uuid';

export type EventRecord = {
  id: string;
  sequence: number;
  operation: string;
  status: 'success' | 'failed';
  actorId?: string;
  clientMessageId?: string;
  messageId?: string;
  message?: Record<string, any>;
  error?: string;
  threadId?: string;
  at: number;
};

type NewEvent = Omit<EventRecord, 'id' | 'sequence' | 'at'>;
type EventListener = (event: EventRecord) => void;

class DuckDbConnectionPool {
  private readonly writer: any;
  private readonly appender: any;
  private readonly readers: any[];
  private readonly readerQueues: Array<Promise<void>>;
  private nextReader = 0;

  private constructor(private readonly db: any, writer: any, appender: any, readers: any[]) {
    this.writer = writer;
    this.appender = appender;
    this.readers = readers;
    this.readerQueues = this.readers.map(() => Promise.resolve());
  }

  static async create(db: any, readerCount: number): Promise<DuckDbConnectionPool> {
    const writer = await db.connect();
    const appender = await writer.createAppender('event_log');
    const readers = await Promise.all(
      Array.from({ length: Math.max(1, readerCount) }, () => db.connect()),
    );
    return new DuckDbConnectionPool(db, writer, appender, readers);
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    await this.writer.run(sql, params);
  }

  append(event: EventRecord): void {
    this.appender.appendVarchar(event.id);
    this.appender.appendBigInt(BigInt(event.sequence));
    this.appender.appendInteger(0);
    this.appender.appendVarchar(event.operation);
    this.appender.appendVarchar(event.status);
    event.actorId === undefined ? this.appender.appendNull() : this.appender.appendVarchar(event.actorId);
    event.clientMessageId === undefined ? this.appender.appendNull() : this.appender.appendVarchar(event.clientMessageId);
    event.messageId === undefined ? this.appender.appendNull() : this.appender.appendVarchar(event.messageId);
    event.error === undefined ? this.appender.appendNull() : this.appender.appendVarchar(event.error);
    event.threadId === undefined ? this.appender.appendNull() : this.appender.appendVarchar(event.threadId);
    this.appender.appendBigInt(BigInt(event.at));
    const message = event.message;
    message?.thread_id === undefined ? this.appender.appendNull() : this.appender.appendVarchar(String(message.thread_id));
    message?.sender_id === undefined ? this.appender.appendNull() : this.appender.appendVarchar(String(message.sender_id));
    message?.sender_name === undefined ? this.appender.appendNull() : this.appender.appendVarchar(String(message.sender_name));
    message?.body === undefined ? this.appender.appendNull() : this.appender.appendVarchar(String(message.body));
    message?.created_at === undefined ? this.appender.appendNull() : this.appender.appendVarchar(String(message.created_at));
    this.appender.endRow();
    this.appender.flushSync();
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
  private write: Promise<void> = Promise.resolve();
  private readonly databasePath: string;
  private readonly retentionMs: number;
  private readonly maxRows: number;
  private readonly readerCount: number;

  constructor(options: {
    databasePath?: string;
    retentionMs?: number;
    maxRows?: number;
    readerCount?: number;
  } = {}) {
    // Disk-backed DuckDB is the default. Tests can explicitly use :memory:.
    this.databasePath = options.databasePath || './events.duckdb';
    this.retentionMs = Math.max(0, options.retentionMs ?? 60 * 60 * 1000);
    this.maxRows = Math.max(1, Math.floor(options.maxRows || 1000));
    this.readerCount = Math.max(1, Math.floor(options.readerCount || 2));
  }

  async start(): Promise<void> {
    if (this.pool) return;
    if (this.databasePath !== ':memory:') await mkdir(dirname(this.databasePath), { recursive: true });
    this.db = await DuckDBInstance.create(this.databasePath);
    this.cacheDb = await DuckDBInstance.create(':memory:');
    await this.createSchema(this.db);
    await this.createSchema(this.cacheDb);
    this.pool = await DuckDbConnectionPool.create(this.db, this.readerCount);
    this.cachePool = await DuckDbConnectionPool.create(this.cacheDb, this.readerCount);
    const rows = await this.pool.query('SELECT COALESCE(MAX(sequence), 0) AS sequence FROM event_log');
    this.nextSequence = Number(rows[0]?.sequence || 0) + 1;
  }

  private async createSchema(db: any): Promise<void> {
    const schemaConnection = await db.connect();
    await schemaConnection.run(`
      CREATE TABLE IF NOT EXISTS event_log (
        id VARCHAR PRIMARY KEY,
        sequence BIGINT NOT NULL,
        shard INTEGER NOT NULL DEFAULT 0,
        operation VARCHAR NOT NULL,
        status VARCHAR NOT NULL,
        actor_id VARCHAR,
        client_message_id VARCHAR,
        message_id VARCHAR,
        error VARCHAR,
        thread_id VARCHAR,
        event_at BIGINT NOT NULL,
        message_thread_id VARCHAR,
        message_sender_id VARCHAR,
        message_sender_name VARCHAR,
        message_body VARCHAR,
        message_created_at VARCHAR
      )
    `);
    schemaConnection.closeSync();
  }

  private getPool(): DuckDbConnectionPool {
    if (!this.pool) throw new Error('Event store has not been started');
    return this.pool;
  }

  private getCachePool(): DuckDbConnectionPool {
    if (!this.cachePool) throw new Error('Event store has not been started');
    return this.cachePool;
  }

  private append(event: EventRecord): void {
    this.getPool().append(event);
    this.getCachePool().append(event);
  }

  async publish(event: NewEvent): Promise<EventRecord> {
    const item: EventRecord = { ...event, id: uuidv7(), sequence: this.nextSequence++, at: Date.now() };
    this.write = this.write.catch(() => {}).then(async () => {
      this.append(item);
      await this.prune();
      for (const listener of this.listeners) {
        try { listener(item); } catch {}
      }
    });
    await this.write;
    return item;
  }

  private async prune(): Promise<void> {
    const cutoff = Date.now() - this.retentionMs;
    await this.getCachePool().run(`DELETE FROM event_log WHERE event_at < ? OR sequence <= (
      SELECT COALESCE(MAX(sequence), 0) - ? FROM event_log
    )`, [cutoff, this.maxRows]);
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async stop(): Promise<void> {
    if (!this.pool) return;
    await this.write;
    this.pool.close();
    this.cachePool?.close();
    this.pool = null;
    this.cachePool = null;
    this.db = null;
    this.cacheDb = null;
    this.listeners.clear();
  }

  async count(): Promise<number> {
    const rows = await this.getPool().query('SELECT COUNT(*) AS count FROM event_log');
    return Number(rows[0]?.count || 0);
  }

  async cacheCount(): Promise<number> {
    const rows = await this.getCachePool().query('SELECT COUNT(*) AS count FROM event_log');
    return Number(rows[0]?.count || 0);
  }
}
