import { beforeAll, afterAll, expect, test } from 'bun:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import { migrateDatabase } from '@core3/server/migrations';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';
import { WorkbookEngine } from '@core3/server/workbook-engine';
import { WorkbookImportJobs } from '@core3/server/workbook-import-jobs';

const root = join(import.meta.dir, '../services/spreadsheet');
const engine = new WorkbookEngine();
let xlsx: Uint8Array;
beforeAll(async () => { xlsx = await engine.exportSnapshot({ sheets: [{ id: 's', name: 'Budget', colNumber: 26, rowNumber: 100, cells: { A1: '21', B1: '=A1*2' } }] }); });
afterAll(() => engine.stop());
const auth = {
  getCurrentUser: async (request: Request) => {
    const actor = request.headers.get('Authorization') || 'owner';
    return { sub: actor === 'wrong' ? 'owner' : actor, company_name: actor === 'wrong' ? 'Other' : 'Acme', permissions: actor === 'reader' ? ['spreadsheet.read'] : ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export'] };
  },
  hasPermission: (user: any, permission: string) => user.permissions.includes(permission),
};
async function setup(path = ':memory:') {
  const definition = validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(root, 'workbooks.yaml'), 'utf8')));
  definition.import_jobs!.poll_ms = 600000;
  const db = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(db);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, 'import_test_migrations', ['schema', 'data']);
  const runtime = new WorkbookRuntime(definition, repository, auth);
  const execute = async (name: string, params: Record<string, any>) => {
    const operation = definition.operations[name];
    if (operation.mutation) return repository.executeMutation(operation.mutation, params);
    const bound = bindNamedParams(operation.query!, params);
    return repository.query(bound.statement, bound.values);
  };
  const convert = async (bytes: Uint8Array) => {
    const result = await engine.import(bytes, definition.max_import_expanded_bytes, definition.max_import_files);
    return { workbook_snapshot: JSON.stringify({ ...result.snapshot, revisionId: 'START_REVISION' }), warnings: result.warnings };
  };
  const worker = new WorkbookImportJobs(definition.import_jobs!, execute, convert);
  const request = async (path: string, method = 'GET', actor = 'owner', bytes?: Uint8Array) => {
    const url = new URL(`http://test${definition.endpoint}${path}`);
    const response = (await runtime.handle(new Request(url, { method, headers: { Authorization: actor, ...(bytes ? { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } : {}) }, ...(bytes ? { body: bytes } : {}) }), url))!;
    return { status: response.status, body: await response.json() };
  };
  return { db, repository, runtime, request, worker, execute, convert, definition, close: () => { worker.stop(); runtime.dispose(); db.close(); } };
}

test('imports XLSX through durable jobs with private results, cancellation and bounded uploads', async () => {
  const context = await setup();
  const { request, worker, repository } = context;
  try {
    expect((await request('/imports?name=Denied', 'POST', 'reader', xlsx)).status).toBe(403);
    const queued = await request('/imports?name=Imported&owner_id=other&company_name=Other', 'POST', 'owner', xlsx);
    expect(queued.status).toBe(202);
    expect(queued.body.state).toBe('queued');
    const route = `/imports/${queued.body.id}`;
    for (const actor of ['other', 'wrong']) {
      expect((await request('/imports', 'GET', actor)).body.data).toEqual([]);
      expect((await request(route, 'GET', actor)).status).toBe(404);
      expect((await request(route, 'DELETE', actor)).status).toBe(404);
    }
    expect(JSON.stringify((await request(route)).body)).not.toContain('input_base64');
    await worker.runOnce();
    const completed = (await request(route)).body;
    expect(completed.state).toBe('completed');
    expect(completed.attempts).toBe(1);
    const book = (await request(`/${completed.workbook_id}`)).body;
    expect(book.owner_id).toBe('owner');
    expect(book.company_name).toBe('Acme');
    expect(book.head_sequence).toBe(0);
    expect(Object.values(book.snapshot.sheets[0].cells)).toContain('=A1*2');
    expect((await request(`/${completed.workbook_id}`, 'GET', 'other')).status).toBe(404);
    expect((await request(route, 'DELETE')).status).toBe(409);
    expect((await repository.query('SELECT input_base64 FROM spreadsheet_import_jobs WHERE id = ?', [queued.body.id]))[0].input_base64).toBeNull();
    expect((await repository.query('SELECT verified FROM spreadsheet_workbook_checkpoints WHERE workbook_id = ?', [completed.workbook_id]))[0].verified).toBe(true);
    const cancel = await request('/imports?name=Cancel', 'POST', 'owner', xlsx);
    expect((await request(`/imports/${cancel.body.id}`, 'DELETE')).status).toBe(200);
    await worker.runOnce();
    expect((await request(`/imports/${cancel.body.id}`)).body.state).toBe('cancelled');
    const invalid = await request('/imports?name=Invalid', 'POST', 'owner', new Uint8Array([1, 2, 3]));
    await worker.runOnce();
    expect((await request(`/imports/${invalid.body.id}`)).body.state).toBe('failed');
    context.definition.max_import_bytes = 1;
    expect((await request('/imports?name=TooLarge', 'POST', 'owner', xlsx)).status).toBe(413);
    await repository.query('UPDATE spreadsheet_import_jobs SET updated_at_ms = 0 WHERE id = ?', [queued.body.id]);
    await worker.runOnce();
    expect((await request(route)).status).toBe(404);
    expect((await request(`/${completed.workbook_id}`)).status).toBe(200);
  } finally { context.close(); }
}, 15000);

