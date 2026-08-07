import { tableFromIPC } from 'apache-arrow';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import parquet from 'parquet-wasm';
import { EventStore, type EventRecord, type EventStoreSchema } from '../../server/event-store.ts';

const stores: EventStore[] = [];

const schema: EventStoreSchema = {
  columns: [
    { name: 'id', type: 'varchar', source: 'id', nullable: false },
    { name: 'sequence', type: 'bigint', source: 'sequence', nullable: false },
    { name: 'event_at', type: 'bigint', source: 'at', nullable: false },
    { name: 'operation', type: 'varchar' },
    { name: 'status', type: 'varchar' },
    { name: 'actor_id', type: 'varchar', source: 'actorId' },
    { name: 'thread_id', type: 'varchar', source: 'threadId' },
    { name: 'message_body', type: 'varchar', source: 'message.body' },
  ],
};

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.stop()));
});

function makeStore(databasePath: string, options: { maxRows?: number; hotMaxRows?: number; segmentMaxRows?: number; readerCount?: number; writeMode?: 'low_latency' | 'durable' } = {}) {
  const store = new EventStore({
    schema,
    databasePath,
    maxRows: options.maxRows ?? 1000,
    hotMaxRows: options.hotMaxRows ?? options.maxRows ?? 1000,
    segmentMaxRows: options.segmentMaxRows ?? 200,
    retentionMs: 60 * 60 * 1000,
    readerCount: options.readerCount ?? 4,
    writeMode: options.writeMode,
  });
  stores.push(store);
  return store;
}

function event(publisher: number, sequence: number) {
  return {
    operation: 'publish',
    status: 'success' as const,
    actorId: `publisher-${publisher}`,
    threadId: `thread-${sequence % 8}`,
    message: { publisher, sequence, body: `message-${publisher}-${sequence}` },
  };
}

