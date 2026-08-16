import { decodeEventBatch, encodeEventBatch, EventStore, type EventEnvelope, type EventSubscription, type EventStoreSchema } from './event-store.ts';

export type MediatorConfig = {
  endpoint: string;
  token?: string;
  nodeId?: string;
  reconnectMs?: number;
  requestTimeoutMs?: number;
  segmentMaxRows?: number;
  pullBatchSize?: number;
};

export type EventHistorySegment = {
  file: string;
  firstSequence: number;
  lastSequence: number;
  firstAt: number;
  lastAt: number;
  rows: number;
  url?: string;
};

type WireMessage = Record<string, any> & { type: string };
const bunRuntime = (globalThis as any).Bun;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function decode(raw: string | ArrayBuffer): WireMessage {
  return JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
}

function splitBinary(raw: ArrayBuffer | Uint8Array): { header: WireMessage; body: Uint8Array } {
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  const headerLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  return {
    header: JSON.parse(new TextDecoder().decode(bytes.slice(4, 4 + headerLength))),
    body: bytes.slice(4 + headerLength),
  };
}

function encodeBinary(requestId: unknown, events: EventEnvelope[]): Uint8Array {
  const header = new TextEncoder().encode(JSON.stringify({ type: 'polled', requestId }));
  const body = encodeEventBatch(events);
  const result = new Uint8Array(4 + header.byteLength + body.byteLength);
  new DataView(result.buffer).setUint32(0, header.byteLength);
  result.set(header, 4);
  result.set(body, 4 + header.byteLength);
  return result;
}

export class EventMediatorClient {
  private socket: any = null;
  private connecting: Promise<void> | null = null;
  private stopped = false;
  private requestId = 1;
  private readonly pending = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private readonly config: Required<MediatorConfig>;

