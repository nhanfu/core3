import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EventStore, type EventRecord } from '../../server/event-store.ts';

const stores: EventStore[] = [];

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.stop()));
});

function makeStore(databasePath: string, options: { maxRows?: number; readerCount?: number } = {}) {
  const store = new EventStore({
    databasePath,
    maxRows: options.maxRows ?? 1000,
    retentionMs: 60 * 60 * 1000,
    readerCount: options.readerCount ?? 4,
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
    message: { publisher, sequence },
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

  it('persists events in DuckDB and resumes sequence numbers after restart', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'core3-event-store-'));
    const databasePath = join(directory, 'events.duckdb');
    try {
      const first = makeStore(databasePath);
      await first.start();
      const firstEvents = await Promise.all([first.publish(event(1, 1)), first.publish(event(2, 2))]);
      expect(await first.count()).toBe(2);
      await first.stop();
      stores.splice(stores.indexOf(first), 1);

      const second = makeStore(databasePath);
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
});
