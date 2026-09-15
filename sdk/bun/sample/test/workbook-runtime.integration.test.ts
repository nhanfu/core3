import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';
import { createYamlHostApi } from '@core3/server/routes/yaml-host-api';
import { readWorkbookXlsx } from '@core3/client/spreadsheet/files';

const root = join(import.meta.dir, '../services/spreadsheet');
const runtimes = new Set<WorkbookRuntime>();
afterEach(() => { for (const runtime of runtimes) runtime.dispose(); runtimes.clear(); });
const config = () => validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(root, 'workbooks.yaml'), 'utf8')));
const users: Record<string, any> = {
  owner: { sub: 'owner', name: 'Owner', company_name: 'Acme', permissions: ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export'] },
  editor: { sub: 'editor', name: 'Editor', company_name: 'Acme', permissions: ['spreadsheet.read', 'spreadsheet.write'] },
  reader: { sub: 'reader', name: 'Reader', company_name: 'Acme', permissions: ['spreadsheet.read'] },
  other: { sub: 'other', company_name: 'Acme', permissions: ['spreadsheet.read', 'spreadsheet.write'] },
  wrong: { sub: 'owner', company_name: 'Other company', permissions: ['spreadsheet.read', 'spreadsheet.write'] },
};
const auth = {
  getCurrentUser: async (request: Request) => {
    const user = users[request.headers.get('Authorization')?.replace('Bearer ', '') || ''];
    if (!user) throw new Error('Unauthorized');
    return user;
  },
  hasPermission: (user: any, permission: string) => user.permissions.includes(permission),
};
async function setup(path = ':memory:') {
  const db = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(db);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, 'workbook_test_migrations', ['schema', 'data']);
  const runtime = new WorkbookRuntime(config(), repository, auth);
  runtimes.add(runtime);
  const request = async (path = '', method = 'GET', body?: any, user = 'owner') => {
    const url = new URL(`http://workbook.test${config().endpoint}${path}`);
    const response = await runtime.handle(new Request(url, { method, headers: { Authorization: `Bearer ${user}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), url);
    return { status: response!.status, body: await response!.json() };
  };
  return { db, repository, runtime, request };
}
const revision = (id = 'revision-1', base = 'START_REVISION', content = '42', actor = 'owner') => ({
  type: 'REMOTE_REVISION', version: 1, clientId: `${createHash('sha256').update(actor).digest('hex')}-client`, serverRevisionId: base, nextRevisionId: id,
  commands: [{ type: 'UPDATE_CELL', sheetId: 'sheet-1', col: 0, row: 0, content }],
});

describe('YAML-owned workbook persistence and revision protocol', () => {
  test('links company dashboards only to an owned active workbook without granting viewer access', async () => {
    const { db, request, repository } = await setup();
    try {
      await repository.query("UPDATE spreadsheet_dashboard_groups SET company_name = 'Acme' WHERE id = 'sdg-acme'", []);
      await repository.query("UPDATE spreadsheet_dashboards SET company_name = 'Acme' WHERE id = 'sdb-acme'", []);
      const api = Bun.YAML.parse(readFileSync(join(root, 'api/dashboard.yaml'), 'utf8')) as any;
      const action = api.actions.find((item: any) => item.id === 'link_spreadsheet_dashboard_workbook');
      expect(action.permission).toBe('spreadsheet.manage');
      const workbook = (await request('', 'POST', { name: 'Dashboard source' })).body;
      const params = { id: 'sdb-acme', workbook_id: workbook.id, expected_row_version: 1, company_name: 'Acme', current_user_id: 'owner' };
      await expect(repository.executeMutation(action.mutation, { ...params, current_user_id: 'editor' })).rejects.toMatchObject({ status: 403 });
      await expect(repository.executeMutation(action.mutation, { ...params, company_name: 'Other' })).rejects.toMatchObject({ status: 403 });
      expect(await repository.executeMutation(action.mutation, params)).toMatchObject({ workbook_id: workbook.id, row_version: 2 });
      await expect(repository.executeMutation(action.mutation, params)).rejects.toMatchObject({ status: 409 });
      const source = (Bun.YAML.parse(readFileSync(join(root, 'api/dashboards.yaml'), 'utf8')) as any).datasources.find((item: any) => item.id === 'spreadsheet_dashboard_workbooks');
      const rows = (await repository.querySource(source, { company_name: 'Acme' }, 0, 100)).data;
      expect(rows.find((row: any) => row.id === 'sdb-acme')).toMatchObject({ workbook_id: workbook.id, workbook_snapshot: null });
      expect((await request(`/${workbook.id}`, 'GET', undefined, 'reader')).status).toBe(404);
      await request(`/${workbook.id}/members`, 'POST', { user_id: 'reader', role: 'reader' });
      expect((await request(`/${workbook.id}`, 'GET', undefined, 'reader')).status).toBe(200);
      await repository.query('UPDATE spreadsheet_workbooks SET archived = TRUE WHERE id = ?', [workbook.id]);
      await expect(repository.executeMutation(action.mutation, { ...params, expected_row_version: 2 })).rejects.toMatchObject({ status: 403 });
      expect((await request(`/${workbook.id}`, 'GET', undefined, 'reader')).body.archived).toBe(true);
    } finally { db.close(); }
  });
  test('preserves live formulas and refuses unresolved server export or publication', async () => {
    const { db, request } = await setup();
    try {
      const formula = '=CORE3.VALUE("sales_orders","total_amount",1,"{}")';
      const created = await request('', 'POST', { name: 'Linked values', snapshot: { sheets: [{ id: 's', name: 'Sheet1', rowNumber: 100, colNumber: 26, cells: { A1: formula } }] } });
      expect(created.status).toBe(201);
      expect(created.body.snapshot.sheets[0].cells.A1).toBe(formula);
      expect((await request(`/${created.body.id}/export`)).status).toBe(422);
      expect((await request(`/${created.body.id}/shares`, 'POST', { base_revision: 'START_REVISION' })).status).toBe(422);
    } finally { db.close(); }
  });
  test('publishes immutable formula values with hashed expiring revocable tokens', async () => {
    const { db, request, repository } = await setup();
    try {
      const book = await request('', 'POST', { name: 'Shared forecast', snapshot: { sheets: [{ id: 'sheet-1', name: 'Sheet1', rowNumber: 100, colNumber: 26, cells: { A1: '=40+2', B1: '=SEQUENCE(2)', C1: "'=literal" } }] } });
      const path = `/${book.body.id}`;
      await request(`${path}/members`, 'POST', { user_id: 'editor', role: 'editor' });
      expect((await request(`${path}/shares`, 'POST', { base_revision: 'START_REVISION' }, 'editor')).status).toBe(403);
      const created = await request(`${path}/shares`, 'POST', { base_revision: 'START_REVISION', days: 2 });
      expect(created.status).toBe(201);
      const share = created.body;
      expect(share.token).toHaveLength(43);
      const [stored] = await repository.query('SELECT token_hash FROM spreadsheet_workbook_shares WHERE id = ?', [share.id]);
      expect(stored.token_hash).not.toBe(share.token);
      const published = (await request(`/public/${share.token}`, 'GET', undefined, '')).body;
      expect(published.snapshot.sheets[0].cells).toMatchObject({ A1: '42', B1: '1', B2: '2', C1: "=\"'=literal\"" });
      await request(`${path}/revisions`, 'POST', revision('new-value', 'START_REVISION', '99'));
      expect((await request(`/public/${share.token}`, 'GET', undefined, '')).body).toEqual(published);
      expect((await request(`${path}/shares`, 'DELETE', { share_id: share.id })).status).toBe(200);
      expect((await request(`/public/${share.token}`, 'GET', undefined, '')).status).toBe(404);
      const expiring = await request(`${path}/shares`, 'POST', { base_revision: 'new-value' });
      await repository.query("UPDATE spreadsheet_workbook_shares SET expires_at = TIMESTAMP '2000-01-01' WHERE id = ?", [expiring.body.id]);
      expect((await request(`/public/${expiring.body.token}`, 'GET', undefined, '')).status).toBe(404);
    } finally { db.close(); }
  });
  test('exports committed formulas as XLSX and imports into a new private workbook', async () => {
    const { db, request, runtime } = await setup();
    const raw = async (path: string, method = 'GET', body?: Uint8Array, user = 'owner') => {
      const url = new URL(`http://workbook.test${config().endpoint}${path}`);
      return (await runtime.handle(new Request(url, { method, headers: { Authorization: `Bearer ${user}`, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: body as any }), url))!;
    };
    try {
      const created = await request('', 'POST', { name: 'Exported workbook' });
      const path = `/${created.body.id}`;
      await request(`${path}/revisions`, 'POST', revision('formula', 'START_REVISION', '=40+2'));
      await request(`${path}/members`, 'POST', { user_id: 'editor', role: 'editor' });
      expect((await raw(`${path}/export`, 'GET', undefined, 'editor')).status).toBe(403);
      expect((await raw(`${path}/export`, 'GET', undefined, 'wrong')).status).toBe(404);
      const response = await raw(`${path}/export`);
      expect(response.status).toBe(200);
      expect(response.headers.get('x-workbook-revision')).toBe('formula');
      const bytes = new Uint8Array(await response.arrayBuffer());
      const parts = readWorkbookXlsx(bytes, 10000000, 1000);
      expect(parts['xl/worksheets/sheet0.xml']).toContain('40+2');
      expect((await raw('?name=Denied', 'POST', bytes, 'reader')).status).toBe(403);
      const imported = await raw('?name=Imported', 'POST', bytes);
      expect(imported.status).toBe(201);
      const copy = await imported.json();
      expect(copy.id).not.toBe(created.body.id);
      expect(copy.snapshot.sheets[0].cells.A1).toBe('=40+2');
      expect(copy.visibility).toBe('private');
      expect(copy.head_sequence).toBe(0);
      expect((await raw('?name=Broken', 'POST', new Uint8Array([1, 2, 3]))).status).toBe(422);
    } finally { db.close(); }
  });
  test('deduplicates acknowledged undo retries after a saved-version boundary', async () => {
    const { db, request } = await setup();
    try {
      const created = await request('', 'POST', { name: 'Undo retry' });
      const path = `/${created.body.id}`;
      await request(`${path}/revisions`, 'POST', revision());
      const undo = { version: 1, serverRevisionId: 'revision-1', nextRevisionId: 'undo', type: 'REVISION_UNDONE', undoneRevisionId: 'revision-1' };
      await request(`${path}/members`, 'POST', { user_id: 'editor', role: 'editor' });
      expect((await request(`${path}/revisions`, 'POST', undo, 'editor')).status).toBe(403);
      expect((await request(`${path}/revisions`, 'POST', undo)).status).toBe(200);
      expect((await request(`${path}/checkpoint`, 'POST', { base_revision: 'undo', label: 'After undo' })).status).toBe(200);
      const retried = await request(`${path}/revisions`, 'POST', undo);
      expect(retried.status).toBe(200);
      expect(retried.body.replayed).toBe(true);
    } finally { db.close(); }
  });
  test('restores verified versions as new revisions and preserves the replaced head', async () => {
    const { db, request } = await setup();
    try {
      const created = await request('', 'POST', { name: 'Restorable' });
      const path = `/${created.body.id}`;
      await request(`${path}/members`, 'POST', { user_id: 'editor', role: 'editor' });
      await request(`${path}/revisions`, 'POST', revision('before-restore', 'START_REVISION', '88'));
      const body = { revision_id: 'START_REVISION', base_revision: 'before-restore' };
      expect((await request(`${path}/restore`, 'POST', body, 'editor')).status).toBe(403);
      const restored = await request(`${path}/restore`, 'POST', body);
      expect(restored.status).toBe(200);
      const loaded = (await request(path)).body;
      expect(loaded.head_sequence).toBe(2);
      expect(loaded.snapshot.sheets[0].cells.A1).toBeUndefined();
      expect(loaded.revisions).toEqual([]);
      expect((await request(`${path}/restore`, 'POST', body)).status).toBe(409);
      const history = (await request(`${path}/history`)).body.data;
      expect(history.find((v: any) => v.revision_id === 'before-restore').verified).toBe(true);
      const revertRestore = await request(`${path}/restore`, 'POST', { revision_id: 'before-restore', base_revision: loaded.head_revision_id });
      expect(revertRestore.status).toBe(200);
      const restoredAgain = (await request(path)).body;
      expect(restoredAgain.snapshot.sheets[0].cells.A1).toBe('88');
      expect((await request(`${path}/revisions`, 'POST', revision('continued', restoredAgain.head_revision_id, '=8+9'))).status).toBe(200);
    } finally { db.close(); }
  });
  test('rejects semantic errors and evicts partially changed engine state', async () => {
    const { db, request } = await setup();
    try {
      const created = await request('', 'POST', { name: 'Atomic validation' });
      const path = `/${created.body.id}`;
      const invalid = revision('invalid');
      invalid.commands[0].col = 1;
      invalid.commands.push({ ...invalid.commands[0], sheetId: 'missing-sheet' });
      const rejected = await request(`${path}/revisions`, 'POST', invalid);
      expect(rejected.status).toBe(422);
      expect((await request(path)).body.head_sequence).toBe(0);
      expect((await request(`${path}/revisions`)).body.data).toEqual([]);
      expect((await request(`${path}/revisions`, 'POST', revision('valid', 'START_REVISION', '7'))).status).toBe(200);
      const loaded = await request(path);
      expect(loaded.body.head_sequence).toBe(1);
      expect(loaded.body.revisions).toHaveLength(1);
      expect(loaded.body.revisions[0].commands[0].content).toBe('7');
      expect((await request(`${path}/checkpoint`, 'POST', { base_revision: 'valid' })).status).toBe(200);
      const saved = (await request(path)).body.snapshot;
      expect(saved.sheets[0].cells.A1).toBe('7');
      expect(saved.sheets[0].cells.B1).toBeUndefined();
    } finally { db.close(); }
  });
  test('creates a private company-bound workbook and refuses identity spoofing', async () => {
    const { db, request } = await setup();
    try {
      expect((await request('', 'POST', { name: 'Budget' }, '')).status).toBe(401);
      expect((await request('', 'POST', { name: 'Budget' }, 'reader')).status).toBe(403);
      const created = await request('', 'POST', { name: 'Budget', owner_id: 'other', company_name: 'Other company' });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ name: 'Budget', owner_id: 'owner', company_name: 'Acme', head_sequence: 0, snapshot: { revisionId: 'START_REVISION' } });
      const path = `/${created.body.id}`;
      expect((await request(path, 'GET', undefined, 'other')).status).toBe(404);
      expect((await request(`${path}?company_name=Acme`, 'GET', undefined, 'wrong')).status).toBe(404);
      expect((await request('', 'GET', undefined, 'other')).body.data).toEqual([]);
      expect((await request(path)).body.can_edit).toBe(true);
    } finally { db.close(); }
  });

  test('commits before acknowledgement, deduplicates retries, and rejects concurrent stale edits atomically', async () => {
    const { db, request, repository } = await setup();
    try {
      const created = await request('', 'POST', { name: 'Concurrent workbook' });
      const path = `/${created.body.id}`;
      const contenders = await Promise.all([
        request(`${path}/revisions`, 'POST', revision('a')),
        request(`${path}/revisions`, 'POST', revision('b')),
      ]);
      expect(contenders.map(result => result.status).sort()).toEqual([200, 409]);
      const accepted = contenders.find(result => result.status === 200)!.body;
      expect(accepted.sequence).toBe(1);
      const rows = await repository.query('SELECT sequence, body FROM spreadsheet_workbook_revisions');
      expect(rows).toHaveLength(1);
      expect(JSON.parse(rows[0].body).nextRevisionId).toBe(accepted.message.nextRevisionId);
      const retried = await request(`${path}/revisions`, 'POST', revision(accepted.message.nextRevisionId));
      expect(retried.body).toMatchObject({ replayed: true, sequence: 1 });
      expect((await request(`${path}/revisions`, 'POST', revision(accepted.message.nextRevisionId, 'START_REVISION', 'different'))).status).toBe(409);
      const loaded = await request(path);
      expect(loaded.body.head_sequence).toBe(1);
      expect(loaded.body.revisions).toHaveLength(1);
      expect((await request(`${path}/revisions?after=1`)).body.data).toEqual([]);
      expect((await request(`${path}/revisions?after=-1`)).status).toBe(422);
    } finally { db.close(); }
  });

  test('enforces reader/editor membership, removal, archiving, metadata CAS, and owner-only access management', async () => {
    const { db, request } = await setup();
    try {
      const created = await request('', 'POST', { name: 'Shared budget' });
      const path = `/${created.body.id}`;
      expect((await request(`${path}/members`, 'POST', { user_id: 'editor', role: 'editor' })).status).toBe(200);
      expect((await request(`${path}/members`, 'POST', { user_id: 'reader', role: 'reader' })).status).toBe(200);
      expect((await request(path, 'GET', undefined, 'reader')).body.can_edit).toBe(false);
      expect((await request(`${path}/revisions`, 'POST', revision(), 'reader')).status).toBe(403);
      expect((await request(`${path}/members`, 'POST', { user_id: 'other', role: 'editor' }, 'editor')).status).toBe(403);
      expect((await request(`${path}/revisions`, 'POST', revision(), 'editor')).status).toBe(403);
      expect((await request(`${path}/revisions`, 'POST', revision('revision-1', 'START_REVISION', '42', 'editor'), 'editor')).status).toBe(200);
      expect((await request(`${path}/members`, 'DELETE', { user_id: 'editor' })).status).toBe(200);
      expect((await request(`${path}/revisions?after=0`, 'GET', undefined, 'editor')).status).toBe(404);
      expect((await request(path, 'PATCH', { name: 'Renamed', row_version: 1 })).status).toBe(200);
      expect((await request(path, 'PATCH', { name: 'Stale', row_version: 1 })).status).toBe(409);
      expect((await request(path, 'PATCH', { archived: true, row_version: 2 })).status).toBe(200);
      expect((await request(`${path}/revisions`, 'POST', revision('next', 'revision-1'))).status).toBe(403);
      expect((await request()).body.data).toEqual([]);
      expect((await request('?archived=true')).body.data).toHaveLength(1);
      expect((await request(path, 'PATCH', { archived: false, row_version: 3 })).status).toBe(200);
    } finally { db.close(); }
  });

  test('rejects malformed revisions and prevents a browser checkpoint from replacing acknowledged state', async () => {
    const { db, request } = await setup();
    try {
      const created = await request('', 'POST', { name: 'Validated workbook' });
      const path = `/${created.body.id}`;
      expect((await request(`${path}/revisions`, 'POST', { ...revision(), commands: [null] })).status).toBe(422);
      expect((await request(`${path}/revisions`, 'POST', { ...revision(), commands: [{ type: 'UNKNOWN_COMMAND' }] })).status).toBe(422);
      expect((await request(`${path}/revisions`, 'POST', revision('START_REVISION'))).status).toBe(422);
      expect((await request(`${path}/revisions`, 'POST', { ...revision(), type: 'SNAPSHOT_CREATED' })).status).toBe(422);
      expect((await request(`${path}/revisions`, 'POST', revision())).status).toBe(200);
      const candidate = { ...created.body.snapshot, sheets: [{ id: 'sheet-1', name: 'Sheet1', rowNumber: 100, colNumber: 26, cells: { A1: 'wrong snapshot' } }] };
      const checkpoint = await request(`${path}/checkpoint`, 'POST', { base_revision: 'revision-1', snapshot: candidate });
      expect(checkpoint.status).toBe(200);
      expect(checkpoint.body.verified).toBe(true);
      const loaded = await request(path);
      expect(loaded.body.snapshot.sheets[0].cells.A1).toBe('42');
      expect(loaded.body.revisions).toEqual([]);
      expect(loaded.body.snapshot_sequence).toBe(2);
      const undo = { ...revision('undo', loaded.body.head_revision_id), type: 'REVISION_UNDONE', undoneRevisionId: 'revision-1' };
      expect((await request(`${path}/revisions`, 'POST', undo)).status).toBe(409);
      expect((await request(`${path}/revisions`, 'POST', revision('after-checkpoint', loaded.body.head_revision_id, '=2+3'))).status).toBe(200);
      expect((await request(`${path}/checkpoint`, 'POST', { base_revision: 'stale', snapshot: candidate })).status).toBe(409);
      expect((await request(`${path}/history`)).body.data).toHaveLength(2);
    } finally { db.close(); }
  });

  test('reopens the on-disk database and replays exactly the acknowledged revisions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'core3-workbook-'));
    if (dirname(resolve(dir)) !== resolve(tmpdir()) || !basename(dir).startsWith('core3-workbook-')) throw new Error('Unexpected test cleanup directory');
    const path = join(dir, 'workbooks.duckdb');
    let state = await setup(path);
    try {
      const created = await state.request('', 'POST', { name: 'Durable workbook' });
      const route = `/${created.body.id}`;
      expect((await state.request(`${route}/revisions`, 'POST', revision())).status).toBe(200);
      state.db.close();
      state = await setup(path);
      const restored = await state.request(route);
      expect(restored.body.head_revision_id).toBe('revision-1');
      expect(restored.body.revisions).toHaveLength(1);
      expect(restored.body.revisions[0].commands[0].content).toBe('42');
      expect((await state.request(`${route}/revisions`, 'POST', revision())).body.replayed).toBe(true);
    } finally {
      state.db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('routes declared workbook prefixes through the aggregate API without losing 404 or 401', async () => {
    const { db, runtime } = await setup();
    try {
      const api = createYamlHostApi([{ id: 'spreadsheet', routePrefixes: [config().endpoint], api: runtime.handle, pages: new Map(), datasources: new Map(), menus: new Map(), actions: new Map(), storage: {} }]);
      const missing = new URL(`http://workbook.test${config().endpoint}/missing`);
      expect((await api(new Request(missing), missing))?.status).toBe(401);
      expect((await api(new Request(missing, { headers: { Authorization: 'Bearer owner' } }), missing))?.status).toBe(404);
    } finally { db.close(); }
  });
});
