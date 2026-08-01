// TMS application wiring. The host imports this module contract instead of
// reaching into individual business services.
import duckdb from 'duckdb';
import { createFramework, SERVICE_KEYS } from '../lib/index.ts';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages } from '../lib/server/discovery.ts';
import { migrateDatabase } from '../lib/server/migrations.ts';
import { createTmsApi } from './api.ts';
import { initTmsDatabase } from './db/init.ts';
import { DuckDbRepository as TmsRepository } from './services/repository.ts';
import { JwtAuthProvider as TmsAuthProvider } from './services/auth.ts';

export { DuckDbRepository } from './services/repository.ts';
export { JwtAuthProvider } from './services/auth.ts';
export { xlsxToCsv } from './services/xlsx-import.ts';
export { orderWorkflow } from './services/order-workflow.ts';
export { financialWorkflow } from './services/financial-workflow.ts';
export { payrollWorkflow, quoteWorkflow } from './services/business-workflow.ts';
export { initTmsDatabase } from './db/init.ts';

export class TmsModule {
  readonly id = 'tms';
  private db: any = null;
  private repository: any = null;
  private root = '';

  install(context: { moduleRoot: string }): void {
    mkdirSync(join(context.moduleRoot, '.data'), { recursive: true });
  }

  async load(context: {
    appsRoot: string;
    moduleRoot: string;
    env: NodeJS.ProcessEnv;
    registerApi(handler: (request: Request, url: URL) => Response | null | Promise<Response | null>): void;
  }): Promise<void> {
    this.root = context.moduleRoot;
    const dbPath = context.env.TMS_DB_PATH || join(this.root, 'tms.duckdb');
    const uploadRoot = context.env.TMS_UPLOAD_ROOT || join(this.root, '.data', 'uploads');
    const secret = new TextEncoder().encode(context.env.JWT_SECRET || 'tms-dev-secret-32chars!!!!');
    this.db = new duckdb.Database(dbPath);
    const services = createFramework({
      repository: new TmsRepository(this.db),
      auth: new TmsAuthProvider(secret),
    });
    this.repository = services.resolve(SERVICE_KEYS.repository);
    const authProvider: any = services.resolve(SERVICE_KEYS.auth);
    await initTmsDatabase(this.repository, this.root);

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
      reloadPages,
    }));
  }

  async unload(): Promise<void> {
    if (!this.db) return;
    await new Promise<void>((resolve) => this.db.close(() => resolve()));
    this.db = null;
    this.repository = null;
  }

  async uninstall(): Promise<void> {
    if (this.repository) await migrateDatabase(this.repository, join(this.root, 'db', 'migrations'), 0);
  }
}

export default TmsModule;
