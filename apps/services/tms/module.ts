// TMS application wiring. The host imports this module contract instead of
// reaching into individual business services.
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages } from '../../lib/server/discovery.ts';
import { createTmsApi } from './api.ts';
import { DuckDbRepository as TmsRepository } from '../../db/repositories/tms.ts';

export { DuckDbRepository } from '../../db/repositories/tms.ts';
export { xlsxToCsv } from './services/xlsx-import.ts';
export { orderWorkflow } from './services/order-workflow.ts';
export { financialWorkflow } from './services/financial-workflow.ts';
export { payrollWorkflow, quoteWorkflow } from './services/business-workflow.ts';
export class TmsModule {
  readonly id = 'tms';
  private db: any = null;
  private repository: any = null;

  install(context: { moduleRoot: string }): void {
    mkdirSync(join(context.moduleRoot, '.data'), { recursive: true });
  }

  async load(context: {
    appsRoot: string;
    moduleRoot: string;
    env: NodeJS.ProcessEnv;
    registerApi(handler: (request: Request, url: URL) => Response | null | Promise<Response | null>): void;
    resolveService<T>(name: string): T;
  }): Promise<void> {
    const uploadRoot = context.env.TMS_UPLOAD_ROOT || join(context.moduleRoot, '.data', 'uploads');
    this.db = context.resolveService<any>('database');
    this.repository = new TmsRepository(this.db);
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
      reloadPages,
    }));
  }

  async unload(): Promise<void> {
    this.db = null;
    this.repository = null;
  }

  async uninstall(): Promise<void> {}
}

export default TmsModule;
