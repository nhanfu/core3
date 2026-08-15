import { serveEventMediator } from './event-mediator.ts';
import { loadMedConfig } from './config.ts';
import { rm } from 'node:fs/promises';

const port = Number(process.env.EVENT_MEDIATOR_PORT || 3010);
const memoryDb = process.argv.slice(2).some((argument) => argument === '--memory-db' || argument === '--memory-db=true');
const config: any = await loadMedConfig();
const eventConfig = config.event_store || {};
const eventDatabase = eventConfig.database || {};
const databasePath = memoryDb ? ':memory:' : eventDatabase.path || process.env.CORE3_EVENT_DB_PATH || '../coredb/events-parquet';
if (process.env.CORE3_CLEAN_EVENT_STORE === 'true' && databasePath !== ':memory:') {
  await rm(databasePath, { recursive: true, force: true });
}
const token = String(eventConfig.mediator?.token || process.env.CORE3_EVENT_MEDIATOR_TOKEN || '');
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
  retentionMs: Number(eventConfig.retention_ms || 60 * 60 * 1000),
  maxRows: Number(eventConfig.max_rows || 100000),
  hotMaxRows: Number(eventConfig.hot_max_rows || eventConfig.max_rows || 100000),
  hotMaxBytes: Number(eventConfig.hot_max_bytes || 128 * 1024 * 1024),
  hotRetentionMs: Number(eventConfig.hot_retention_ms || eventConfig.retention_ms || 60 * 60 * 1000),
  hotConsumerTtlMs: Number(eventConfig.hot_consumer_ttl_ms || 30000),
  segmentMaxRows: Number(eventConfig.segment_max_rows || 200),
  pullBatchSize: Number(eventConfig.pull_batch_size || 100),
  readerCount: Number(eventConfig.reader_connections || 4),
  bufferMaxRows: Number(eventConfig.buffer_max_rows || 10000),
  writeMode: (eventConfig.write_mode || 'low_latency') as 'low_latency' | 'durable',
  ackTimeoutMs: Number(eventConfig.ack_timeout_ms || 30000),
  maxPendingPerClient: Number(eventConfig.max_pending_per_client || 10000),
});

const shutdown = async () => {
  await mediator.stop();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
console.log(`Event mediator listening on ws://127.0.0.1:${port}/events`);
