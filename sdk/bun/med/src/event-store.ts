import { Float64, Int32, Int64, RecordBatchStreamWriter, Utf8, vectorFromArray, tableFromArrays, tableFromIPC, tableToIPC } from 'apache-arrow';
import { mkdir, readdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v7 as uuidv7 } from 'uuid';
import parquet from 'parquet-wasm';

export type EventValueType = 'varchar' | 'bigint' | 'integer' | 'double' | 'boolean';
export type EventSchemaColumn = { name: string; type: EventValueType; source?: string; nullable?: boolean };
export type EventStoreSchema = { table?: string; columns: EventSchemaColumn[] };
export type EventWriteMode = 'low_latency' | 'durable';
export type EventEnvelope = { id: string; sequence: number; at: number; topic?: string; key?: string; sourceNode?: string; [key: string]: unknown };
export type EventRecord = EventEnvelope;
type EventListener = (event: EventEnvelope) => void;
export type EventSubscription = { events: AsyncIterable<EventEnvelope>; close: () => void; ack?: (sequence: number) => Promise<void> };
export type EventBus = Pick<EventStore, 'start' | 'stop' | 'publish' | 'poll' | 'subscribeStream'>;

type Segment = { file: string; firstSequence: number; lastSequence: number; firstAt: number; lastAt: number; rows: number; bytes?: number };
type HotSegment = { firstSequence: number; lastSequence: number; bytes: Uint8Array; events: EventEnvelope[] };

function valueAt(source: string | undefined, event: EventEnvelope): unknown {
  if (!source) return undefined;
  if (source === '@json') return JSON.stringify(event);
  return source.split('.').reduce((value: any, key) => value?.[key], event);
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = target;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts.at(-1)!] = value;
}

function normalizeRow(row: any, schema?: EventStoreSchema): EventEnvelope {
  let envelope: Record<string, unknown> = {};
  // Older segments may contain the JSON envelope. Keep reading them while new
  // segments use only the declarative columns from the configured schema.
  if (typeof row.event_json === 'string') {
    try { envelope = JSON.parse(row.event_json); } catch {}
  }
  if (!Object.keys(envelope).length && schema) {
    for (const column of schema.columns) {
      if (column.name === 'id' || column.name === 'sequence' || column.name === 'event_at') continue;
      const value = row[column.name];
      if (value === null || value === undefined) continue;
      setPath(envelope, column.source && column.source !== '@json' ? column.source : column.name, value);
    }
  }
  return { ...envelope, sequence: Number(row.sequence), at: Number(row.event_at), id: String(row.id), topic: row.topic || envelope.topic || 'events' } as EventEnvelope;
}

export function encodeEventBatch(events: EventEnvelope[]): Uint8Array {
  const table = tableFromArrays({
    id: events.map((event) => event.id),
    sequence: events.map((event) => event.sequence),
    event_at: events.map((event) => event.at),
    event_json: events.map((event) => JSON.stringify(event)),
  });
  return tableToIPC(table, 'stream');
}

export function decodeEventBatch(bytes: Uint8Array): EventEnvelope[] {
  return tableFromIPC(bytes).toArray().map(normalizeRow);
}

function arrowBytes(events: EventEnvelope[], schema: EventStoreSchema): Uint8Array {
  const table = eventTable(events, schema);
  return tableToIPC(table, 'stream');
}

function eventTable(events: EventEnvelope[], schema: EventStoreSchema) {
  const columns = Object.fromEntries(schema.columns.map((column) => {
    const values = events.map((event) => valueAt(column.source || column.name, event) ?? null);
    switch (column.type) {
      case 'bigint': return [column.name, vectorFromArray(values.map((value) => value == null ? null : BigInt(Number(value))), new Int64())];
      case 'integer': return [column.name, vectorFromArray(values.map((value) => value == null ? null : Number(value)), new Int32())];
      case 'double': return [column.name, vectorFromArray(values.map((value) => value == null ? null : Number(value)), new Float64())];
      case 'boolean': return [column.name, vectorFromArray(values.map((value) => value == null ? null : Boolean(value)))];
      default: return [column.name, vectorFromArray(values.map((value) => value == null ? null : String(value)), new Utf8())];
    }
  }));
  return tableFromArrays(columns);
}

