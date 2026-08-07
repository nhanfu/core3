import { EventMediatorClient } from '../../lib/server/event-mediator.ts';

const port = Number(process.env.EVENT_MEDIATOR_STRESS_PORT || 3312);
const publisher = Number(process.env.EVENT_MEDIATOR_STRESS_PUBLISHER || 0);
const events = Number(process.env.EVENT_MEDIATOR_STRESS_EVENTS || 5000);
const inFlight = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_IN_FLIGHT || 64));
const batchSize = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_BATCH_SIZE || 100));
const payloadBytes = Math.max(0, Number(process.env.EVENT_MEDIATOR_STRESS_PAYLOAD_BYTES || 4096));
const client = new EventMediatorClient({ endpoint: `ws://127.0.0.1:${port}/events`, nodeId: `stress-publisher-${publisher}` });
const payload = 'x'.repeat(payloadBytes);
let next = 0;
let succeeded = 0;
let failed = 0;
const failures: string[] = [];
const startedAt = performance.now();

await client.start();
async function sendBatch(start: number) {
  const batch = Array.from({ length: Math.min(batchSize, events - start) }, (_, index) => {
    const sequence = start + index;
    return {
      topic: 'stress.throughput',
      clientMessageId: `${publisher}-${sequence}`,
      publisher,
      sentAt: Date.now(),
      payload,
    };
  });
  try {
    await client.publishBatch(batch);
    succeeded += batch.length;
  } catch (error: any) {
    failed += batch.length;
    if (failures.length < 10) failures.push(String(error?.message || error));
  }
}

while (next < events) {
  const batch = Array.from({ length: Math.min(inFlight, Math.ceil((events - next) / batchSize)) }, () => {
    const start = next;
    next += Math.min(batchSize, events - next);
    return sendBatch(start);
  });
  await Promise.all(batch);
}
const elapsedMs = performance.now() - startedAt;
await client.stop();
console.log(JSON.stringify({ publisher, events, succeeded, failed, elapsedMs, failures }));
