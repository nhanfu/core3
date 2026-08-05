import duckdb from 'duckdb';
import { mkdir, open, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export type EventRecord = {
  id: string;
  sequence: number;
  shard: number;
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

type NewEvent = Omit<EventRecord, 'id' | 'sequence' | 'shard' | 'at'>;
type EventListener = (event: EventRecord) => void;

class DuckDbConnectionPool {
  private readonly writer: any;
  private readonly readers: any[];
  private readonly readerQueues: Array<Promise<void>>;
  private nextReader = 0;

  constructor(private readonly db: any, readerCount: number) {
    // DuckDB permits only one writer per database. Keep that connection
    // dedicated to mutations and serialize all callers through the shard.
    this.writer = db.connect();
    this.readers = Array.from({ length: Math.max(1, readerCount) }, () => db.connect());
    this.readerQueues = this.readers.map(() => Promise.resolve());
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writer.run(sql, ...params, (error: Error | null) => error ? reject(error) : resolve());
    });
  }

  query(sql: string, params: any[] = []): Promise<any[]> {
    const index = this.nextReader++ % this.readers.length;
    let rows: any[] = [];
    const task = this.readerQueues[index].then(() => new Promise<void>((resolve, reject) => {
      this.readers[index].all(sql, ...params, (error: Error | null, result: any[]) => {
        if (error) reject(error);
        else { rows = result || []; resolve(); }
      });
    }));
    this.readerQueues[index] = task.catch(() => {});
    return task.then(() => rows);
  }

  async close(): Promise<void> {
    await Promise.all([
      new Promise<void>((resolve) => this.writer.close(() => resolve())),
      ...this.readers.map((reader) => new Promise<void>((resolve) => reader.close(() => resolve()))),
    ]);
  }
}

type Shard = {
  index: number;
  db: any;
  pool: DuckDbConnectionPool;
  logPath: string;
  nextSequence: number;
  write: Promise<void>;
};

function shardHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class EventStore {
  private readonly listeners = new Set<EventListener>();
  private readonly shards: Shard[] = [];
  private readonly shardCount: number;
  private readonly baseLogPath: string;
  private readonly retentionMs: number;
  private readonly maxRows: number;
  private readonly readerCount: number;

  constructor(options: {
    logPath: string;
    shardCount?: number;
    retentionMs?: number;
    maxRows?: number;
    readerCount?: number;
  }) {
    this.baseLogPath = options.logPath;
    this.shardCount = Math.max(1, Math.floor(options.shardCount || 1));
    this.retentionMs = Math.max(0, options.retentionMs ?? 60 * 60 * 1000);
    this.maxRows = Math.max(1, Math.floor(options.maxRows || 1000));
    this.readerCount = Math.max(1, Math.floor(options.readerCount || 2));
  }

  async start(): Promise<void> {
    await mkdir(dirname(this.baseLogPath), { recursive: true });
    for (let index = 0; index < this.shardCount; index += 1) {
      const logPath = this.shardCount === 1
        ? this.baseLogPath
        : `${this.baseLogPath}.shard-${index}`;
      const shard: Shard = {
        index,
        db: new duckdb.Database(':memory:'),
        pool: null as any,
        logPath,
        nextSequence: 1,
        write: Promise.resolve(),
      };
      shard.pool = new DuckDbConnectionPool(shard.db, this.readerCount);
      await this.createSchema(shard);
      this.shards.push(shard);
      await this.restore(shard);
    }
  }

  private createSchema(shard: Shard): Promise<void> {
    return shard.pool.run(`
        CREATE TABLE IF NOT EXISTS event_log (
          id VARCHAR PRIMARY KEY,
          sequence BIGINT NOT NULL,
          shard INTEGER NOT NULL,
          operation VARCHAR NOT NULL,
          status VARCHAR NOT NULL,
          actor_id VARCHAR,
          client_message_id VARCHAR,
          message_id VARCHAR,
          message_json VARCHAR,
          error VARCHAR,
          thread_id VARCHAR,
          event_at BIGINT NOT NULL
        )
      `);
  }

  private async recover(shard: Shard): Promise<void> {
    await shard.pool.close();
    shard.db = new duckdb.Database(':memory:');
    shard.pool = new DuckDbConnectionPool(shard.db, this.readerCount);
    await this.createSchema(shard);
    await this.restore(shard);
  }

  private async restore(shard: Shard): Promise<void> {
    let contents = '';
    try { contents = await readFile(shard.logPath, 'utf8'); } catch (error: any) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    const events = contents.split('\n').filter(Boolean).map((line) => JSON.parse(line) as EventRecord);
    for (const event of events) {
      if (event.shard !== shard.index) throw new Error(`Event ${event.id} belongs to shard ${event.shard}, not ${shard.index}`);
      await this.insert(shard, event);
      shard.nextSequence = Math.max(shard.nextSequence, event.sequence + 1);
    }
  }

  private shardFor(event: NewEvent): Shard {
    if (!this.shards.length) throw new Error('Event store has not started');
    const key = event.threadId || event.actorId || '';
    return this.shards[shardHash(key) % this.shards.length];
  }

  private insert(shard: Shard, event: EventRecord): Promise<void> {
    return shard.pool.run(`INSERT OR REPLACE INTO event_log
      (id, sequence, shard, operation, status, actor_id, client_message_id, message_id, message_json, error, thread_id, event_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      event.id, event.sequence, event.shard, event.operation, event.status,
      event.actorId || null, event.clientMessageId || null, event.messageId || null,
      event.message ? JSON.stringify(event.message) : null, event.error || null,
      event.threadId || null, event.at,
    ]);
  }

  async publish(event: NewEvent): Promise<EventRecord> {
    const shard = this.shardFor(event);
    const item: EventRecord = {
      ...event,
      id: randomUUID(),
      sequence: shard.nextSequence++, shard: shard.index, at: Date.now(),
    };
    shard.write = shard.write.catch(() => {}).then(async () => {
      const handle = await open(shard.logPath, 'a');
      try {
        await handle.appendFile(`${JSON.stringify(item)}\n`, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        await this.insert(shard, item);
      } catch {
        await this.recover(shard);
      }
      await this.pruneShard(shard);
      for (const listener of this.listeners) {
        try { listener(item); } catch {}
      }
    });
    await shard.write;
    return item;
  }

  private async pruneShard(shard: Shard): Promise<void> {
    const cutoff = Date.now() - this.retentionMs;
    await shard.pool.run(`DELETE FROM event_log WHERE event_at < ? OR sequence <= (
      SELECT COALESCE(MAX(sequence), 0) - ? FROM event_log
    )`, [cutoff, this.maxRows]);
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async stop(): Promise<void> {
    await Promise.all(this.shards.map((shard) => shard.write));
    await Promise.all(this.shards.map((shard) => shard.pool.close()));
    this.shards.length = 0;
    this.listeners.clear();
  }

  async count(): Promise<number> {
    const counts = await Promise.all(this.shards.map((shard) => shard.pool.query('SELECT COUNT(*) AS count FROM event_log')));
    return counts.reduce((total, rows) => total + Number(rows[0]?.count || 0), 0);
  }
}