  constructor(config: MediatorConfig) {
    this.config = {
      endpoint: config.endpoint,
      token: config.token || '',
      nodeId: config.nodeId || `node-${process.pid}`,
      reconnectMs: config.reconnectMs || 1000,
      requestTimeoutMs: config.requestTimeoutMs || 30000,
      segmentMaxRows: Math.max(1, Math.floor(config.segmentMaxRows || 200)),
      pullBatchSize: Math.max(1, Math.floor(config.pullBatchSize || 100)),
    };
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.ensureConnected();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.socket?.close();
    this.socket = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Event mediator stopped'));
    }
    this.pending.clear();
  }

  async publish(event: Omit<EventEnvelope, 'id' | 'sequence' | 'at'>): Promise<EventEnvelope> {
    const response = await this.request({ type: 'publish', event: { topic: 'events', ...event } });
    return response.event as EventEnvelope;
  }

  async publishBatch(events: Array<Omit<EventEnvelope, 'id' | 'sequence' | 'at'>>): Promise<EventEnvelope[]> {
    if (!events.length) return [];
    const response = await this.request({ type: 'publish_batch', events: events.map((event) => ({ topic: 'events', ...event })) });
    return (response.events || []) as EventEnvelope[];
  }

  async poll(options: { topic?: string; group?: string; afterSequence?: number; maxEvents?: number; maxWaitMs?: number; format?: 'json' | 'arrow' } = {}): Promise<EventEnvelope[]> {
    const response = await this.request({
      type: 'poll',
      topic: options.topic || '*',
      group: options.group,
      afterSequence: options.afterSequence || 0,
      maxEvents: options.maxEvents || this.config.pullBatchSize,
      maxWaitMs: options.maxWaitMs ?? 1000,
      format: options.format || 'json',
    });
    return response.bytes ? decodeEventBatch(response.bytes) : (response.events || []) as EventEnvelope[];
  }

  async pollBytes(options: { topic?: string; group?: string; afterSequence?: number; maxEvents?: number; maxWaitMs?: number } = {}): Promise<Uint8Array> {
    const response = await this.request({
      type: 'poll',
      topic: options.topic || '*',
      group: options.group,
      afterSequence: options.afterSequence || 0,
      maxEvents: options.maxEvents || this.config.pullBatchSize,
      maxWaitMs: options.maxWaitMs ?? 1000,
      format: 'arrow',
    });
    return response.bytes || new Uint8Array();
  }

  async acknowledge(group: string, sequence: number): Promise<void> {
    await this.request({ type: 'ack', group, sequence });
  }

  async historyManifest(options: { afterSequence?: number; limit?: number } = {}): Promise<EventHistorySegment[]> {
    const url = this.httpUrl('/events/history/manifest');
    url.searchParams.set('afterSequence', String(options.afterSequence || 0));
    url.searchParams.set('limit', String(options.limit || 1000));
    if (this.config.token) url.searchParams.set('token', this.config.token);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Event history manifest failed: ${response.status}`);
    return await response.json() as EventHistorySegment[];
  }

  async historySegment(file: string, range?: { start: number; end?: number }): Promise<Uint8Array> {
    const url = this.httpUrl(`/events/history/segment/${encodeURIComponent(file)}`);
    if (this.config.token) url.searchParams.set('token', this.config.token);
    const response = await fetch(url, { headers: range ? { Range: `bytes=${range.start}-${range.end ?? ''}` } : undefined });
    if (!response.ok && response.status !== 206) throw new Error(`Event history segment failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async metadata(): Promise<{ segmentMaxRows: number; pullBatchSize: number }> {
    const response = await fetch(this.httpUrl('/events/metadata'));
    if (!response.ok) throw new Error(`Event mediator metadata failed: ${response.status}`);
    return await response.json() as { segmentMaxRows: number; pullBatchSize: number };
  }

  subscribeStream(options: { topic?: string; group?: string; maxEvents?: number; maxWaitMs?: number; format?: 'json' | 'arrow' } = {}): EventSubscription {
    const topic = options.topic || '*';
    const group = options.group;
    const maxEvents = options.maxEvents || this.config.pullBatchSize;
    const maxWaitMs = options.maxWaitMs ?? 1000;
    const reconnectMs = this.config.reconnectMs;
    let closed = false;
    let cursor = 0;
    const events = {
      async *[Symbol.asyncIterator](): AsyncGenerator<EventEnvelope> {
        while (!closed) {
          try {
            const batch = await thisPoll();
            for (const event of batch) {
              cursor = Math.max(cursor, Number(event.sequence || 0));
              if (closed) return;
              yield event;
            }
          } catch {
            if (closed) return;
            await sleep(Math.min(1000, reconnectMs));
          }
        }
      },
    };
    const thisPoll = () => this.poll({ topic, group, afterSequence: group ? undefined : cursor, maxEvents, maxWaitMs, format: options.format });
    const close = () => { closed = true; };
    return { events, close, ack: group ? (sequence) => this.acknowledge(group, sequence) : undefined };
  }

  private async ensureConnected(): Promise<void> {
    if (this.socket?.readyState === 1) return;
    if (this.connecting) return this.connecting;
    this.connecting = new Promise<void>((resolve, reject) => {
      const url = new URL(this.config.endpoint);
      url.searchParams.set('node_id', this.config.nodeId);
      if (this.config.token) url.searchParams.set('token', this.config.token);
      const socket: any = new WebSocket(url);
      let opened = false;
      socket.onopen = () => { opened = true; this.socket = socket; resolve(); };
      socket.onmessage = (message: MessageEvent) => {
        const data = message.data;
        if (typeof data === 'string') this.handle(decode(data));
        else this.handleBinary(data);
      };
      socket.onerror = () => { if (!opened) reject(new Error('Unable to connect to event mediator')); };
      socket.onclose = () => { if (this.socket === socket) this.socket = null; };
    }).finally(() => { this.connecting = null; });
    return this.connecting;
  }

  private httpUrl(pathname: string): URL {
    const url = new URL(this.config.endpoint.replace(/^ws/, 'http'));
    url.pathname = pathname;
    url.search = '';
    return url;
  }

  private request(message: WireMessage): Promise<any> {
    return this.ensureConnected().then(() => new Promise((resolve, reject) => {
      const requestId = String(this.requestId++);
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Event mediator request timed out: ${message.type}`));
      }, this.config.requestTimeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      this.socket!.send(JSON.stringify({ ...message, requestId }));
    }));
  }

  private decodeBinary(raw: ArrayBuffer | Uint8Array): WireMessage {
    const { header, body } = splitBinary(raw);
    return { ...header, events: decodeEventBatch(body) };
  }

  private handleBinary(raw: ArrayBuffer | Uint8Array): void {
    const { header, body } = splitBinary(raw);
    if (!header.requestId || !this.pending.has(String(header.requestId))) return;
    const pending = this.pending.get(String(header.requestId))!;
    this.pending.delete(String(header.requestId));
    clearTimeout(pending.timer);
    if (header.type === 'error') pending.reject(new Error(header.message || 'Event mediator error'));
    else pending.resolve({ ...header, bytes: body });
  }

  private handle(message: WireMessage): void {
    if (!message.requestId || !this.pending.has(String(message.requestId))) return;
    const pending = this.pending.get(String(message.requestId))!;
    this.pending.delete(String(message.requestId));
    clearTimeout(pending.timer);
    if (message.type === 'error') pending.reject(new Error(message.message || 'Event mediator error'));
    else pending.resolve(message);
  }
}

export type EventMediatorServerOptions = {
  port: number;
  host?: string;
  token?: string;
  databasePath: string;
  schema: EventStoreSchema;
  retentionMs?: number;
  maxRows?: number;
  hotMaxRows?: number;
  hotMaxBytes?: number;
  hotRetentionMs?: number;
  hotConsumerTtlMs?: number;
  readerCount?: number;
  bufferMaxRows?: number;
  writeMode?: 'low_latency' | 'durable';
  ackTimeoutMs?: number;
  maxPendingPerClient?: number;
  segmentMaxRows?: number;
  pullBatchSize?: number;
};

type GroupInFlight = { socket: any; events: EventEnvelope[]; expiresAt: number };

export async function serveEventMediator(options: EventMediatorServerOptions): Promise<{ stop: () => Promise<void> }> {
  const store = new EventStore({ ...options });
  await store.start();
  const clients = new Set<any>();
  const groupMembers = new Map<string, Set<any>>();
  const groupCursors = new Map<string, number>();
  const groupInFlight = new Map<string, GroupInFlight>();
  const ackTimeoutMs = options.ackTimeoutMs || 30000;
  const maxPendingPerClient = options.maxPendingPerClient || 10000;
  const groupKey = (topic: string, group: string) => `${topic}:${group}`;
  let publishTail = Promise.resolve();
  const enqueuePublish = async <T>(operation: () => Promise<T>): Promise<T> => {
    const previous = publishTail;
    let release!: () => void;
    publishTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  };

  const waitForEvent = async (topic: string, maxWaitMs: number) => {
    if (maxWaitMs <= 0) return;
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; unsubscribe(); clearTimeout(timer); resolve(); };
      const unsubscribe = store.subscribe((event) => {
        if (topic === '*' || String(event.topic || 'events') === topic) finish();
      });
      const timer = setTimeout(finish, Math.min(maxWaitMs, 30000));
    });
  };

  const server = bunRuntime.serve({
    hostname: options.host || '0.0.0.0',
    port: options.port,
    websocket: {
      open(socket: any) {
        clients.add(socket);
        socket.data.groups = new Set<string>();
        socket.data.cursorIds = new Set<string>();
      },
      async message(socket: any, raw: string | ArrayBuffer) {
        let message: WireMessage;
        try { message = decode(raw); } catch { socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' })); return; }
        const reply = (body: WireMessage) => socket.send(JSON.stringify({ ...body, requestId: message.requestId }));
        const replyPoll = (events: EventEnvelope[]) => message.format === 'arrow'
          ? socket.send(encodeBinary(message.requestId, events))
          : reply({ type: 'polled', events });
        try {
          if (message.type === 'publish') {
            const event = await enqueuePublish(() => store.publish({ topic: 'events', ...(message.event || {}) }));
            reply({ type: 'published', event });
          } else if (message.type === 'publish_batch') {
            const input = Array.isArray(message.events) ? message.events.slice(0, 1000) : [];
            const events = await enqueuePublish(() => store.publishBatch(input.map((event: any) => ({ topic: 'events', ...(event || {}) }))));
            reply({ type: 'published_batch', events });
          } else if (message.type === 'poll' || message.type === 'fetch') {
            const topic = String(message.topic || '*');
            const group = message.group ? String(message.group) : undefined;
            const limit = Math.max(1, Math.min(1000, Math.floor(Number(message.maxEvents || options.pullBatchSize || 100))));
            const waitMs = Math.max(0, Math.min(30000, Math.floor(Number(message.maxWaitMs || 0))));
            let afterSequence = Math.max(0, Math.floor(Number(message.afterSequence || 0)));
            let key = '';
            let redelivery = false;
            let selectedCursor = 0;
            if (group) {
              key = groupKey(topic, group);
              socket.data.groups.add(key);
              const members = groupMembers.get(key) || new Set<any>();
              members.add(socket);
              groupMembers.set(key, members);
              const inFlight = groupInFlight.get(key);
              if (inFlight && inFlight.expiresAt > Date.now()) {
                replyPoll([]);
                return;
              }
              if (inFlight) {
                groupInFlight.delete(key);
                redelivery = true;
              }
              const active = [...members].filter((member) => clients.has(member));
              const cursor = groupCursors.get(key) || 0;
              const owner = active.length ? active[cursor % active.length] : socket;
              selectedCursor = cursor;
              if (owner !== socket) {
                replyPoll([]);
                return;
              }
              // Reserve the group while this poll is waiting. This prevents
              // two concurrent long polls from receiving the same batch.
              groupInFlight.set(key, { socket, events: [], expiresAt: Date.now() + ackTimeoutMs });
              afterSequence = await store.consumerOffset(group);
            }
            const cursorId = `${socket.data.cursorPrefix}:${group || topic}`;
            socket.data.cursorIds.add(cursorId);
            store.touchCursor(cursorId, afterSequence);
            let events = await store.records({ afterSequence, limit, topic: topic === '*' ? undefined : topic });
            if (!events.length && waitMs) {
              await waitForEvent(topic, waitMs);
              events = await store.records({ afterSequence, limit, topic: topic === '*' ? undefined : topic });
            }
            if (group && events.length) {
              const pending = groupInFlight.get(key);
              if (pending && pending.socket === socket && pending.events.length >= maxPendingPerClient) {
                socket.close(1013, 'Consumer backlog exceeded');
                return;
              }
              groupInFlight.set(key, { socket, events, expiresAt: Date.now() + ackTimeoutMs });
              const members = [...(groupMembers.get(key) || [])].filter((member) => clients.has(member));
              if (members.length) groupCursors.set(key, (selectedCursor + 1) % members.length);
            } else if (group) {
              groupInFlight.delete(key);
              const members = [...(groupMembers.get(key) || [])].filter((member) => clients.has(member));
              if (members.length) groupCursors.set(key, (selectedCursor + 1) % members.length);
            }
            replyPoll(redelivery ? events.map((event) => ({ ...event, redelivery: true })) : events);
          } else if (message.type === 'ack') {
            if (!message.group) throw new Error('Acknowledgements require a consumer group');
            const group = String(message.group);
            const sequence = Math.max(0, Math.floor(Number(message.sequence || 0)));
            await store.acknowledge(group, sequence);
            for (const [key, pending] of groupInFlight) {
              if (key.endsWith(`:${group}`) && pending.socket === socket) {
                pending.events = pending.events.filter((event) => event.sequence > sequence);
                if (!pending.events.length) groupInFlight.delete(key);
              }
            }
            reply({ type: 'acknowledged', group, sequence });
          } else if (message.type === 'ping') reply({ type: 'pong' });
          else reply({ type: 'error', message: `Unknown mediator message: ${message.type}` });
        } catch (error: any) {
          reply({ type: 'error', message: String(error?.message || 'Mediator request failed') });
        }
      },
      close(socket: any) {
        clients.delete(socket);
        for (const key of socket.data?.groups || []) groupMembers.get(key)?.delete(socket);
        for (const id of socket.data?.cursorIds || []) store.releaseCursor(id);
        for (const [key, pending] of groupInFlight) if (pending.socket === socket) groupInFlight.delete(key);
      },
    },
    async fetch(req: Request, server: any) {
      const url = new URL(req.url);
      if (url.pathname === '/health') return new Response('ok');
      if (url.pathname === '/events/metadata') return Response.json({ segmentMaxRows: Math.max(1, options.segmentMaxRows || 200), pullBatchSize: Math.max(1, options.pullBatchSize || 100) });
      if (url.pathname === '/events/history') {
        if (options.token && url.searchParams.get('token') !== options.token) return new Response('Unauthorized', { status: 401 });
        try {
          const segment = url.searchParams.get('segment');
          if (segment) return new Response(Buffer.from(await store.parquetSegment(segment)), { headers: { 'content-type': 'application/vnd.apache.parquet' } });
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              void (async () => {
                try {
                  for await (const chunk of store.historyStream({
                    afterSequence: Number(url.searchParams.get('afterSequence') || 0),
                    limit: Number(url.searchParams.get('limit') || 1000),
                  })) controller.enqueue(chunk);
                  controller.close();
                } catch (error) { controller.error(error); }
              })();
            },
          });
          return new Response(stream, { headers: { 'content-type': 'application/vnd.apache.arrow.stream' } });
        } catch (error: any) { return new Response(String(error?.message || 'History request failed'), { status: 404 }); }
      }
      if (url.pathname === '/events/history/manifest') {
        if (options.token && url.searchParams.get('token') !== options.token) return new Response('Unauthorized', { status: 401 });
        const segments = await store.historyManifest({ afterSequence: Number(url.searchParams.get('afterSequence') || 0), limit: Number(url.searchParams.get('limit') || 1000) });
        return Response.json(segments.map((segment) => ({ ...segment, url: `/events/history/segment/${encodeURIComponent(segment.file)}` })));
      }
      if (url.pathname.startsWith('/events/history/segment/')) {
        if (options.token && url.searchParams.get('token') !== options.token) return new Response('Unauthorized', { status: 401 });
        try {
          const file = decodeURIComponent(url.pathname.slice('/events/history/segment/'.length));
          const bytes = await store.parquetSegment(file);
          const range = req.headers.get('range');
          if (!range) return new Response(Buffer.from(bytes), { headers: { 'accept-ranges': 'bytes', 'content-length': String(bytes.byteLength), 'content-type': 'application/vnd.apache.parquet' } });
          const match = /^bytes=(\d+)-(\d*)$/.exec(range);
          if (!match) return new Response('Invalid range', { status: 416 });
          const start = Number(match[1]);
          const end = Math.min(bytes.byteLength - 1, match[2] ? Number(match[2]) : bytes.byteLength - 1);
          if (start > end || start >= bytes.byteLength) return new Response('Range not satisfiable', { status: 416, headers: { 'content-range': `bytes */${bytes.byteLength}` } });
          const body = Buffer.from(bytes.slice(start, end + 1));
          return new Response(body, { status: 206, headers: { 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${bytes.byteLength}`, 'content-length': String(body.byteLength), 'content-type': 'application/vnd.apache.parquet' } });
        } catch (error: any) { return new Response(String(error?.message || 'History segment failed'), { status: 404 }); }
      }
      if (url.pathname === '/events') {
        if (options.token && url.searchParams.get('token') !== options.token) return new Response('Unauthorized', { status: 401 });
        const nodeId = url.searchParams.get('node_id') || 'node';
        const cursorPrefix = `${nodeId}:${crypto.randomUUID()}`;
        return server.upgrade(req, { data: { nodeId, cursorPrefix } }) ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
      }
      return new Response('Event mediator WebSocket endpoint', { status: 426 });
    },
  });
  return {
    async stop() {
      for (const socket of clients) socket.close();
      server.stop(true);
      await store.stop();
    },
  };
}
