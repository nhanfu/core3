// TMS application wiring. The host imports this module contract instead of
// reaching into individual business services.
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages } from '../../lib/server/discovery.ts';
import { createTmsApi } from './api.ts';
import { DuckDbRepository as TmsRepository } from '../../db/repositories/tms.ts';
import { EventStore } from '../../lib/server/event-store.ts';

export { DuckDbRepository } from '../../db/repositories/tms.ts';
export { xlsxToCsv } from './services/xlsx-import.ts';
export { orderWorkflow } from './services/order-workflow.ts';
export { financialWorkflow } from './services/financial-workflow.ts';
export { payrollWorkflow, quoteWorkflow } from './services/business-workflow.ts';
export class TmsModule {
  readonly id = 'tms';
  private db: any = null;
  private repository: any = null;
  private eventStore: EventStore | null = null;

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
    const eventDatabase = eventConfig.database || {};
    const eventDatabasePath = eventDatabase.path || context.env.TMS_EVENT_DB_PATH;
    const eventLogPath = context.env.TMS_EVENT_LOG_PATH || join(context.moduleRoot, '.data', 'events.jsonl');
    this.eventStore = new EventStore({
      logPath: eventLogPath,
      databasePath: eventDatabasePath,
      shardCount: Number(eventConfig.shard_count || context.env.TMS_EVENT_SHARDS || 1),
      retentionMs: Number(eventConfig.retention_ms || context.env.TMS_EVENT_MEMORY_RETENTION_MS || 60 * 60 * 1000),
      maxRows: Number(eventConfig.max_rows || context.env.TMS_EVENT_MEMORY_MAX_ROWS || 1000),
      readerCount: Number(eventConfig.reader_connections || context.env.TMS_EVENT_READER_CONNECTIONS || 2),
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
