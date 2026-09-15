import { readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

// Isolated test identities and database. Never loads the sample app's auth or data.
const serviceRoot = join(import.meta.dirname, '../services/spreadsheet');
const databaseRoot = mkdtempSync(join(tmpdir(), 'core3-browser-workbook-'));
const db = await DuckDbDatabase.open(join(databaseRoot, 'test.duckdb'));
const repository = new YamlRepository(db);
await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'browser_workbook_migrations', ['schema', 'data']);
const runtime = new WorkbookRuntime(validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(serviceRoot, 'workbooks.yaml'), 'utf8'))), repository, {
  async getCurrentUser(request) {
    const name = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!['owner', 'editor', 'reader'].includes(name || '')) throw new Error('Unauthorized');
    return { sub: name, name, company_name: 'Acme', permissions: name === 'reader' ? ['spreadsheet.read', 'orders.read'] : ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export', 'orders.read'] };
  },
  hasPermission: (user, permission) => user.permissions.includes(permission),
});
Bun.serve({
  hostname: '127.0.0.1', port: 4320,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('OK');
    return await runtime.handle(request, url) || new Response('Not found', { status: 404 });
  },
});
