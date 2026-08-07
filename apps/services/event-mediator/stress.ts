import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventMediatorClient } from '../../lib/server/event-mediator.ts';

const port = Number(process.env.EVENT_MEDIATOR_STRESS_PORT || 3312);
const publishers = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_PUBLISHERS || 8));
const eventsPerPublisher = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_EVENTS || 5000));
const inFlight = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_IN_FLIGHT || 64));
const batchSize = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_BATCH_SIZE || 256));
const payloadBytes = Math.max(0, Number(process.env.EVENT_MEDIATOR_STRESS_PAYLOAD_BYTES || 256));
const drainMs = Math.max(1000, Number(process.env.EVENT_MEDIATOR_STRESS_DRAIN_MS || 30000));
const expectedAttempted = publishers * eventsPerPublisher;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const bunRuntime = (globalThis as any).Bun;
const directory = await mkdtemp(join(tmpdir(), 'core3-event-mediator-stress-'));
const databasePath = join(directory, 'events.duckdb');
const server = bunRuntime.spawn(['bun', 'services/event-mediator/server.ts'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    EVENT_MEDIATOR_PORT: String(port),
    CORE3_EVENT_DB_PATH: databasePath,
    CORE3_EVENT_MAX_ROWS: String(Math.max(100000, expectedAttempted + 1000)),
    CORE3_EVENT_RETENTION_MS: String(24 * 60 * 60 * 1000),
  },
  stdout: 'ignore',
  stderr: 'pipe',
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('Event mediator did not become healthy');
}

function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

try {
  await waitForHealth();
  const subscriber = new EventMediatorClient({ endpoint: `ws://127.0.0.1:${port}/events`, nodeId: 'stress-subscriber' });
  await subscriber.start();
  const stream = subscriber.subscribeStream({ topic: 'stress.throughput' });
  const received = new Set<string>();
  const latencies: number[] = [];
  const reading = (async () => {
    for await (const event of stream.events) {
      const id = String(event.clientMessageId || '');
      if (id && !received.has(id)) {
        received.add(id);
        if (Number.isFinite(Number(event.sentAt))) latencies.push(Math.max(0, Date.now() - Number(event.sentAt)));
      }
      if (received.size >= expectedAttempted) break;
    }
  })();
  await sleep(100);

  const startedAt = performance.now();
  const children = Array.from({ length: publishers }, (_, publisher) => bunRuntime.spawn(['bun', 'services/event-mediator/stress-publisher.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      EVENT_MEDIATOR_STRESS_PORT: String(port),
      EVENT_MEDIATOR_STRESS_PUBLISHER: String(publisher),
      EVENT_MEDIATOR_STRESS_EVENTS: String(eventsPerPublisher),
      EVENT_MEDIATOR_STRESS_IN_FLIGHT: String(inFlight),
      EVENT_MEDIATOR_STRESS_BATCH_SIZE: String(batchSize),
      EVENT_MEDIATOR_STRESS_PAYLOAD_BYTES: String(payloadBytes),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  }));
  const childResults = await Promise.all(children.map(async (child: any) => {
    const output = await new Response(child.stdout).text();
    const errorOutput = await new Response(child.stderr).text();
    await child.exited;
    if (child.exitCode !== 0) throw new Error(`Stress publisher failed: ${errorOutput || output}`);
    return JSON.parse(output.trim().split('\n').at(-1)!);
  }));
  const publishMs = performance.now() - startedAt;
  const succeeded = childResults.reduce((sum, result) => sum + Number(result.succeeded || 0), 0);
  const failed = childResults.reduce((sum, result) => sum + Number(result.failed || 0), 0);
  const drainDeadline = Date.now() + drainMs;
  while (received.size < succeeded && Date.now() < drainDeadline) await sleep(25);
  stream.close();
  await reading;
  await subscriber.stop();
  const result = {
    publishers,
    eventsPerPublisher,
    attempted: expectedAttempted,
    succeeded,
    failed,
    received: received.size,
    lost: Math.max(0, succeeded - received.size),
    payloadBytes,
    inFlightPerPublisher: inFlight,
    publishBatchSize: batchSize,
    publishMs: Number(publishMs.toFixed(2)),
    attemptedPerSecond: Math.round(expectedAttempted / (publishMs / 1000)),
    succeededPerSecond: Math.round(succeeded / (publishMs / 1000)),
    latencySamples: latencies.length,
    latencyMs: {
      p50: Number(percentile(latencies, 0.50).toFixed(2)),
      p95: Number(percentile(latencies, 0.95).toFixed(2)),
      p99: Number(percentile(latencies, 0.99).toFixed(2)),
      max: Number(Math.max(0, ...latencies).toFixed(2)),
    },
    complete: failed === 0 && received.size === succeeded,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.complete) process.exitCode = 1;
} finally {
  server.kill();
  await rm(directory, { recursive: true, force: true });
}
