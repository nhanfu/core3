import { readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { discoverPages } from '@core3/server/discovery';
import { createYamlApi } from '@core3/server/routes/yaml-api';

// Isolated test identities and database. Never loads the sample app's auth or data.
const serviceRoot = join(import.meta.dirname, '../services/spreadsheet');
const databaseRoot = mkdtempSync(join(tmpdir(), 'core3-browser-workbook-'));
const db = await DuckDbDatabase.open(join(databaseRoot, 'test.duckdb'));
const repository = new YamlRepository(db);
await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'browser_workbook_migrations', ['schema', 'data']);
const auth = {
  async getCurrentUser(request: Request) {
    const name = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!['owner', 'editor', 'reader'].includes(name || '')) throw new Error('Unauthorized');
    return { sub: name, name, company_name: 'Acme', permissions: name === 'reader' ? ['spreadsheet.read', 'orders.read'] : ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export', 'spreadsheet.manage', 'orders.read', 'documents.read', ...(name === 'owner' ? ['documents.write', 'spreadsheet.dashboard.manage'] : [])] };
  },
  hasPermission: (user: any, permission: string) => user.permissions.includes(permission),
};
const discovered = discoverPages(join(serviceRoot, '../..'));
const dashboardApi = createYamlApi({
  repository, authProvider: auth,
  sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('spreadsheet_'))),
  pageSources: new Map([...discovered.pageDatasources].filter(([id]) => discovered.pages.get(id)?.module === 'spreadsheet')),
  pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'spreadsheet').map(([id, page]) => [id, page.config])),
  catalogs: discovered.catalogs, menus: discovered.menus,
  workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'spreadsheet').map(([id, workflow]) => [id, workflow.config])),
  workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'spreadsheet').map(([id, workflow]) => [id, workflow.file])),
  permissions: discovered.permissions.get('spreadsheet')?.config || {},
  uploadRoot: join(databaseRoot, 'uploads'), eventStore: {}, topics: {},
});
const runtime = new WorkbookRuntime(validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(serviceRoot, 'workbooks.yaml'), 'utf8'))), repository, auth, service => {
  if (service !== 'documents') throw Object.assign(new Error('Fixture source unavailable'), { status: 503 });
  return {
    async readSource(request, source, params) {
      const user = await auth.getCurrentUser(request);
      if (source !== 'document_workbook_references' || !auth.hasPermission(user, 'documents.read')) throw Object.assign(new Error('Document unavailable'), { status: 403 });
      const documents = [{ id: 'fixture-document', name: 'Budget approval document', state: 'Draft' }];
      return { data: documents.filter(document => (!params.document_id || document.id === params.document_id) && document.name.toLowerCase().includes(String(params.q || '').toLowerCase())) };
    },
  };
});
Bun.serve({
  hostname: '127.0.0.1', port: 4320,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('OK');
    if (url.pathname === '/api/test/dashboard-config') {
      const user = await auth.getCurrentUser(request);
      const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
      const name = url.searchParams.get('page') === 'groups' ? 'dashboard-groups' : 'dashboard-group';
      const page = yaml(`pages/${name}.yaml`), api = yaml(`api/${name}.yaml`);
      return Response.json({ user, config: { ...page, ...api, actions: [...(page.actions || []), ...(api.actions || [])] } });
    }
    if (url.pathname === '/api/query' || url.pathname === '/api/mutate' || url.pathname.startsWith('/api/actions/')) {
      try { return await dashboardApi(request, url); }
      catch (error: any) { return Response.json({ error: error.message, code: error.code }, { status: error.status || 500 }); }
    }
    return await runtime.handle(request, url) || new Response('Not found', { status: 404 });
  },
});
