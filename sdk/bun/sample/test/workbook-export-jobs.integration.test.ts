import { expect, test } from 'bun:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import { migrateDatabase } from '@core3/server/migrations';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';
import { WorkbookFileJobs } from '@core3/server/workbook-file-jobs';
import { readWorkbookXlsx } from '@core3/client/spreadsheet/files';

const root = join(import.meta.dir, '../services/spreadsheet');
const auth = {
  resolveBackgroundUser: async (id: string, company: string) => ({ sub: id, company_name: company, permissions: ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export'] }),
  getCurrentUser: async (request: Request) => {
    const actor = request.headers.get('Authorization') || 'owner';
    return { sub: actor === 'wrong' ? 'owner' : actor, company_name: actor === 'wrong' ? 'Other' : 'Acme', permissions: actor === 'denied' ? ['spreadsheet.read'] : ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export'] };
  },
  hasPermission: (user: any, permission: string) => user.permissions.includes(permission),
};
async function setup(path = ':memory:') {
  const definition = validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(root, 'workbooks.yaml'), 'utf8')));
  definition.import_jobs!.poll_ms = definition.export_jobs!.poll_ms = 600000;
  // An opt-in PostgreSQL URL must identify a disposable test database.
  const db = process.env.CORE3_TEST_POSTGRES_URL ? PostgresDatabase.open(process.env.CORE3_TEST_POSTGRES_URL) : await DuckDbDatabase.open(path);
  const repository = new YamlRepository(db);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, 'export_test_migrations', ['schema', 'data']);
  const runtime = new WorkbookRuntime(definition, repository, auth);
  const execute = async (name: string, params: Record<string, any>) => {
    const operation = definition.operations[name];
    if (operation.mutation) return repository.executeMutation(operation.mutation, params);
    const bound = bindNamedParams(operation.query!, params);
    return repository.query(bound.statement, bound.values);
  };
  const worker = (runtime as any).exportJobs as WorkbookFileJobs;
  const request = async (path: string, method = 'GET', body?: any, actor = 'owner') => {
    const url = new URL(`http://test${definition.endpoint}${path}`);
    return (await runtime.handle(new Request(url, { method, headers: { Authorization: actor }, ...(body ? { body: JSON.stringify(body) } : {}) }), url))!;
  };
  const create = async () => (await request('', 'POST', { name: 'Export budget', snapshot: { sheets: [{ id: 's', name: 'Budget', colNumber: 26, rowNumber: 100, cells: { A1: '21', B1: '=A1*2' } }] } })).json();
  return { db, repository, runtime, request, worker, execute, definition, create, close: () => { worker.stop(); runtime.dispose(); db.close(); } };
}