export class EventStore {
  private readonly listeners = new Set<EventListener>();
  private readonly dataPath: string;
  private readonly temporaryDataPath: boolean;
  private readonly retentionMs: number;
  private readonly maxRows: number;
  private readonly hotMaxRows: number;
  private readonly hotMaxBytes: number;
  private readonly hotRetentionMs: number;
  private readonly hotConsumerTtlMs: number;
  private readonly segmentMaxRows: number;
  private readonly bufferMaxRows: number;
  private readonly schema: EventStoreSchema;
  private readonly writeMode: EventWriteMode;
  private readonly pending: EventEnvelope[] = [];
  private readonly segments: Segment[] = [];
  private readonly hotSegments: HotSegment[] = [];
  private readonly activeCursors = new Map<string, { sequence: number; touchedAt: number }>();
  private nextSequence = 1;
  private hotRows = 0;
  private hotBytes = 0;
  private workerRunning = false;
  private workerForcePartial = false;
  private workerTimer: ReturnType<typeof setTimeout> | null = null;
  private flushWaiters: Array<() => void> = [];
  private persistTail: Promise<void> = Promise.resolve();
  private offsetWriteTail: Promise<void> = Promise.resolve();
  private manifestDirty = false;

  constructor(options: {
    schema: EventStoreSchema; databasePath?: string; retentionMs?: number; maxRows?: number;
    hotMaxRows?: number; hotMaxBytes?: number; hotRetentionMs?: number; hotConsumerTtlMs?: number;
    segmentMaxRows?: number; pullBatchSize?: number; readerCount?: number; bufferMaxRows?: number; writeMode?: EventWriteMode;
  }) {
    this.schema = options.schema;
    const configuredPath = options.databasePath || '../coredb/events-parquet';
    this.temporaryDataPath = configuredPath === ':memory:';
    this.dataPath = this.temporaryDataPath
      ? join(tmpdir(), `core3-event-${process.pid}-${Math.random().toString(36).slice(2)}`)
      : configuredPath.endsWith('.duckdb') ? configuredPath.slice(0, -'.duckdb'.length) + '-parquet' : configuredPath;
    this.retentionMs = Math.max(0, options.retentionMs ?? 60 * 60 * 1000);
    this.maxRows = Math.max(1, Math.floor(options.maxRows || 1000));
    this.hotMaxRows = Math.max(1, Math.floor(options.hotMaxRows || this.maxRows));
    this.hotMaxBytes = Math.max(1024, Math.floor(options.hotMaxBytes || 128 * 1024 * 1024));
    this.hotRetentionMs = Math.max(0, options.hotRetentionMs ?? options.retentionMs ?? 60 * 60 * 1000);
    this.hotConsumerTtlMs = Math.max(1000, Math.floor(options.hotConsumerTtlMs || 30000));
    this.segmentMaxRows = Math.max(1, Math.floor(options.segmentMaxRows || 200));
    this.bufferMaxRows = Math.max(this.batchSize, Math.floor(options.bufferMaxRows || 10000));
    this.writeMode = options.writeMode || 'low_latency';
  }

  private manifestPath(): string { return join(this.dataPath, 'manifest.json'); }
  private offsetsPath(): string { return join(this.dataPath, 'consumer-offsets.json'); }
  async start(): Promise<void> {
    await mkdir(this.dataPath, { recursive: true }).catch((error: any) => {
      if (error?.code !== 'EEXIST') throw error;
    });
    const manifest = await this.readJson<{ segments?: Segment[] }>(this.manifestPath(), {});
    const listed = Array.isArray(manifest.segments) ? manifest.segments : [];
    const files = await readdir(this.dataPath);
    const known = new Set(listed.map((segment) => segment.file));
    for (const file of files.filter((name) => name.endsWith('.parquet') && !known.has(name))) {
      const match = /^events-(\d+)-(\d+)\.parquet$/.exec(file);
      if (match) listed.push({ file, firstSequence: Number(match[1]), lastSequence: Number(match[2]), firstAt: 0, lastAt: 0, rows: Number(match[2]) - Number(match[1]) + 1 });
    }
    listed.sort((a, b) => a.firstSequence - b.firstSequence);
    this.segments.push(...listed);
    this.nextSequence = Math.max(0, ...this.segments.map((segment) => segment.lastSequence)) + 1;
    await this.writeManifest();
  }

