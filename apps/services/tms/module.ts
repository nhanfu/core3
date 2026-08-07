// TMS application wiring. The host imports this module contract instead of
// reaching into individual business services.
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages } from '../../lib/server/discovery.ts';
import { createTmsApi } from './api.ts';
import { DuckDbRepository as TmsRepository } from '../../db/repositories/tms.ts';
import { EventStore, type EventBus } from '../../lib/server/event-store.ts';
import { EventMediatorClient } from '../../lib/server/event-mediator.ts';

export { DuckDbRepository } from '../../db/repositories/tms.ts';
export { xlsxToCsv } from './services/xlsx-import.ts';
export { orderWorkflow } from './services/order-workflow.ts';
export { financialWorkflow } from './services/financial-workflow.ts';
export { payrollWorkflow, quoteWorkflow } from './services/business-workflow.ts';
export class TmsModule {
  readonly id = 'tms';
  private db: any = null;
  private repository: any = null;
  private eventStore: EventBus | null = null;

  install(context: { moduleRoot: string }): void {
    mkdirSync(join(context.moduleRoot, '.data'), { recursive: true });
  }

  async load(context: {
    appsRoot: string;
    moduleRoot: string;
    env: NodeJS.ProcessEnv;
    serviceConfigs: Record<string, any>;
    registerApi(handler: (request: Request, url: URL) => Response | null | Promise<Response | null>): void;
    resolveService<T>(name: string): T;
  }): Promise<void> {
    const uploadRoot = context.env.TMS_UPLOAD_ROOT || join(context.moduleRoot, '.data', 'uploads');
    this.db = context.resolveService<any>('database');
    this.repository = new TmsRepository(this.db);
    const eventConfig = context.serviceConfigs.event_store || {};
    const eventMode = String(eventConfig.mode || context.env.CORE3_EVENT_MODE || 'embedded');
    const eventDatabase = eventConfig.database || {};
    const eventDatabasePath = eventDatabase.path || context.env.TMS_EVENT_DB_PATH || join(context.moduleRoot, '.data', 'events-parquet');
    const eventSchema = eventConfig.schema || context.serviceConfigs.chat?.event_schema;
    if (!eventSchema) throw new Error('Chat event schema is not configured');
    this.eventStore = eventMode === 'mediator'
      ? new EventMediatorClient({
        endpoint: String((eventConfig.mediator as any)?.endpoint || context.env.CORE3_EVENT_MEDIATOR_URL || 'ws://127.0.0.1:3010/events'),
        token: String((eventConfig.mediator as any)?.token || context.env.CORE3_EVENT_MEDIATOR_TOKEN || ''),
        nodeId: String((eventConfig.mediator as any)?.node_id || context.env.CORE3_NODE_ID || `tms-${process.pid}`),
        reconnectMs: Number((eventConfig.mediator as any)?.reconnect_ms || 1000),
        segmentMaxRows: Number(eventConfig.segment_max_rows || context.env.CORE3_EVENT_SEGMENT_MAX_ROWS || 200),
        pullBatchSize: Number(eventConfig.pull_batch_size || context.env.CORE3_EVENT_PULL_BATCH_SIZE || 100),
      })
      : new EventStore({
        schema: eventSchema,
        databasePath: eventDatabasePath,
        retentionMs: Number(eventConfig.retention_ms || context.env.TMS_EVENT_MEMORY_RETENTION_MS || 60 * 60 * 1000),
        maxRows: Number(eventConfig.max_rows || context.env.TMS_EVENT_MEMORY_MAX_ROWS || 1000),
        hotMaxRows: Number(eventConfig.hot_max_rows || context.env.CORE3_EVENT_HOT_MAX_ROWS || eventConfig.max_rows || 100000),
        hotMaxBytes: Number(eventConfig.hot_max_bytes || context.env.CORE3_EVENT_HOT_MAX_BYTES || 128 * 1024 * 1024),
        hotRetentionMs: Number(eventConfig.hot_retention_ms || context.env.CORE3_EVENT_HOT_RETENTION_MS || eventConfig.retention_ms || 60 * 60 * 1000),
        hotConsumerTtlMs: Number(eventConfig.hot_consumer_ttl_ms || context.env.CORE3_EVENT_HOT_CONSUMER_TTL_MS || 30000),
        segmentMaxRows: Number(eventConfig.segment_max_rows || context.env.CORE3_EVENT_SEGMENT_MAX_ROWS || 200),
        pullBatchSize: Number(eventConfig.pull_batch_size || context.env.CORE3_EVENT_PULL_BATCH_SIZE || 100),
        readerCount: Number(eventConfig.reader_connections || context.env.TMS_EVENT_READER_CONNECTIONS || 2),
        bufferMaxRows: Number(eventConfig.buffer_max_rows || context.env.TMS_EVENT_BUFFER_MAX_ROWS || 10000),
        writeMode: eventConfig.write_mode || context.env.TMS_EVENT_WRITE_MODE || 'low_latency',
      });
    await this.eventStore.start();
    const authProvider: any = context.resolveService('auth');

    const discovered = discoverPages(context.appsRoot);
    const pageMaps = {
      pages: new Map([...discovered.pages].map(([id, page]) => [id, page.config])),
      datasources: new Map(discovered.datasources),
      catalogs: new Map(discovered.catalogs),
      menus: new Map(discovered.menus),
    };
    const reloadPages = () => {
      const next = discoverPages(context.appsRoot);
      const replacements = {
        pages: new Map([...next.pages].map(([id, page]) => [id, page.config])),
        datasources: next.datasources,
        catalogs: next.catalogs,
        menus: next.menus,
      };
      for (const key of Object.keys(pageMaps) as Array<keyof typeof pageMaps>) {
        const target = pageMaps[key];
        target.clear();
        for (const [entryKey, entryValue] of replacements[key]) target.set(entryKey, entryValue);
      }
    };
    context.registerApi(createTmsApi({
      repository: this.repository,
      authProvider,
      sources: pageMaps.datasources,
      pages: pageMaps.pages,
      catalogs: pageMaps.catalogs,
      menus: pageMaps.menus,
      permissions: discovered.permissions.get('tms')?.config || {},
      uploadRoot,
      eventStore: this.eventStore,
      reloadPages,
    }));
  }

  async unload(): Promise<void> {
    await this.eventStore?.stop();
    this.eventStore = null;
    this.db = null;
    this.repository = null;
  }

  async uninstall(): Promise<void> {}
}

export default TmsModule;
