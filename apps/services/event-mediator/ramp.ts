import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bunRuntime = (globalThis as any).Bun;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const startPublishers = Math.max(1, Number(process.env.EVENT_MEDIATOR_RAMP_START_PUBLISHERS || 1));
const subscriberMultiplier = Math.max(1, Number(process.env.EVENT_MEDIATOR_RAMP_SUBSCRIBER_MULTIPLIER || 4));
const startSubscribers = Math.max(1, Number(process.env.EVENT_MEDIATOR_RAMP_START_SUBSCRIBERS || startPublishers * subscriberMultiplier));
const maxPublishers = Math.max(startPublishers, Number(process.env.EVENT_MEDIATOR_RAMP_MAX_PUBLISHERS || 32));
const maxSubscribers = Math.max(startSubscribers, Number(process.env.EVENT_MEDIATOR_RAMP_MAX_SUBSCRIBERS || maxPublishers * subscriberMultiplier));
const eventsPerPublisher = Math.max(1, Number(process.env.EVENT_MEDIATOR_RAMP_EVENTS || 10000));
const meaningfulTimeMs = Math.max(1000, Number(process.env.EVENT_MEDIATOR_RAMP_MEANINGFUL_TIME_MS || 30000));
const inFlight = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_IN_FLIGHT || 64));
const batchSize = Math.max(1, Number(process.env.EVENT_MEDIATOR_STRESS_BATCH_SIZE || 100));
const pollBatch = Math.max(1, Number(process.env.EVENT_MEDIATOR_RAMP_POLL_BATCH || batchSize));
const payloadBytes = Math.max(0, Number(process.env.EVENT_MEDIATOR_STRESS_PAYLOAD_BYTES || 4096));
const writeMode = process.env.EVENT_MEDIATOR_RAMP_WRITE_MODE || 'low_latency';
const outputPath = process.env.EVENT_MEDIATOR_RAMP_OUTPUT || join(process.cwd(), 'event-mediator-ramp-result.json');
const results: any[] = [];

async function health(port: number) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch {}
    await sleep(100);
  }
  throw new Error('Mediator did not become healthy');
}

async function readChild(child: any): Promise<{ result: any; exitCode: number }> {
  const outputPromise = new Response(child.stdout).text();
  const errorPromise = new Response(child.stderr).text();
  await child.exited;
  const output = await outputPromise;
  const errorOutput = await errorPromise;
  const line = output.trim().split('\n').at(-1);
  return { result: line ? JSON.parse(line) : { error: errorOutput }, exitCode: child.exitCode || 0 };
}

async function runStage(publishers: number, subscribers: number, port: number) {
  const expected = publishers * eventsPerPublisher;
  const directory = await mkdtemp(join(tmpdir(), `core3-event-ramp-${publishers}-${subscribers}-`));
  const server = bunRuntime.spawn(['bun', 'services/event-mediator/server.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, EVENT_MEDIATOR_PORT: String(port), CORE3_EVENT_DB_PATH: join(directory, 'events.duckdb'), CORE3_EVENT_WRITE_MODE: writeMode, CORE3_EVENT_MAX_ROWS: String(expected * 2 + 1000), CORE3_EVENT_HOT_MAX_ROWS: String(expected * 2 + 1000), CORE3_EVENT_HOT_MAX_BYTES: String(Math.max(128 * 1024 * 1024, expected * payloadBytes * 2)) },
    stdout: 'ignore', stderr: 'pipe',
  });
  const children: any[] = [];
  const startedAt = performance.now();
  try {
    await health(port);
    for (let subscriber = 0; subscriber < subscribers; subscriber += 1) {
      children.push(bunRuntime.spawn(['bun', 'services/event-mediator/stress-subscriber.ts'], {
        cwd: process.cwd(),
        env: { ...process.env, EVENT_MEDIATOR_STRESS_PORT: String(port), EVENT_MEDIATOR_STRESS_SUBSCRIBER: String(subscriber), EVENT_MEDIATOR_STRESS_EXPECTED: String(expected), EVENT_MEDIATOR_STRESS_POLL_BATCH: String(pollBatch), EVENT_MEDIATOR_STRESS_DEADLINE_MS: String(meaningfulTimeMs) },
        stdout: 'pipe', stderr: 'pipe',
      }));
    }
    await sleep(200);
    for (let publisher = 0; publisher < publishers; publisher += 1) {
      children.push(bunRuntime.spawn(['bun', 'services/event-mediator/stress-publisher.ts'], {
        cwd: process.cwd(),
        env: { ...process.env, EVENT_MEDIATOR_STRESS_PORT: String(port), EVENT_MEDIATOR_STRESS_PUBLISHER: String(publisher), EVENT_MEDIATOR_STRESS_EVENTS: String(eventsPerPublisher), EVENT_MEDIATOR_STRESS_IN_FLIGHT: String(inFlight), EVENT_MEDIATOR_STRESS_BATCH_SIZE: String(batchSize), EVENT_MEDIATOR_STRESS_PAYLOAD_BYTES: String(payloadBytes) },
        stdout: 'pipe', stderr: 'pipe',
      }));
    }
    const timeout = setTimeout(() => children.forEach((child) => child.kill()), meaningfulTimeMs + 5000);
    const childResults = await Promise.all(children.map(readChild));
    clearTimeout(timeout);
    const elapsedMs = performance.now() - startedAt;
    const publishersResult = childResults.slice(subscribers).map((entry) => entry.result);
    const subscribersResult = childResults.slice(0, subscribers).map((entry) => entry.result);
    const publisherComplete = publishersResult.length === publishers && publishersResult.every((result) => Number(result.succeeded) === eventsPerPublisher && Number(result.failed) === 0);
    const subscriberComplete = subscribersResult.length === subscribers && subscribersResult.every((result) => Number(result.received) === expected);
    return { publishers, subscribers, expected, elapsedMs: Number(elapsedMs.toFixed(2)), publisherComplete, subscriberComplete, complete: publisherComplete && subscriberComplete, publishersResult, subscribersResult };
  } finally {
    children.forEach((child) => child.kill());
    server.kill();
    await rm(directory, { recursive: true, force: true });
  }
}

try {
  let publishers = startPublishers;
  let subscribers = startSubscribers;
  let port = Number(process.env.EVENT_MEDIATOR_RAMP_PORT || 3320);
  while (publishers <= maxPublishers && subscribers <= maxSubscribers) {
    const result = await runStage(publishers, subscribers, port++);
    results.push(result);
    console.log(JSON.stringify({ stage: results.length, publishers, subscribers, elapsedMs: result.elapsedMs, complete: result.complete }));
    if (!result.complete) break;
    publishers *= 2;
    subscribers = Math.min(maxSubscribers, subscribers * 2);
  }
  const report = { meaningfulTimeMs, eventsPerPublisher, batchSize, pollBatch, payloadBytes, writeMode, subscriberMultiplier, stages: results, lastPassing: results.filter((result) => result.complete).at(-1) || null, firstFailing: results.find((result) => !result.complete) || null };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (report.firstFailing) process.exitCode = 1;
} finally {}