  private async readJson<T>(path: string, fallback: T): Promise<T> {
    try { return JSON.parse(await readFile(path, 'utf8')) as T; } catch { return fallback; }
  }

  private async writeAtomic(path: string, content: string): Promise<void> {
    const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, content);
    await rename(temporary, path);
  }

  private async writeManifest(): Promise<void> {
    await this.writeAtomic(this.manifestPath(), JSON.stringify({ version: 1, segments: this.segments }, null, 2));
    this.manifestDirty = false;
  }

  private async persistSegment(events: EventEnvelope[]): Promise<void> {
    if (!events.length) return;
    const first = events[0];
    const last = events[events.length - 1];
    const file = `events-${String(first.sequence).padStart(16, '0')}-${String(last.sequence).padStart(16, '0')}.parquet`;
    const temporary = join(this.dataPath, `${file}.tmp`);
    // Build the IPC table through the schema-aware path. Raw tableFromArrays
    // infers object columns from values such as `{ ... }` and then crashes
    // when another row has null for the same column (Object.keys(null)).
    // eventTable also preserves the declared Arrow type for all-null columns.
    const table = eventTable(events, this.schema);
    const wasmTable = parquet.Table.fromIPCStream(tableToIPC(table, 'stream'));
    const parquetBytes = parquet.writeParquet(wasmTable);
    await writeFile(temporary, parquetBytes);
    await rename(temporary, join(this.dataPath, file));
    this.segments.push({ file, firstSequence: first.sequence, lastSequence: last.sequence, firstAt: first.at, lastAt: last.at, rows: events.length });
    this.manifestDirty = true;
    await this.pruneSegments();
    await this.writeManifest();
  }

  private async persist(events: EventEnvelope[]): Promise<void> {
    const previous = this.persistTail;
    let release!: () => void;
    this.persistTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      for (let offset = 0; offset < events.length; offset += this.segmentMaxRows) await this.persistSegment(events.slice(offset, offset + this.segmentMaxRows));
    } finally { release(); }
  }

  private async pruneSegments(): Promise<void> {
    let rows = this.segments.reduce((sum, segment) => sum + segment.rows, 0);
    const cutoff = Date.now() - this.retentionMs;
    while (this.segments.length > 1 && this.segments[0].lastAt > 0 && this.segments[0].lastAt < cutoff) {
      const segment = this.segments.shift()!;
      rows -= segment.rows;
      await unlink(join(this.dataPath, segment.file)).catch(() => {});
    }
  }

  async publish(event: Omit<EventEnvelope, 'id' | 'sequence' | 'at'>): Promise<EventEnvelope> { return (await this.publishBatch([event]))[0]; }

  async poll(options: { topic?: string; afterSequence?: number; maxEvents?: number; maxWaitMs?: number } = {}): Promise<EventEnvelope[]> {
    return this.records({ afterSequence: options.afterSequence, limit: options.maxEvents, topic: options.topic });
  }

  async publishBatch(events: Array<Omit<EventEnvelope, 'id' | 'sequence' | 'at'>>): Promise<EventEnvelope[]> {
    const items = events.map((event) => ({ topic: 'events', ...event, id: uuidv7(), sequence: this.nextSequence++, at: Date.now() } as EventEnvelope));
    if (!items.length) return items;
    const bytes = arrowBytes(items, this.schema);
    this.hotSegments.push({ firstSequence: items[0].sequence, lastSequence: items.at(-1)!.sequence, bytes, events: items });
    this.hotRows += items.length; this.hotBytes += bytes.byteLength;
    this.trimHot();
    for (const item of items) for (const listener of this.listeners) { try { listener(item); } catch {} }
    this.pending.push(...items);
    if (this.pending.length >= this.bufferMaxRows) await this.flush();
    else if (this.writeMode === 'durable' && this.pending.length >= this.segmentMaxRows) await this.flush();
    else this.scheduleWorker();
    return items;
  }

  private scheduleWorker(): void {
    if (this.workerRunning || this.workerTimer) return;
    if (this.pending.length >= this.segmentMaxRows) { this.startWorker(); return; }
    // Keep the tail in memory until it reaches segmentMaxRows. This prevents
    // a quiet stream from producing one small Parquet file per time window.
  }
  private startWorker(forcePartial = false): void {
    this.workerForcePartial ||= forcePartial;
    if (!this.workerRunning) { this.workerRunning = true; void this.drainWorker(); }
  }
  private async drainWorker(): Promise<void> {
    try {
      while (this.pending.length >= this.segmentMaxRows || (this.workerForcePartial && this.pending.length)) {
        const size = this.workerForcePartial ? Math.min(this.segmentMaxRows, this.pending.length) : this.segmentMaxRows;
        await this.persist(this.pending.splice(0, size));
      }
    }
    finally {
      this.workerRunning = false;
      const forcePartial = this.workerForcePartial;
      this.workerForcePartial = false;
      const waiters = this.flushWaiters.splice(0);
      if (!this.pending.length) waiters.forEach((resolve) => resolve());
      else if (waiters.length || forcePartial) this.startWorker(true);
    }
  }
  async flush(): Promise<void> {
    if (!this.pending.length && !this.workerRunning) return;
    if (this.workerTimer) { clearTimeout(this.workerTimer); this.workerTimer = null; }
    if (this.pending.length) this.startWorker(true);
    await new Promise<void>((resolve) => this.flushWaiters.push(resolve));
  }

  private trimHot(): void {
    const now = Date.now();
    for (const [id, cursor] of this.activeCursors) if (now - cursor.touchedAt > this.hotConsumerTtlMs) this.activeCursors.delete(id);
    const protectedSequence = this.activeCursors.size ? Math.min(...[...this.activeCursors.values()].map((cursor) => cursor.sequence)) : Infinity;
    while (this.hotSegments.length > 1) {
      const first = this.hotSegments[0];
      if ((this.hotRows <= this.hotMaxRows && this.hotBytes <= this.hotMaxBytes && first.events[0].at >= now - this.hotRetentionMs) || first.lastSequence >= protectedSequence) break;
      this.hotSegments.shift(); this.hotRows -= first.events.length; this.hotBytes -= first.bytes.byteLength;
    }
  }
  touchCursor(id: string, sequence: number): void { this.activeCursors.set(id, { sequence: Math.max(0, Math.floor(sequence)), touchedAt: Date.now() }); }
  releaseCursor(id: string): void { this.activeCursors.delete(id); this.trimHot(); }

  subscribe(listener: EventListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  subscribeStream(): EventSubscription {
    const queue: EventEnvelope[] = []; let closed = false; let wake: (() => void) | null = null;
    const listener = (event: EventEnvelope) => { if (!closed) { queue.push(event); wake?.(); wake = null; } };
    this.listeners.add(listener);
    const close = () => { if (!closed) { closed = true; this.listeners.delete(listener); wake?.(); wake = null; } };
    const events = { async *[Symbol.asyncIterator](): AsyncGenerator<EventEnvelope> { while (!closed || queue.length) { if (!queue.length) await new Promise<void>((resolve) => { wake = resolve; }); while (queue.length) yield queue.shift()!; } } };
    return { events, close };
  }

  private findHotIndex(sequence: number): number {
    let low = 0, high = this.hotSegments.length;
    while (low < high) { const mid = (low + high) >> 1; if (this.hotSegments[mid].lastSequence <= sequence) low = mid + 1; else high = mid; }
    return low;
  }

  private async *iterateRecords(options: { afterSequence?: number; limit?: number; topic?: string } = {}): AsyncGenerator<EventEnvelope> {
    const after = Math.max(0, Math.floor(options.afterSequence || 0)); const limit = Math.max(1, Math.min(10000, Math.floor(options.limit || 1000))); const topic = options.topic;
    let emitted = 0;
    if (this.hotSegments.length && after >= this.hotSegments[0].firstSequence - 1) {
      for (let index = this.findHotIndex(after); index < this.hotSegments.length && emitted < limit; index++) for (const event of this.hotSegments[index].events) if (event.sequence > after && (!topic || String(event.topic || 'events') === topic)) {
        yield event;
        if (++emitted >= limit) return;
      }
      return;
    }
    const candidates = this.segments.filter((segment) => segment.lastSequence > after);
    for (const segment of candidates) {
      const parquetBytes = await readFile(join(this.dataPath, segment.file));
      const wasmTable = parquet.readParquet(parquetBytes);
      const rows = tableFromIPC(wasmTable.intoIPCStream()).toArray();
      for (const row of rows) {
        const event = normalizeRow(row, this.schema);
        if (emitted < limit && Number(row.sequence) > after && (!topic || String(row.topic || 'events') === topic)) {
          yield event;
          if (++emitted >= limit) return;
        }
      }
    }
  }

  async records(options: { afterSequence?: number; limit?: number; topic?: string } = {}): Promise<EventEnvelope[]> {
    const result: EventEnvelope[] = [];
    for await (const event of this.iterateRecords(options)) result.push(event);
    return result;
  }

  async *historyStream(options: { afterSequence?: number; limit?: number } = {}): AsyncGenerator<Uint8Array> {
    const writer = new RecordBatchStreamWriter({ autoDestroy: false });
    const produce = (async () => {
      const batch: EventEnvelope[] = [];
      let wroteBatch = false;
      for await (const event of this.iterateRecords(options)) {
        batch.push(event);
        if (batch.length >= 256) {
          writer.write(eventTable(batch, this.schema).batches[0]);
          wroteBatch = true;
          batch.length = 0;
        }
      }
      if (batch.length) {
        writer.write(eventTable(batch, this.schema).batches[0]);
        wroteBatch = true;
      } else if (!wroteBatch) {
        writer.write(eventTable([], this.schema).batches[0]);
      }
      writer.close();
    })().catch((error) => { writer.abort(error); throw error; });
    try {
      for await (const chunk of writer) yield chunk;
      await produce;
    } finally { await produce.catch(() => {}); }
  }
  async history(options: { afterSequence?: number; limit?: number } = {}): Promise<Uint8Array> { const chunks: Uint8Array[] = []; for await (const chunk of this.historyStream(options)) chunks.push(chunk); const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; } return bytes; }

  async parquetSegment(file: string): Promise<Uint8Array> {
    if (!/^[A-Za-z0-9_-]+\.parquet$/.test(file) || !this.segments.some((segment) => segment.file === file)) throw new Error('Unknown event history segment');
    return readFile(join(this.dataPath, file));
  }

  async historyManifest(options: { afterSequence?: number; limit?: number } = {}): Promise<Segment[]> {
    const after = Math.max(0, Math.floor(options.afterSequence || 0));
    const limit = Math.max(1, Math.min(1000000, Math.floor(options.limit || 1000)));
    let rows = 0;
    const result: Segment[] = [];
    for (const segment of this.segments) {
      if (segment.lastSequence <= after) continue;
      result.push({ ...segment });
      rows += segment.rows;
      if (rows >= limit) break;
    }
    return result;
  }

  async consumerOffset(group: string): Promise<number> { const offsets = await this.readJson<Record<string, number>>(this.offsetsPath(), {}); return Number(offsets[group] || 0); }
  async acknowledge(group: string, sequence: number): Promise<void> {
    const offset = Math.max(0, Math.floor(sequence));
    this.offsetWriteTail = this.offsetWriteTail.then(async () => { const offsets = await this.readJson<Record<string, number>>(this.offsetsPath(), {}); offsets[group] = Math.max(Number(offsets[group] || 0), offset); await this.writeAtomic(this.offsetsPath(), JSON.stringify(offsets, null, 2)); });
    await this.offsetWriteTail;
  }
  async count(): Promise<number> { await this.flush(); return this.segments.reduce((sum, segment) => sum + segment.rows, 0); }
  async cacheCount(): Promise<number> { return this.hotRows; }
  async stop(): Promise<void> { if (this.workerTimer) { clearTimeout(this.workerTimer); this.workerTimer = null; } if (!this.segments.length && !this.pending.length && !this.workerRunning) { this.listeners.clear(); this.hotRows = 0; this.hotBytes = 0; if (this.temporaryDataPath) await rm(this.dataPath, { recursive: true, force: true }).catch(() => {}); return; } await this.flush(); if (this.manifestDirty) await this.writeManifest(); this.listeners.clear(); this.hotSegments.length = 0; this.hotRows = 0; this.hotBytes = 0; this.activeCursors.clear(); if (this.temporaryDataPath) await rm(this.dataPath, { recursive: true, force: true }).catch(() => {}); }
}
