import { decodeEventBatch } from '../../lib/server/event-store.ts';
import { EventMediatorClient } from '../../lib/server/event-mediator.ts';

const port = Number(process.env.EVENT_MEDIATOR_STRESS_PORT || 3312);
const subscriber = Number(process.env.EVENT_MEDIATOR_STRESS_SUBSCRIBER || 0);
const expected = Number(process.env.EVENT_MEDIATOR_STRESS_EXPECTED || 1);
const deadlineMs = Number(process.env.EVENT_MEDIATOR_STRESS_DEADLINE_MS || 30000);
const maxEvents = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_POLL_BATCH || 256));
const client = new EventMediatorClient({ endpoint: `ws://127.0.0.1:${port}/events`, nodeId: `stress-subscriber-${subscriber}` });
const received = new Set<string>();
const latencies: number[] = [];
const startedAt = performance.now();
const deadline = Date.now() + deadlineMs;

await client.start();
try {
  let cursor = 0;
  while (Date.now() < deadline && received.size < expected) {
    const bytes = await client.pollBytes({ topic: 'stress.throughput', afterSequence: cursor, maxEvents, maxWaitMs: 1000 });
    const events = decodeEventBatch(bytes);
    for (const event of events) {
      cursor = Math.max(cursor, Number(event.sequence || 0));
      const id = String(event.clientMessageId || '');
      if (id && !received.has(id)) {
        received.add(id);
        if (Number.isFinite(Number(event.sentAt))) latencies.push(Math.max(0, Date.now() - Number(event.sentAt)));
      }
      if (received.size >= expected) break;
    }
  }
} finally {
  await client.stop();
}

const sorted = [...latencies].sort((a, b) => a - b);
const percentile = (fraction: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] : 0;
const result = {
  subscriber,
  expected,
  received: received.size,
  lost: Math.max(0, expected - received.size),
  elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
  latencyMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99), max: Math.max(0, ...latencies) },
  complete: received.size >= expected,
};
console.log(JSON.stringify(result));
if (!result.complete) process.exitCode = 1;
