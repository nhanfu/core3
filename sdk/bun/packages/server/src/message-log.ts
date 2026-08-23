import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import { EventStore, type EventEnvelope, type EventSubscription } from '@core3/med';
import type { EventBus } from '@core3/med';

export type MessageLogDeclaration = {
  name: string; append_only: true; format: 'parquet'; backend?: 'local' | 's3'; path?: string; bucket?: string; prefix?: string; endpoint?: string; retention_ms?: number; segment_max_rows?: number; write_mode?: 'durable' | 'low_latency';
};
export type MessageRecord = { id?: string; sequence?: number; event_at?: number; type: string; source_service: string; correlation_id?: string; payload: unknown; [key: string]: unknown };
export type ObjectStore = { get(key: string): Promise<Uint8Array | null>; put(key: string, value: Uint8Array, contentType?: string): Promise<void> };
export type MessageConsumer = (record: MessageRecord) => Promise<void> | void;

export class FetchObjectStore implements ObjectStore {
  constructor(private readonly endpoint: string, private readonly bucket: string, private readonly options: { accessKeyId?: string; secretAccessKey?: string; region?: string; token?: string } = {}) {}
  private url(key: string): string { return `${this.endpoint.replace(/\/$/, '')}/${encodeURIComponent(this.bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`; }
  private signedHeaders(method: string, key: string, body: Uint8Array): Record<string, string> { const url = new URL(this.url(key)); const payloadHash = createHash('sha256').update(body).digest('hex'); const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''); const date = amzDate.slice(0, 8); const region = this.options.region || 'us-east-1'; const host = url.host; const canonicalUri = url.pathname; const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`; const signed = 'host;x-amz-content-sha256;x-amz-date'; const canonicalRequest = `${method}\n${canonicalUri}\n${url.search.slice(1)}\n${canonicalHeaders}\n${signed}\n${payloadHash}`; const scope = `${date}/${region}/s3/aws4_request`; const hash = (value: string) => createHash('sha256').update(value).digest('hex'); const hmac = (keyValue: string | Uint8Array, value: string) => createHmac('sha256', keyValue).update(value).digest(); const kDate = hmac(`AWS4${this.options.secretAccessKey}`, date); const kRegion = hmac(kDate, region); const kService = hmac(kRegion, 's3'); const signingKey = hmac(kService, 'aws4_request'); const signature = createHmac('sha256', signingKey).update(`AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${hash(canonicalRequest)}`).digest('hex'); return { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, authorization: `AWS4-HMAC-SHA256 Credential=${this.options.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}` }; }
  private headers(method: string, key: string, body: Uint8Array, contentType?: string): Record<string, string> { if (this.options.accessKeyId && this.options.secretAccessKey) return { ...(contentType ? { 'content-type': contentType } : {}), ...this.signedHeaders(method, key, body) }; return { ...(contentType ? { 'content-type': contentType } : {}), ...(this.options.token ? { authorization: `Bearer ${this.options.token}` } : {}) }; }
  async get(key: string): Promise<Uint8Array | null> { const response = await fetch(this.url(key), { headers: this.headers('GET', key, new Uint8Array()) }); if (response.status === 404) return null; if (!response.ok) throw new Error(`Message object GET failed: ${response.status}`); return new Uint8Array(await response.arrayBuffer()); }
  async put(key: string, value: Uint8Array, contentType = 'application/octet-stream'): Promise<void> { const response = await fetch(this.url(key), { method: 'PUT', headers: this.headers('PUT', key, value, contentType), body: value as BodyInit }); if (!response.ok) throw new Error(`Message object PUT failed: ${response.status}`); }
}

export class MessageLog {
  private readonly localPath: string;
  private readonly store: EventStore;
  private readonly objectStore?: ObjectStore;
  private readonly prefix: string;
  constructor(private readonly declaration: MessageLogDeclaration, options: { objectStore?: ObjectStore; localRoot?: string } = {}) {
    if (declaration.format !== 'parquet' || declaration.append_only !== true) throw new Error(`Message log ${declaration.name} must be append-only Parquet`);
    this.localPath = declaration.path || join(options.localRoot || process.cwd(), '.data', 'messages', declaration.name);
    this.objectStore = options.objectStore;
    this.prefix = `${declaration.prefix || declaration.name}`.replace(/^\/+|\/+$/g, '');
    this.store = new EventStore({ databasePath: this.localPath, schema: { columns: [
      { name: 'id', type: 'varchar' }, { name: 'sequence', type: 'bigint' }, { name: 'event_at', type: 'bigint' },
      { name: 'topic', type: 'varchar', source: 'type' }, { name: 'event_json', type: 'varchar', source: '@json' },
    ] }, retentionMs: declaration.retention_ms, segmentMaxRows: declaration.segment_max_rows, writeMode: declaration.write_mode });
  }
  async start(): Promise<void> { await mkdir(this.localPath, { recursive: true }).catch((error: any) => { if (error?.code !== 'EEXIST' && error?.errno !== -17) throw error; }); await this.pullRemote(); await this.store.start(); }
  async append(record: MessageRecord): Promise<MessageRecord & { id: string; sequence: number; event_at: number }> { const event = await this.store.publish({ topic: 'message', key: record.id, ...record, payload: JSON.stringify(record.payload) } as any); if (this.declaration.backend === 's3') await this.pushRemote(); return { ...record, id: event.id, sequence: event.sequence, event_at: event.at }; }
  async tail(afterSequence = 0, limit = 1000): Promise<MessageRecord[]> { const events = await this.store.poll({ afterSequence, maxEvents: limit }); return events.map((event) => ({ ...event, payload: this.parsePayload(event.payload) } as unknown as MessageRecord)); }
  async acknowledge(consumer: string, sequence: number): Promise<void> { await this.store.acknowledge(consumer, sequence); }
  async consumerOffset(consumer: string): Promise<number> { return this.store.consumerOffset(consumer); }
  async consumeBatch(consumer: string, handler: MessageConsumer, limit = 100): Promise<{ delivered: number; lastSequence: number }> {
    const records = await this.tail(await this.consumerOffset(consumer), limit);
    let lastSequence = await this.consumerOffset(consumer);
    for (const record of records) {
      await handler(record);
      if (record.sequence === undefined) continue;
      await this.acknowledge(consumer, record.sequence);
      lastSequence = record.sequence;
    }
    return { delivered: records.length, lastSequence };
  }
  async flush(): Promise<void> { await this.store.flush(); if (this.declaration.backend === 's3') await this.pushRemote(); }
  async stop(): Promise<void> { await this.store.stop(); }
  private parsePayload(value: unknown): unknown { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return value; } }
  private async pullRemote(): Promise<void> { if (this.declaration.backend !== 's3' || !this.objectStore) return; const manifest = await this.objectStore.get(`${this.prefix}/manifest.json`); if (!manifest) return; const parsed = JSON.parse(new TextDecoder().decode(manifest)) as { segments?: Array<{ file: string }> }; const entries = Array.isArray(parsed) ? parsed : parsed.segments || []; await writeFile(join(this.localPath, 'manifest.json'), new TextDecoder().decode(manifest)); for (const entry of entries) { const bytes = await this.objectStore.get(`${this.prefix}/${entry.file}`); if (bytes) await writeFile(join(this.localPath, entry.file), bytes); } }
  private async pushRemote(): Promise<void> { if (this.declaration.backend !== 's3' || !this.objectStore) return; const manifest = await this.store.historyManifest({ limit: 1000000 }); await this.objectStore.put(`${this.prefix}/manifest.json`, new TextEncoder().encode(JSON.stringify({ version: 1, segments: manifest })), 'application/json'); for (const entry of manifest) await this.objectStore.put(`${this.prefix}/${entry.file}`, await this.store.parquetSegment(entry.file), 'application/octet-stream'); }
}

/** EventBus-compatible adapter used while a configured event stream is being
 * migrated from the mediator to a declared durable message log. */
export class MessageLogEventBus {
  constructor(private readonly log: MessageLog) {}
  start(): Promise<void> { return this.log.start(); }
  stop(): Promise<void> { return this.log.stop(); }
  async publish(event: Omit<EventEnvelope, 'id' | 'sequence' | 'at'>): Promise<EventEnvelope> {
    const record = await this.log.append({
      id: event.key == null ? undefined : String(event.key),
      type: String(event.topic || 'events'),
      source_service: String(event.sourceNode || event.source || ''),
      correlation_id: event.correlationId as string | undefined,
      payload: event,
    });
    return { ...(event as any), id: record.id, sequence: record.sequence, at: record.event_at, topic: record.type };
  }
  async poll(options: { topic?: string; afterSequence?: number; maxEvents?: number; maxWaitMs?: number } = {}): Promise<EventEnvelope[]> {
    const records = await this.log.tail(options.afterSequence || 0, options.maxEvents || 1000);
    return records
      .filter((record) => !options.topic || record.type === options.topic)
      .map((record) => ({ ...((record.payload && typeof record.payload === 'object') ? record.payload as any : {}), id: record.id, sequence: record.sequence, at: record.event_at, topic: record.type }));
  }
  subscribeStream(): EventSubscription;
  subscribeStream(options: { topic?: string; group?: string; maxEvents?: number; maxWaitMs?: number }): EventSubscription;
  subscribeStream(options: { topic?: string; group?: string; maxEvents?: number; maxWaitMs?: number } = {}): EventSubscription {
    let closed = false;
    const events = (async function* (bus: MessageLogEventBus) {
      let cursor = options.group ? await bus.log.consumerOffset(options.group) : 0;
      const deadline = Date.now() + Math.max(0, options.maxWaitMs || 1000);
      while (!closed && Date.now() <= deadline) {
        const batch = await bus.poll({ topic: options.topic, afterSequence: cursor, maxEvents: options.maxEvents || 25 });
        if (batch.length) {
          for (const event of batch) { cursor = Math.max(cursor, event.sequence); yield event; }
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    })(this);
    return {
      events,
      close: () => { closed = true; },
      ...(options.group ? { ack: (sequence: number) => this.log.acknowledge(options.group!, sequence) } : {}),
    };
  }
}

export class HybridEventBus {
  constructor(private readonly legacy: EventBus, private readonly migrated: MessageLogEventBus, private readonly topicPatterns: string[]) {}
  async start(): Promise<void> { await this.legacy.start(); await this.migrated.start(); }
  async stop(): Promise<void> { await this.legacy.stop(); await this.migrated.stop(); }
  publish(event: Omit<EventEnvelope, 'id' | 'sequence' | 'at'>): Promise<EventEnvelope> { return this.isMigrated(event.topic as string | undefined) ? this.migrated.publish(event) : this.legacy.publish(event); }
  poll(options: { topic?: string; afterSequence?: number; maxEvents?: number; maxWaitMs?: number } = {}): Promise<EventEnvelope[]> { return options.topic && this.isMigrated(options.topic) ? this.migrated.poll(options) : this.legacy.poll(options as any); }
  subscribeStream(): EventSubscription;
  subscribeStream(options: { topic?: string; group?: string; maxEvents?: number; maxWaitMs?: number }): EventSubscription;
  subscribeStream(options: { topic?: string; group?: string; maxEvents?: number; maxWaitMs?: number } = {}): EventSubscription { return options.topic && this.isMigrated(options.topic) ? this.migrated.subscribeStream(options) : this.legacy.subscribeStream(); }
  private isMigrated(topic?: string): boolean {
    if (!topic) return false;
    return this.topicPatterns.some((pattern) => pattern === topic || (pattern.endsWith('*') && topic.startsWith(pattern.slice(0, -1))));
  }
}
