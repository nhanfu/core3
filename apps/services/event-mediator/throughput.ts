import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventMediatorClient } from '../../lib/server/event-mediator.ts';

const port = Number(process.env.EVENT_MEDIATOR_BENCH_PORT || 3310);
const publishers = Number(process.env.EVENT_MEDIATOR_BENCH_PUBLISHERS || 4);
const eventsPerPublisher = Number(process.env.EVENT_MEDIATOR_BENCH_EVENTS || 1000);
const batchSize = Math.max(1, Number(process.env.EVENT_MEDIATOR_BENCH_BATCH_SIZE || 256));
const expected = publishers * eventsPerPublisher;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const bunRuntime = (globalThis as any).Bun;
const directory = await mkdtemp(join(tmpdir(), 'core3-event-mediator-bench-'));
const databasePath = join(directory, 'events.duckdb');
const server = bunRuntime.spawn(['bun', 'services/event-mediator/server.ts'], {
  cwd: process.cwd().replace(/\/apps$/, '/apps'),
  env: { ...process.env, EVENT_MEDIATOR_PORT: String(port), CORE3_EVENT_DB_PATH: databasePath },
  stdout: 'ignore',
  stderr: 'pipe',
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('Event mediator did not become healthy');
}

try {
  await waitForHealth();
  const subscriber = new EventMediatorClient({ endpoint: `ws://127.0.0.1:${port}/events`, nodeId: 'benchmark-subscriber' });
  await subscriber.start();
  const stream = subscriber.subscribeStream();
  const received = new Set<string>();
  const reading = (async () => {
    for await (const event of stream.events) {
      if (typeof event.clientMessageId === 'string') received.add(event.clientMessageId);
      if (received.size >= expected) break;
    }
  })();
  await sleep(100);

  const clients = await Promise.all(Array.from({ length: publishers }, async (_, index) => {
    const client = new EventMediatorClient({ endpoint: `ws://127.0.0.1:${port}/events`, nodeId: `benchmark-publisher-${index}` });
    await client.start();
    return client;
  }));
  const startedAt = performance.now();
  await Promise.all(clients.map((client, publisher) => (async () => {
    for (let start = 0; start < eventsPerPublisher; start += batchSize) {
      await client.publishBatch(Array.from({ length: Math.min(batchSize, eventsPerPublisher - start) }, (_, index) => ({
        topic: 'benchmark.throughput',
        clientMessageId: `${publisher}-${start + index}`,
        payload: 'x'.repeat(256),
      })));
    }
  })()));
  const publishMs = performance.now() - startedAt;
  const deadline = Date.now() + 15000;
  while (received.size < expected && Date.now() < deadline) await sleep(10);
  stream.close();
  await reading;
  await Promise.all(clients.map((client) => client.stop()));
  await subscriber.stop();
  if (received.size !== expected) throw new Error(`Expected ${expected} events, received ${received.size}`);
  const result = {
    publishers,
    eventsPerPublisher,
    events: expected,
    batchSize,
    publishMs: Number(publishMs.toFixed(2)),
    publishEventsPerSecond: Math.round(expected / (publishMs / 1000)),
    deliveryComplete: true,
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  server.kill();
  await rm(directory, { recursive: true, force: true });
}

process.exit(0);