test('durably publishes the captured share once, without requiring export permission', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'core3-share-jobs-'));
  let context = await setup(join(folder, 'shares.duckdb'));
  const noExport = () => {
    (context.runtime as any).auth = {
      ...auth,
      getCurrentUser: async (request: Request) => {
        const user = await auth.getCurrentUser(request);
        return { ...user, permissions: user.permissions.filter(permission => permission !== 'spreadsheet.export') };
      },
      resolveBackgroundUser: async (id: string, company: string) => ({ sub: id, company_name: company, permissions: ['spreadsheet.read', 'spreadsheet.write'] }),
    };
  };
  try {
    noExport();
    const book = await context.create();
    const response = await context.request(`/${book.id}/shares`, 'POST', { base_revision: 'START_REVISION', days: 2, background: true });
    expect(response.status).toBe(202);
    const job = await response.json();
    expect(job.kind).toBe('share'); expect(job.token).toBeUndefined();
    expect((await context.request(`/${book.id}/export`, 'POST')).status).toBe(403);
    expect((await (await context.request('/exports')).json()).data).toContainEqual(expect.objectContaining({ id: job.id, kind: 'share' }));
    expect(await context.repository.query('SELECT id FROM spreadsheet_workbook_shares WHERE id = ?', [job.id])).toEqual([]);
    const loaded = await (await context.request(`/${book.id}`)).json();
    expect((await context.request(`/${book.id}/revisions`, 'POST', { type: 'REMOTE_REVISION', version: 1, clientId: loaded.client.id, serverRevisionId: 'START_REVISION', nextRevisionId: 'edited-after-share', commands: [{ type: 'UPDATE_CELL', sheetId: 's', col: 0, row: 0, content: '99' }] })).status).toBe(200);
    context.close(); context = await setup(join(folder, 'shares.duckdb')); noExport();
    expect((await context.request(`/exports/${job.id}?download=true`)).status).toBe(409);
    await context.worker.runOnce();
    const result = await context.request(`/exports/${job.id}?download=true`);
    expect(result.status).toBe(200);
    const link = await result.json();
    expect(link).toMatchObject({ id: job.id, revision_id: 'START_REVISION' }); expect(link.token).toHaveLength(43);
    const published = await (await context.request(`/public/${link.token}`)).json();
    expect(published.snapshot.sheets[0].cells).toMatchObject({ A1: '21', B1: '42' });
    expect(Date.parse(published.expires_at)).toBe(Date.parse(link.expires_at));
    await context.worker.runOnce();
    expect(await (await context.request(`/exports/${job.id}?download=true`)).json()).toEqual(link);
    expect(await context.repository.query('SELECT id FROM spreadsheet_workbook_shares WHERE id = ?', [job.id])).toEqual([{ id: job.id }]);
    expect((await context.request(`/exports/${job.id}?download=true`, 'GET', undefined, 'other')).status).toBe(404);
    expect((await context.request(`/${book.id}/shares`, 'DELETE', { share_id: job.id })).status).toBe(200);
    expect((await context.request(`/public/${link.token}`)).status).toBe(404);
    expect((await context.request(`/exports/${job.id}?download=true`)).status).toBe(404);
    const cancelled = await (await context.request(`/${book.id}/shares`, 'POST', { base_revision: 'edited-after-share', background: true })).json();
    expect((await context.request(`/exports/${cancelled.id}`, 'DELETE')).status).toBe(200);
    await context.worker.runOnce();
    expect(await context.repository.query('SELECT id FROM spreadsheet_workbook_shares WHERE id = ?', [cancelled.id])).toEqual([]);
  } finally { context.close(); rmSync(folder, { recursive: true, force: true }); }
}, 25000);

test('prepared share retries recheck management access and cannot partially publish', async () => {
  const context = await setup();
  try {
    const book = await context.create();
    const job = await (await context.request(`/${book.id}/shares`, 'POST', { base_revision: 'START_REVISION', background: true })).json();
    const execute = context.repository.executeMutation.bind(context.repository);
    let interrupted = false;
    context.repository.executeMutation = async (mutation, params) => {
      const result = await execute(mutation, params);
      if (mutation === context.definition.operations.export_job_prepare.mutation && !interrupted) {
        interrupted = true;
        throw Object.assign(new Error('Worker unavailable after preparation'), { code: 'WORKBOOK_ENGINE_UNAVAILABLE' });
      }
      return result;
    };
    await context.worker.runOnce();
    expect(interrupted).toBe(true);
    const [prepared] = await context.repository.query('SELECT state, workbook_snapshot FROM spreadsheet_export_jobs WHERE id = ?', [job.id]);
    expect(prepared.state).toBe('queued');
    expect(JSON.parse(prepared.workbook_snapshot).format).toBe('core3-share-input-v1');
    (context.runtime as any).auth = { ...auth, resolveBackgroundUser: async () => ({ sub: 'owner', company_name: 'Acme', permissions: ['spreadsheet.read', 'spreadsheet.export'] }) };
    await context.worker.runOnce();
    expect(await (await context.request(`/exports/${job.id}`)).json()).toMatchObject({ state: 'failed' });
    expect(await context.repository.query('SELECT id FROM spreadsheet_workbook_shares WHERE id = ?', [job.id])).toEqual([]);

    (context.runtime as any).auth = auth;
    const rollback = await (await context.request(`/${book.id}/shares`, 'POST', { base_revision: 'START_REVISION', background: true })).json();
    const finish = context.definition.operations.share_job_finish.mutation;
    let finishError: string | undefined;
    context.repository.executeMutation = async (mutation, params) => {
      try { return await execute(mutation, params); }
      catch (error: any) { if (mutation === finish) finishError = error.code; throw error; }
    };
    // A failure after the publication INSERT must roll back both tables.
    finish.steps.push({ query: 'SELECT 1 WHERE FALSE', expect_changed: true, status: 409, code: 'TEST_ROLLBACK', message: 'Injected transaction failure' });
    await context.worker.runOnce();
    expect(finishError).toBe('TEST_ROLLBACK');
    expect(await (await context.request(`/exports/${rollback.id}`)).json()).toMatchObject({ state: 'failed' });
    expect(await context.repository.query('SELECT id FROM spreadsheet_workbook_shares WHERE id = ?', [rollback.id])).toEqual([]);
    expect((await context.repository.query('SELECT artifact_base64 FROM spreadsheet_export_jobs WHERE id = ?', [rollback.id]))[0].artifact_base64).toBeNull();
  } finally { context.close(); }
}, 25000);