describe('EventStore', () => {
  it('delivers every committed event to concurrent subscribers', async () => {
    const store = makeStore(':memory:', { readerCount: 4 });
    await store.start();

    const subscriberEvents: EventRecord[][] = Array.from({ length: 8 }, () => []);
    const unsubscribe = subscriberEvents.map((received) => store.subscribe((item) => received.push(item)));
    const publishers = 8;
    const eventsPerPublisher = 20;
    const startedAt = performance.now();

    await Promise.all(Array.from({ length: publishers }, async (_, publisher) => {
      await Promise.all(Array.from({ length: eventsPerPublisher }, (_, sequence) => store.publish(event(publisher, sequence))));
    }));

    const elapsedMs = performance.now() - startedAt;
    const expected = publishers * eventsPerPublisher;
    expect(await store.count()).toBe(expected);
    for (const received of subscriberEvents) {
      expect(received).toHaveLength(expected);
      expect(new Set(received.map((item) => item.id)).size).toBe(expected);
      expect(received.every((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(item.id))).toBe(true);
    }
    expect(new Set(subscriberEvents[0].map((item) => item.sequence)).size).toBe(expected);
    console.info(`EventStore concurrent fan-out: ${expected} writes x ${subscriberEvents.length} subscribers in ${elapsedMs.toFixed(1)}ms`);
    unsubscribe.forEach((remove) => remove());
  });

  it('delivers live events through a per-subscriber async stream', async () => {
    const store = makeStore(':memory:');
    await store.start();
    const subscription = store.subscribeStream();
    const nextEvent = subscription.events[Symbol.asyncIterator]().next();
    const published = await store.publish(event(1, 1));
    expect((await nextEvent).value.id).toBe(published.id);
    subscription.close();
    expect((await subscription.events[Symbol.asyncIterator]().next()).done).toBe(true);
  });

  it('publishes a batch with contiguous sequences', async () => {
    const store = makeStore(':memory:');
    await store.start();
    const published = await store.publishBatch([event(1, 1), event(1, 2), event(1, 3)]);
    expect(published).toHaveLength(3);
    expect(published.map((item) => item.sequence)).toEqual([1, 2, 3]);
    expect(await store.count()).toBe(3);
  });

  it('persists events in Parquet and resumes sequence numbers after restart', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-event-store-'));
    const databasePath = join(directory, 'events.duckdb');
    try {
      const first = makeStore(databasePath, { writeMode: 'durable' });
      await first.start();
      const firstEvents = await Promise.all([first.publish(event(1, 1)), first.publish(event(2, 2))]);
      expect(await first.count()).toBe(2);
      await first.stop();
      stores.splice(stores.indexOf(first), 1);

      const second = makeStore(databasePath, { writeMode: 'durable' });
      await second.start();
      expect(await second.count()).toBe(2);
      const restored = await second.publish(event(3, 3));
      expect(restored.sequence).toBe(Math.max(...firstEvents.map((item) => item.sequence)) + 1);
      expect(await second.count()).toBe(3);
      await second.stop();
      stores.splice(stores.indexOf(second), 1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('streams durable history as Arrow IPC', async () => {
    const store = makeStore(':memory:');
    await store.start();
    await Promise.all([store.publish(event(1, 1)), store.publish(event(1, 2)), store.publish(event(1, 3))]);
    const bytes = await store.history({ afterSequence: 1, limit: 10 });
    const table = tableFromIPC(bytes);
    expect(table.toArray()).toHaveLength(2);
    expect(table.schema.fields.map((field) => field.name)).toContain('message_body');
    const chunks: Uint8Array[] = [];
    for await (const chunk of store.historyStream({ afterSequence: 1, limit: 10 })) chunks.push(chunk);
    expect(chunks.length).toBeGreaterThan(0);
    expect(tableFromIPC(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))).toArray()).toHaveLength(2);
  });

  it('streams large history as one multi-batch Arrow IPC stream', async () => {
    const store = makeStore(':memory:');
    await store.start();
    await store.publishBatch(Array.from({ length: 600 }, (_, sequence) => event(1, sequence)));
    const chunks: Uint8Array[] = [];
    for await (const chunk of store.historyStream({ limit: 600 })) chunks.push(chunk);
    expect(chunks.length).toBeGreaterThan(1);
    expect(tableFromIPC(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))).toArray()).toHaveLength(600);
  });

  it('keeps only the configured event window', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-event-cache-'));
    const store = makeStore(join(directory, 'events.duckdb'), { maxRows: 5 });
    try {
      await store.start();
      await Promise.all(Array.from({ length: 12 }, (_, sequence) => store.publish(event(1, sequence))));
      expect(await store.cacheCount()).toBe(5);
      expect(await store.count()).toBe(12);
    } finally {
      await store.stop();
      stores.splice(stores.indexOf(store), 1);
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('serves the hot window from memory and falls back to durable history', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-event-hot-'));
    const store = makeStore(join(directory, 'events.duckdb'), { maxRows: 5, hotMaxRows: 2, writeMode: 'durable' });
    try {
      await store.start();
      await store.publishBatch([event(1, 1), event(1, 2), event(1, 3)]);

      expect((await store.records({ afterSequence: 2, limit: 10 })).map((item) => item.sequence)).toEqual([3]);
      expect((await store.records({ afterSequence: 0, limit: 10 })).map((item) => item.sequence)).toEqual([1, 2, 3]);
    } finally {
      await store.stop();
      stores.splice(stores.indexOf(store), 1);
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('splits Parquet files at the configured segment row limit', async () => {
    const store = makeStore(':memory:', { segmentMaxRows: 2, writeMode: 'durable' });
    await store.start();
    await store.publishBatch(Array.from({ length: 8 }, (_, sequence) => event(1, sequence)));
    expect((await store.historyManifest({ limit: 20 })).map((segment) => segment.rows)).toEqual([2, 2, 2, 2]);
  });

  it('batches individually published durable events into segments', async () => {
    const store = makeStore(':memory:', { segmentMaxRows: 2, writeMode: 'durable' });
    await store.start();
    for (let sequence = 0; sequence < 5; sequence++) await store.publish(event(1, sequence));
    await store.flush();
    expect((await store.historyManifest({ limit: 20 })).map((segment) => segment.rows)).toEqual([2, 2, 1]);
  });

  it('accumulates low-latency worker batches up to the segment limit', async () => {
    const store = makeStore(':memory:', { segmentMaxRows: 1000 });
    await store.start();
    await store.publishBatch(Array.from({ length: 2050 }, (_, sequence) => event(1, sequence)));
    await store.flush();
    expect((await store.historyManifest({ limit: 3000 })).map((segment) => segment.rows)).toEqual([1000, 1000, 50]);
  });

  it('stores configured columns without an event JSON blob', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-event-schema-'));
    const store = makeStore(join(directory, 'events.duckdb'), { segmentMaxRows: 2, writeMode: 'durable' });
    try {
      await store.start();
      await store.publishBatch([event(1, 1), event(1, 2)]);
      const segment = (await store.historyManifest({ limit: 10 }))[0];
      const bytes = await store.parquetSegment(segment.file);
      const fields = tableFromIPC(parquet.readParquet(bytes).intoIPCStream()).schema.fields.map((field) => field.name);
      expect(fields).not.toContain('event_json');
      expect(fields).toContain('message_body');
    } finally {
      await store.stop();
      stores.splice(stores.indexOf(store), 1);
      await rm(directory, { recursive: true, force: true });
    }
  });
});