test('recovers an expired import lease after database reopen and rejects the obsolete worker result', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'core3-import-jobs-'));
  let context = await setup(join(folder, 'imports.duckdb'));
  try {
    const queued = await context.request('/imports?name=Recovered', 'POST', 'owner', xlsx);
    const params = { job_id: queued.body.id, lease_token: 'obsolete', now: 1, lease_until: 2, max_attempts: 3 };
    expect((await context.execute('import_job_claim', params)).id).toBe(queued.body.id);
    context.close();
    context = await setup(join(folder, 'imports.duckdb'));
    await context.worker.runOnce();
    const completed = (await context.request(`/imports/${queued.body.id}`)).body;
    expect(completed.state).toBe('completed');
    expect(completed.attempts).toBe(2);
    await expect(context.execute('import_job_finish', { ...params, now: Date.now(), workbook_snapshot: '{}', warnings: '[]' })).rejects.toMatchObject({ code: 'WORKBOOK_IMPORT_LEASE_LOST' });
    await context.worker.runOnce();
    expect((await context.repository.query('SELECT COUNT(*) AS count FROM spreadsheet_workbooks WHERE id = ?', [completed.workbook_id]))[0].count).toBe(1);
  } finally { context.close(); rmSync(folder, { recursive: true, force: true }); }
}, 15000);

test('retries worker failures within the policy and fences cancellation during conversion', async () => {
  const context = await setup();
  let release: (() => void) | undefined;
  try {
    const first = await context.request('/imports?name=Retry', 'POST', 'owner', xlsx);
    const failing = new WorkbookImportJobs(context.definition.import_jobs!, context.execute, async () => { throw Object.assign(new Error('Worker unavailable'), { code: 'WORKBOOK_ENGINE_UNAVAILABLE' }); });
    await failing.runOnce();
    expect((await context.request(`/imports/${first.body.id}`)).body).toMatchObject({ state: 'queued', attempts: 1 });
    await failing.runOnce(); await failing.runOnce();
    expect((await context.request(`/imports/${first.body.id}`)).body).toMatchObject({ state: 'failed', attempts: 3 });
    const queued = await context.request('/imports?name=CancelRunning', 'POST', 'owner', xlsx);
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    let interruptions = 0;
    const held = new WorkbookImportJobs({ ...context.definition.import_jobs!, poll_ms: 10 }, context.execute, () => new Promise((_resolve, reject) => {
      release = () => reject(Object.assign(new Error('Conversion stopped'), { code: 'WORKBOOK_ENGINE_UNAVAILABLE' })); started();
    }), () => { interruptions++; release!(); });
    const running = held.runOnce(); await ready;
    held.cancel('unrelated-job');
    expect(interruptions).toBe(0);
    await context.worker.runOnce();
    expect((await context.request(`/imports/${queued.body.id}`)).body).toMatchObject({ state: 'running', attempts: 1 });
    expect((await context.request(`/imports/${queued.body.id}`, 'DELETE')).status).toBe(200);
    const cancellationDeadline = setTimeout(() => release?.(), 1000);
    try { await running; } finally { clearTimeout(cancellationDeadline); }
    expect(interruptions).toBe(1);
    expect((await context.request(`/imports/${queued.body.id}`)).body.state).toBe('cancelled');
    expect((await context.repository.query('SELECT COUNT(*) AS count FROM spreadsheet_workbooks', []))[0].count).toBe(0);
    for (let index = 0; index < 3; index++) expect((await context.request(`/imports?name=Pending${index}`, 'POST', 'owner', xlsx)).status).toBe(202);
    expect((await context.request('/imports?name=Overflow', 'POST', 'owner', xlsx)).status).toBe(429);
  } finally { release?.(); context.close(); }
}, 15000);