test('cancellation before share completion publishes nothing and a lost commit acknowledgment publishes once', async () => {
  const context = await setup();
  try {
    const book = await context.create();
    const execute = context.repository.executeMutation.bind(context.repository);
    const cancelled = await (await context.request(`/${book.id}/shares`, 'POST', { base_revision: 'START_REVISION', background: true })).json();
    context.repository.executeMutation = async (mutation, params) => {
      if (mutation === context.definition.operations.share_job_finish.mutation) {
        await context.request(`/exports/${cancelled.id}`, 'DELETE');
      }
      return execute(mutation, params);
    };
    await context.worker.runOnce();
    expect(await (await context.request(`/exports/${cancelled.id}`)).json()).toMatchObject({ state: 'cancelled' });
    expect(await context.repository.query('SELECT id FROM spreadsheet_workbook_shares WHERE id = ?', [cancelled.id])).toEqual([]);

    const committed = await (await context.request(`/${book.id}/shares`, 'POST', { base_revision: 'START_REVISION', background: true })).json();
    let acknowledgmentsLost = 0;
    context.repository.executeMutation = async (mutation, params) => {
      const result = await execute(mutation, params);
      if (mutation === context.definition.operations.share_job_finish.mutation) { acknowledgmentsLost++; throw new Error('Connection lost after commit'); }
      return result;
    };
    await context.worker.runOnce(); await context.worker.runOnce();
    expect(acknowledgmentsLost).toBe(1);
    expect(await (await context.request(`/exports/${committed.id}`)).json()).toMatchObject({ state: 'completed' });
    const link = await (await context.request(`/exports/${committed.id}?download=true`)).json();
    expect((await context.request(`/public/${link.token}`)).status).toBe(200);
    expect(await context.repository.query('SELECT id FROM spreadsheet_workbook_shares WHERE id = ?', [committed.id])).toEqual([{ id: committed.id }]);
  } finally { context.close(); }
}, 25000);

test('resumes print preparation after restart and preserves the queued revision and page setup', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'core3-print-jobs-'));
  let context = await setup(join(folder, 'prints.duckdb'));
  try {
    const book = await context.create();
    const response = await context.request(`/${book.id}/print`, 'POST');
    expect(response.status).toBe(202);
    const job = await response.json();
    expect(job.kind).toBe('print');
    const originalSetup = structuredClone(context.definition.print_page_setup);
    const loaded = await (await context.request(`/${book.id}`)).json();
    const edit = await context.request(`/${book.id}/revisions`, 'POST', { type: 'REMOTE_REVISION', version: 1, clientId: loaded.client.id, serverRevisionId: 'START_REVISION', nextRevisionId: 'edited-after-print', commands: [{ type: 'UPDATE_CELL', sheetId: 's', col: 0, row: 0, content: '99' }] });
    expect(edit.status).toBe(200);
    context.close(); context = await setup(join(folder, 'prints.duckdb'));
    context.definition.print_page_setup!.default_paper = 'letter';
    expect((await context.request(`/exports/${job.id}?download=true`)).status).toBe(409);
    await context.worker.runOnce();
    const preview = await context.request(`/exports/${job.id}?download=true`);
    expect(preview.status).toBe(200);
    expect(preview.headers.get('content-type')).toBe('application/json');
    expect(preview.headers.get('x-workbook-revision')).toBe('START_REVISION');
    const payload = await preview.json();
    expect(payload).toMatchObject({ name: 'Export budget', revision_id: 'START_REVISION', page_setup: originalSetup, max_cells: context.definition.print_max_cells });
    expect(payload.snapshot.sheets[0].cells).toMatchObject({ A1: '21', B1: '42' });
    expect((await context.request(`/exports/${job.id}?download=true`, 'GET', undefined, 'other')).status).toBe(404);
    expect((await context.request(`/exports/${job.id}?download=true`, 'GET', undefined, 'wrong')).status).toBe(404);
    expect((await context.request(`/exports/${job.id}?download=true`, 'GET', undefined, 'denied')).status).toBe(403);
    const cancelled = await (await context.request(`/${book.id}/print`, 'POST')).json();
    expect((await context.request(`/exports/${cancelled.id}`, 'DELETE')).status).toBe(200);
    await context.worker.runOnce();
    expect(await (await context.request(`/exports/${cancelled.id}`)).json()).toMatchObject({ state: 'cancelled' });
    expect((await context.request(`/exports/${cancelled.id}?download=true`)).status).toBe(409);
  } finally { context.close(); rmSync(folder, { recursive: true, force: true }); }
}, 20000);

