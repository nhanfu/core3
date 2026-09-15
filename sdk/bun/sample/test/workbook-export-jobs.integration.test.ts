import { expect, test } from 'bun:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import { migrateDatabase } from '@core3/server/migrations';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';
import { WorkbookFileJobs } from '@core3/server/workbook-file-jobs';
import { readWorkbookXlsx } from '@core3/client/spreadsheet/files';

const root = join(import.meta.dir, '../services/spreadsheet');
const auth = {
  resolveBackgroundUser: async (id: string, company: string) => ({ sub: id, company_name: company, permissions: ['spreadsheet.read', 'spreadsheet.export'] }),
  getCurrentUser: async (request: Request) => {
    const actor = request.headers.get('Authorization') || 'owner';
    return { sub: actor === 'wrong' ? 'owner' : actor, company_name: actor === 'wrong' ? 'Other' : 'Acme', permissions: actor === 'denied' ? ['spreadsheet.read'] : ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export'] };
  },
  hasPermission: (user: any, permission: string) => user.permissions.includes(permission),
};
async function setup(path = ':memory:') {
  const definition = validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(root, 'workbooks.yaml'), 'utf8')));
  definition.import_jobs!.poll_ms = definition.export_jobs!.poll_ms = 600000;
  const db = await DuckDbDatabase.open(path), repository = new YamlRepository(db);
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
    context.close(); context = await setup(join(folder, 'exports.duckdb'));
    await context.worker.runOnce();
    expect(await (await context.request(`/exports/${job.id}`)).json()).toMatchObject({ state: 'completed', attempts: 2 });
    await expect(context.execute('export_job_finish', { ...claim, now: Date.now(), artifact_base64: 'bad' })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    await expect(context.execute('export_job_prepare', { ...claim, now: Date.now(), workbook_snapshot: '{}', required_permissions: '[]' })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    const file = await context.request(`/exports/${job.id}?download=true`);
    expect(readWorkbookXlsx(new Uint8Array(await file.arrayBuffer()), 10000000, 1000)['xl/worksheets/sheet0.xml']).toContain('A1*2');
    const cancel = await (await context.request(`/${book.id}/export`, 'POST')).json();
    const currentClaim = { ...claim, job_id: cancel.id, now: Date.now(), lease_until: Date.now() + 180000 };
    await context.execute('export_job_claim', currentClaim);
    expect((await context.request(`/exports/${cancel.id}`, 'DELETE')).status).toBe(200);
    await expect(context.execute('export_job_prepare', { ...currentClaim, now: Date.now(), workbook_snapshot: '{}', required_permissions: '[]' })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    await expect(context.execute('export_job_finish', { ...currentClaim, now: Date.now(), artifact_base64: 'bad' })).rejects.toMatchObject({ code: 'WORKBOOK_EXPORT_LEASE_LOST' });
    expect((await context.request(`/exports/${cancel.id}?download=true`)).status).toBe(409);
    context.definition.export_jobs!.max_artifact_bytes = 1;
    const large = await (await context.request(`/${book.id}/export`, 'POST')).json();
    await context.worker.runOnce();
    expect(await (await context.request(`/exports/${large.id}`)).json()).toMatchObject({ state: 'failed', attempts: 1 });
  } finally { context.close(); rmSync(folder, { recursive: true, force: true }); }
}, 15000);
