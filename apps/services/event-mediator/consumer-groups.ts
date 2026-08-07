import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventMediatorClient } from '../../lib/server/event-mediator.ts';

const port = Number(process.env.EVENT_MEDIATOR_GROUP_PORT || 3311);
const total = Number(process.env.EVENT_MEDIATOR_GROUP_EVENTS || 40);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const bunRuntime = (globalThis as any).Bun;
const directory = await mkdtemp(join(tmpdir(), 'core3-event-mediator-group-'));
const databasePath = join(directory, 'events.duckdb');
const server = bunRuntime.spawn(['bun', 'services/event-mediator/server.ts'], {
  cwd: process.cwd(),
  env: { ...process.env, EVENT_MEDIATOR_PORT: String(port), CORE3_EVENT_DB_PATH: databasePath, CORE3_EVENT_ACK_TIMEOUT_MS: '250' },
  stdout: 'ignore',
  stderr: 'ignore',
});

async function healthy() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch {}
    await sleep(100);
  }
  throw new Error('Mediator did not become healthy');
}

try {
  await healthy();
  const workerA = new EventMediatorClient({ endpoint: `ws://127.0.0.1:${port}/events`, nodeId: 'group-worker-a' });
  const workerB = new EventMediatorClient({ endpoint: `ws://127.0.0.1:${port}/events`, nodeId: 'group-worker-b' });
  const publisher = new EventMediatorClient({ endpoint: `ws://127.0.0.1:${port}/events`, nodeId: 'group-publisher' });
  await Promise.all([workerA.start(), workerB.start(), publisher.start()]);
  const streams = [workerA, workerB].map((worker) => worker.subscribeStream({ topic: 'group.test', group: 'workers' }));
  await sleep(100);
  await Promise.all(Array.from({ length: total }, (_, index) => publisher.publish({
    topic: 'group.test',
    clientMessageId: `group-${index}`,
    payload: `payload-${index}`,
  })));
  const received = new Set<string>();
  let unacknowledged: any = null;
  let redelivered = false;
  const counts = await Promise.all(streams.map(async (stream) => {
    let count = 0;
    for await (const event of stream.events) {
      received.add(String(event.clientMessageId));
      count += 1;
      if (unacknowledged && unacknowledged.id !== event.id) {
        await stream.ack!(unacknowledged.sequence);
        unacknowledged = null;
      }
      if ((event as any).redelivery) {
        redelivered = true;
        await stream.ack!(event.sequence);
      } else unacknowledged = event;
      if (received.size >= total && redelivered) break;
    }
    stream.close();
    return count;
  }));
  if (received.size !== total) throw new Error(`Expected ${total} unique events, received ${received.size}`);
  if (counts.some((count) => count === 0)) throw new Error(`Consumer group did not distribute work: ${counts.join(',')}`);
  if (!redelivered) throw new Error('Unacknowledged event was not redelivered');

  await Promise.all([workerA.stop(), workerB.stop(), publisher.stop()]);
  console.log(JSON.stringify({ total, received: received.size, workerCounts: counts, acknowledged: true, redelivered }, null, 2));
} finally {
  server.kill();
  await rm(directory, { recursive: true, force: true });
}

process.exit(0);