test('queues private formula-preserving exports and rechecks access when downloading', async () => {
  const context = await setup();
  const { request, worker, repository } = context;
  try {
    const book = await context.create();
    await request(`/${book.id}/members`, 'POST', { user_id: 'other', role: 'reader' });
    const queued = await request(`/${book.id}/export`, 'POST');
    expect(queued.status).toBe(202);
    const job = await queued.json(), route = `/exports/${job.id}`;
    expect((await request(`${route}?download=true`)).status).toBe(409);
    expect((await request(route, 'GET', undefined, 'other')).status).toBe(404);
    expect((await request(route, 'GET', undefined, 'wrong')).status).toBe(404);
    expect((await request(route, 'GET', undefined, 'denied')).status).toBe(403);
    expect(JSON.stringify(await (await request(route)).json())).not.toContain('workbook_snapshot');
    await worker.runOnce();
    const file = await request(`${route}?download=true`);
    expect(file.status).toBe(200);
    expect(file.headers.get('X-Workbook-Revision')).toBe('START_REVISION');
    const parts = readWorkbookXlsx(new Uint8Array(await file.arrayBuffer()), 10000000, 1000);
    expect(parts['xl/worksheets/sheet0.xml']).toContain('A1*2');
    expect(parts['xl/worksheets/sheet0.xml']).toContain('<v>42</v>');
    expect((await repository.query('SELECT workbook_snapshot FROM spreadsheet_export_jobs WHERE id = ?', [job.id]))[0].workbook_snapshot).toBeNull();
    expect((await (await request(`/${book.id}`)).json()).head_sequence).toBe(0);
    const recipientJob = await (await request(`/${book.id}/export`, 'POST', undefined, 'other')).json();
    await worker.runOnce();
    expect((await request(`/exports/${recipientJob.id}?download=true`, 'GET', undefined, 'other')).status).toBe(200);
    expect((await request(`/exports/${recipientJob.id}?download=true`)).status).toBe(404);
    await repository.query('DELETE FROM spreadsheet_workbook_members WHERE workbook_id = ? AND user_id = ?', [book.id, 'other']);
    expect((await request(`/exports/${recipientJob.id}?download=true`, 'GET', undefined, 'other')).status).toBe(404);
    expect((await (await request('/exports', 'GET', undefined, 'other')).json()).data).toEqual([]);
    await repository.query('UPDATE spreadsheet_export_jobs SET required_permissions = ? WHERE id = ?', ['["revoked.source"]', job.id]);
    expect((await request(`${route}?download=true`)).status).toBe(403);
    await repository.query('UPDATE spreadsheet_export_jobs SET expires_at_ms = 0 WHERE id = ?', [job.id]);
    expect((await request(route)).status).toBe(404);
    await worker.runOnce();
    expect(await repository.query('SELECT id FROM spreadsheet_export_jobs WHERE id = ?', [job.id])).toEqual([]);
    expect((await request(`/${book.id}`)).status).toBe(200);
  } finally { context.close(); }
}, 15000);

