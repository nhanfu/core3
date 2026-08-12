import { serveEventMediator } from './event-mediator.ts';

const port = Number(process.env.EVENT_MEDIATOR_PORT || 3010);
const databasePath = process.env.CORE3_EVENT_DB_PATH || '../coredb/events-mediator-parquet';
const token = process.env.CORE3_EVENT_MEDIATOR_TOKEN || '';
const schema = {
  table: 'event_log',
  columns: [
    { name: 'id', type: 'varchar' as const, source: 'id', nullable: false },
    { name: 'sequence', type: 'bigint' as const, source: 'sequence', nullable: false },
    { name: 'event_at', type: 'bigint' as const, source: 'at', nullable: false },
    { name: 'event_json', type: 'varchar' as const, source: '@json' },
    { name: 'topic', type: 'varchar' as const, source: 'topic' },
    { name: 'event_key', type: 'varchar' as const, source: 'key' },
    { name: 'source_node', type: 'varchar' as const, source: 'sourceNode' },
    { name: 'payload', type: 'varchar' as const, source: 'payload' },
  ],
};

const mediator = await serveEventMediator({
  port,
  token,
  databasePath,
  schema,
  retentionMs: Number(process.env.CORE3_EVENT_RETENTION_MS || 60 * 60 * 1000),
  maxRows: Number(process.env.CORE3_EVENT_MAX_ROWS || 100000),
  hotMaxRows: Number(process.env.CORE3_EVENT_HOT_MAX_ROWS || process.env.CORE3_EVENT_MAX_ROWS || 100000),
  hotMaxBytes: Number(process.env.CORE3_EVENT_HOT_MAX_BYTES || 128 * 1024 * 1024),
  hotRetentionMs: Number(process.env.CORE3_EVENT_HOT_RETENTION_MS || process.env.CORE3_EVENT_RETENTION_MS || 60 * 60 * 1000),
  hotConsumerTtlMs: Number(process.env.CORE3_EVENT_HOT_CONSUMER_TTL_MS || 30000),
  segmentMaxRows: Number(process.env.CORE3_EVENT_SEGMENT_MAX_ROWS || 200),
  pullBatchSize: Number(process.env.CORE3_EVENT_PULL_BATCH_SIZE || 100),
  readerCount: Number(process.env.CORE3_EVENT_READER_CONNECTIONS || 4),
  bufferMaxRows: Number(process.env.CORE3_EVENT_BUFFER_MAX_ROWS || 10000),
  writeMode: (process.env.CORE3_EVENT_WRITE_MODE || 'low_latency') as 'low_latency' | 'durable',
  ackTimeoutMs: Number(process.env.CORE3_EVENT_ACK_TIMEOUT_MS || 30000),
  maxPendingPerClient: Number(process.env.CORE3_EVENT_MAX_PENDING_PER_CLIENT || 10000),
});

const shutdown = async () => {
  await mediator.stop();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
console.log(`Event mediator listening on ws://127.0.0.1:${port}/events`);
