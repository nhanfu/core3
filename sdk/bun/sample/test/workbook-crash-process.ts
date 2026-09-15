import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';

// Crash-test child only. The parent owns this temporary DB and kills this process
// without calling dispose/close; no production app configuration is loaded.
const root = join(import.meta.dir, '../services/spreadsheet');
const db = await DuckDbDatabase.open(Bun.argv[2]);
const repository = new YamlRepository(db);
await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crash_test_migrations', ['schema', 'data']);
let barrier: 'before' | 'after' | undefined;
const connect = db.connect.bind(db);
db.connect = () => {
  const connection = connect();
  return { ...connection, async run(sql: string, ...args: any[]) {
    if (sql.trim().toUpperCase() !== 'COMMIT' || !barrier) return connection.run(sql, ...args);
    const phase = barrier; barrier = undefined;
    // Hold the real mutation immediately before commit or after the database
    // committed but before its HTTP acknowledgement can be returned.
    if (phase === 'after') await connection.run(sql, ...args);
    console.log(`CRASH_TEST_BARRIER=${phase}`);
    return new Promise<never>(() => {});
  } };
};
const definition = validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(root, 'workbooks.yaml'), 'utf8')));
definition.import_jobs!.poll_ms = definition.export_jobs!.poll_ms = Bun.argv[3] === 'resume-jobs' ? 50 : 600000;
const runtime = new WorkbookRuntime(definition, repository, {
  async getCurrentUser(request) {
    if (request.headers.get('Authorization') !== 'Bearer crash-test-owner') throw new Error('Unauthorized');
    return { sub: 'owner', name: 'Owner', company_name: 'Crash test company', permissions: ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export'] };
  },
  hasPermission: (user: any, permission: string) => user.permissions.includes(permission),
});
const server = Bun.serve({
  hostname: '127.0.0.1', port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/spreadsheet/workbooks/__crash_barrier') {
      if (request.method !== 'POST' || request.headers.get('Authorization') !== 'Bearer crash-test-owner') return new Response('Denied', { status: 403 });
      const body = await request.json();
      if (!['before', 'after'].includes(body.phase)) return new Response('Invalid phase', { status: 422 });
      barrier = body.phase;
      return Response.json({ armed: true });
    }
    return await runtime.handle(request, url) || new Response('Not found', { status: 404 });
  },
});
console.log(`CRASH_TEST_READY=${server.port}`);