test('cancelling while actor authorization is pending prevents preparation from starting', async () => {
  const context = await setup();
  const resolveUser = auth.resolveBackgroundUser;
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  let rendering = 0;
  let running: Promise<void> | undefined;
  try {
    const book = await context.create();
    const queued = await context.request(`/${book.id}/export`, 'POST');
    expect(queued.status).toBe(202);
    const job = await queued.json();
    auth.resolveBackgroundUser = async (id, company) => { entered(); await held; return resolveUser(id, company); };
    (context.runtime as any).exportEngine.render = async () => { rendering++; throw new Error('Cancelled preparation must not start'); };
    running = context.worker.runOnce();
    await started;
    expect(await (await context.request(`/exports/${job.id}`)).json()).toMatchObject({ state: 'running', stage: 'preparing', data_pages_read: 0 });
    expect((await context.request(`/exports/${job.id}`, 'DELETE')).status).toBe(200);
    release(); await running;
    expect(rendering).toBe(0);
    expect(await (await context.request(`/exports/${job.id}`)).json()).toMatchObject({ state: 'cancelled' });
  } finally {
    auth.resolveBackgroundUser = resolveUser; release(); await running; context.close();
  }
}, 15000);

test('resumes unprepared exports after database reopen and fences cancelled or obsolete preparation and conversion', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'core3-export-jobs-'));
  let context = await setup(join(folder, 'exports.duckdb'));
  try {
    const book = await context.create();
    const job = await (await context.request(`/${book.id}/export`, 'POST')).json();
    const [stored] = await context.repository.query('SELECT workbook_snapshot FROM spreadsheet_export_jobs WHERE id = ?', [job.id]);
    expect(JSON.parse(stored.workbook_snapshot).format).toBe('core3-export-input-v1');
    const claim = { job_id: job.id, lease_token: 'old', now: 1, lease_until: 2, max_attempts: 3 };
    expect((await context.execute('export_job_claim', claim)).id).toBe(job.id);
    await context.execute('export_job_fail', { ...claim, now: Date.now(), state: 'failed', error: 'Obsolete failure' });
    expect(await (await context.request(`/exports/${job.id}`)).json()).toMatchObject({ state: 'running', attempts: 1 });
    await expect(context.execute('export_job_progress', { ...claim, now: Date.now(), stage: 'preparing', data_pages_read: 3 })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    context.close(); context = await setup(join(folder, 'exports.duckdb'));
    await context.worker.runOnce();
    expect(await (await context.request(`/exports/${job.id}`)).json()).toMatchObject({ state: 'completed', stage: 'converting', data_pages_read: 0, attempts: 2 });
    await expect(context.execute('export_job_finish', { ...claim, now: Date.now(), artifact_base64: 'bad' })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    await expect(context.execute('export_job_prepare', { ...claim, now: Date.now(), workbook_snapshot: '{}', required_permissions: '[]' })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    const file = await context.request(`/exports/${job.id}?download=true`);
    expect(readWorkbookXlsx(new Uint8Array(await file.arrayBuffer()), 10000000, 1000)['xl/worksheets/sheet0.xml']).toContain('A1*2');
    const cancel = await (await context.request(`/${book.id}/export`, 'POST')).json();
    const currentClaim = { ...claim, job_id: cancel.id, now: Date.now(), lease_until: Date.now() + 180000 };
    await context.execute('export_job_claim', currentClaim);
    await expect(context.execute('export_job_progress', { ...currentClaim, now: Date.now(), stage: 'unknown', data_pages_read: 3 })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_PROGRESS_INVALID' });
    await expect(context.execute('export_job_progress', { ...currentClaim, now: Date.now(), stage: 'preparing', data_pages_read: 1.5 })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_PROGRESS_INVALID' });
    expect((await context.request(`/exports/${cancel.id}`, 'DELETE')).status).toBe(200);
    await expect(context.execute('export_job_progress', { ...currentClaim, now: Date.now(), stage: 'preparing', data_pages_read: 3 })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    await expect(context.execute('export_job_prepare', { ...currentClaim, now: Date.now(), workbook_snapshot: '{}', required_permissions: '[]' })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    await expect(context.execute('export_job_finish', { ...currentClaim, now: Date.now(), artifact_base64: 'bad' })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    expect((await context.request(`/exports/${cancel.id}?download=true`)).status).toBe(409);
    context.definition.export_jobs!.max_artifact_bytes = 1;
    const large = await (await context.request(`/${book.id}/export`, 'POST')).json();
    await context.worker.runOnce();
    expect(await (await context.request(`/exports/${large.id}`)).json()).toMatchObject({ state: 'failed', attempts: 1 });
  } finally { context.close(); rmSync(folder, { recursive: true, force: true }); }
}, 15000);
