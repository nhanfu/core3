import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';

// Disposable PostgreSQL test worker. Parent owns migrations and process cleanup.
const db = PostgresDatabase.open(process.env.CORE3_TEST_POSTGRES_URL!);
const repository = new YamlRepository(db);
const definition = validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(import.meta.dir, '../services/spreadsheet/workbooks.yaml'), 'utf8')));
definition.import_jobs!.poll_ms = definition.export_jobs!.poll_ms = 600000;
definition.sources = { worker_values: { label: 'Worker values', service: 'fixture', source: 'values', permission: 'test.read', max_rows: 50, columns: [{ field: 'amount', label: 'Amount' }], filters: {} } };
let held = false, done = false, error: string | undefined, release!: () => void, fail = false;
let heldJobId: string | undefined, sourceReads = 0;
const barrier = new Promise<void>(resolve => { release = resolve; });
const executeMutation = repository.executeMutation.bind(repository);
repository.executeMutation = async (mutation, params) => {
  const hold = process.env.CORE3_TEST_HOLD_PHASE;
  if ((hold === 'prepare' || hold === 'claim') && mutation === definition.operations[hold === 'claim' ? 'export_job_claim' : 'export_job_prepare'].mutation) {
    held = true; heldJobId = params.job_id; await barrier;
    if (fail) throw new Error('Simulated obsolete worker failure');
  }
  return executeMutation(mutation, params);
};
const user = { sub: 'owner', name: 'Owner', company_name: 'Acme', permissions: ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export', 'test.read'] };
const runtime = new WorkbookRuntime(definition, repository, {
  async getCurrentUser() { throw new Error('HTTP identity is not used by this worker'); },
  async resolveBackgroundUser(id, company) {
    if (id !== user.sub || company !== user.company_name) throw new Error('Actor unavailable');
    return user;
  },
  hasPermission: (actor, permission) => actor.permissions.includes(permission),
}, () => ({
  async readSource() { throw new Error('Live requests must not be retained by a job'); },
  async readSourceAs(actor) {
    if (actor.user_id !== user.sub || actor.company_name !== user.company_name) throw new Error('Actor mismatch');
    sourceReads++;
    return { data: [{ amount: Number(process.env.CORE3_TEST_SOURCE_VALUE) }] };
  },
}));
let started = false;
const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === '/run' && request.method === 'POST' && !started) {
    started = true;
    void (runtime as any).exportJobs.runOnce().then(() => { done = true; }, (reason: Error) => { error = reason.message; done = true; });
    return Response.json({ started: true }, { status: 202 });
  }
  if (path === '/release' && request.method === 'POST') { fail = (await request.json()).fail === true; release(); return Response.json({ released: true }); }
  if (path === '/status') return Response.json({ held, heldJobId, done, error, sourceReads });
  return new Response('Not found', { status: 404 });
} });
console.log(`EXPORT_WORKER_READY=${server.port}`);
