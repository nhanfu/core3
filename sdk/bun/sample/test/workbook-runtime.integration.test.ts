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
async function setup(path = ':memory:', definition = config()) {
  const db = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(db);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, 'workbook_test_migrations', ['schema', 'data']);
  const runtime = new WorkbookRuntime(definition, repository, auth);
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
  test('validates YAML paper dimensions, defaults and margin limits', () => {
    for (const change of [
      { default_paper: 'missing' }, { margin_mm: -1 }, { max_margin_mm: 110 }, { max_repeat_rows: -1 },
      { paper_sizes: [{ id: 'tiny', label: 'Tiny', width_mm: 0, height_mm: 297 }] },
      { paper_sizes: [config().print_page_setup!.paper_sizes[0], config().print_page_setup!.paper_sizes[0]] },
    ]) {
      const definition = config(); definition.print_page_setup = { ...definition.print_page_setup!, ...change };
      expect(() => validateWorkbookRuntime(definition)).toThrow();
    }
    const custom = config();
    custom.print_page_setup = { paper_sizes: [{ id: 'custom', label: 'Custom report', width_mm: 250, height_mm: 350 }], default_paper: 'custom', margin_mm: 0, max_margin_mm: 60, max_repeat_rows: 10 };
    expect(validateWorkbookRuntime(custom).print_page_setup).toEqual(custom.print_page_setup);
  });
  test('upgrades existing saved templates and rolls back without losing snapshots', async () => {
    const db = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(db);
    try {
      const base = Bun.YAML.parse(readFileSync(join(root, 'migrations/20260915150000-011-workbook-templates.yaml'), 'utf8')) as any;
      const migration = Bun.YAML.parse(readFileSync(join(root, 'migrations/20260915170000-013-template-version.yaml'), 'utf8')) as any;
      const shared = Bun.YAML.parse(readFileSync(join(root, 'migrations/20260915180000-014-shared-templates.yaml'), 'utf8')) as any;
      await repository.query(base.type.postgres.up, []);
      await repository.query("INSERT INTO spreadsheet_workbook_templates (id, owner_id, company_name, name, description, workbook_snapshot) VALUES ('saved_old', 'owner', 'Acme', 'Old template', '', '{}')", []);
      await repository.query(migration.type.postgres.up, []);
      expect(await repository.query('SELECT row_version, workbook_snapshot FROM spreadsheet_workbook_templates', [])).toEqual([{ row_version: 1, workbook_snapshot: '{}' }]);
      await repository.query(shared.type.postgres.up, []);
      expect(await repository.query('SELECT published, row_version, workbook_snapshot FROM spreadsheet_workbook_templates', [])).toEqual([{ published: false, row_version: 1, workbook_snapshot: '{}' }]);
      await repository.query(shared.type.postgres.down, []);
      await repository.query(migration.type.postgres.down, []);
      expect(await repository.query('SELECT name, workbook_snapshot FROM spreadsheet_workbook_templates', [])).toEqual([{ name: 'Old template', workbook_snapshot: '{}' }]);
    } finally { db.close(); }
  });
  test('saves committed templates privately and deletes them without changing created workbooks', async () => {
    const { db, request } = await setup();
    try {
      const book = (await request('', 'POST', { name: 'Source', snapshot: { sheets: [{ id: 'sheet-1', name: 'Sheet1', colNumber: 26, rowNumber: 100, cells: { A1: '10', B1: '=A1*2', C1: '=CORE3.VALUE("sales_orders","total_amount",1,"{}")' } }] } })).body;
      const route = `/${book.id}`;
      await request(`${route}/members`, 'POST', { user_id: 'editor', role: 'editor' });
      expect((await request(`${route}/template`, 'POST', { name: 'Denied', base_revision: 'START_REVISION' }, 'editor')).status).toBe(403);
      expect((await request(`${route}/template`, 'POST', { name: 'Denied', base_revision: 'START_REVISION' }, 'wrong')).status).toBe(404);
      expect((await request(`${route}/revisions`, 'POST', revision('saved-edit', 'START_REVISION', '21'))).status).toBe(200);
      expect((await request(`${route}/template`, 'POST', { name: 'Stale', base_revision: 'START_REVISION' })).status).toBe(409);
      const saved = await request(`${route}/template`, 'POST', { name: 'Saved report', description: 'Reusable formulas', base_revision: 'saved-edit', owner_id: 'editor', snapshot: {} });
      expect(saved.status).toBe(201);
      const templateId = saved.body.id;
      expect(templateId).toMatch(/^saved_/);
      expect((await request('/templates')).body.data).toContainEqual({ id: templateId, name: 'Saved report', description: 'Reusable formulas', row_version: 1, published: false, can_manage: true, can_delete: true, can_edit: true, can_publish: true });
      const edit = { name: ' Revised report ', description: '', row_version: 1, owner_id: 'editor', workbook_snapshot: '{}' };
      for (const actor of ['editor', 'wrong']) expect((await request(`/templates/${templateId}`, 'PATCH', edit, actor)).status).toBe(404);
      expect((await request(`/templates/${templateId}`, 'PATCH', edit, 'reader')).status).toBe(403);
      expect((await request('/templates/budget', 'PATCH', edit)).status).toBe(404);
      for (const invalid of [{ ...edit, name: '' }, { ...edit, description: 'x'.repeat(2001) }, { ...edit, row_version: 0 }]) expect((await request(`/templates/${templateId}`, 'PATCH', invalid)).status).toBe(422);
      const updated = await request(`/templates/${templateId}`, 'PATCH', edit);
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ id: templateId, name: 'Revised report', description: '', row_version: 2 });
      expect((await request(`/templates/${templateId}`, 'PATCH', edit)).status).toBe(409);
      expect((await request('/templates')).body.data.find((template: any) => template.id === templateId)).toMatchObject({ name: 'Revised report', description: '', row_version: 2 });
      for (const actor of ['editor', 'wrong']) {
        expect((await request('/templates', 'GET', undefined, actor)).body.data.map((template: any) => template.id)).not.toContain(templateId);
        expect((await request('', 'POST', { name: 'Denied copy', template_id: templateId }, actor)).status).toBe(404);
        expect((await request(`/templates/${templateId}`, 'DELETE', undefined, actor)).status).toBe(404);
      }
      await request(`${route}/revisions`, 'POST', revision('later-edit', 'saved-edit', '999'));
      const copy = await request('', 'POST', { name: 'Template copy', template_id: templateId });
      expect(copy.status).toBe(201);
      expect(copy.body.snapshot.sheets[0].cells).toMatchObject({ A1: '21', B1: '=A1*2', C1: '=CORE3.VALUE("sales_orders","total_amount",1,"{}")' });
      expect(copy.body.head_sequence).toBe(0);
      expect((await request(`${route}/template`, 'POST', { name: '', base_revision: 'later-edit' })).status).toBe(422);
      await request(route, 'PATCH', { archived: true, row_version: (await request(route)).body.row_version });
      expect((await request(`${route}/template`, 'POST', { name: 'Archived', base_revision: 'later-edit' })).status).toBe(403);
      expect((await request(`/templates/${templateId}`, 'DELETE')).status).toBe(200);
      expect((await request('', 'POST', { name: 'Deleted', template_id: templateId })).status).toBe(404);
      expect((await request(`/${copy.body.id}`)).body.snapshot.sheets[0].cells.A1).toBe('21');
      expect((await request(`/templates/budget`, 'DELETE')).status).toBe(404);
    } finally { db.close(); }
  }, 15000);
  test('publishes templates within a company and withdraws future reuse without changing existing copies', async () => {
    const { db, request } = await setup();
    try {
      const source = (await request('', 'POST', { name: 'Private source', snapshot: { sheets: [{ id: 's', name: 'Sheet1', colNumber: 26, rowNumber: 100, cells: { A1: '21', B1: '=A1*2' } }] } })).body;
      const saved = (await request(`/${source.id}/template`, 'POST', { name: 'Company budget', description: 'Reusable', base_revision: 'START_REVISION', published: true })).body;
      const route = `/templates/${saved.id}`;
      const list = async (actor: string) => (await request('/templates', 'GET', undefined, actor)).body.data.find((item: any) => item.id === saved.id);
      expect(await list('editor')).toBeUndefined();
      const publish = { published: true, row_version: 1, company_name: 'Other company', owner_id: 'editor' };
      for (const actor of ['editor', 'wrong']) expect((await request(route, 'POST', publish, actor)).status).toBe(404);
      expect((await request(route, 'POST', publish, 'reader')).status).toBe(403);
      expect((await request('/templates/budget', 'POST', publish)).status).toBe(404);
      expect((await request(route, 'POST', { ...publish, published: 'true' })).status).toBe(422);
      expect((await request(route, 'POST', publish)).body).toMatchObject({ published: true, row_version: 2 });
      expect((await request(route, 'POST', publish)).status).toBe(409);
      expect(await list('wrong')).toBeUndefined();
      expect(await list('editor')).toMatchObject({ published: true, can_manage: false, can_edit: false, can_delete: false, can_publish: false });
      expect(JSON.stringify(await list('editor'))).not.toContain('snapshot');
      expect((await request(`/${source.id}`, 'GET', undefined, 'editor')).status).toBe(404);
      expect((await request('', 'POST', { name: 'Denied', template_id: saved.id }, 'wrong')).status).toBe(404);
      expect((await request(route, 'PATCH', { name: 'Forged', description: '', row_version: 2 }, 'editor')).status).toBe(404);
      expect((await request(route, 'DELETE', undefined, 'editor')).status).toBe(404);
      const copy = await request('', 'POST', { name: 'My copy', template_id: saved.id, owner_id: 'owner', visibility: 'internal' }, 'editor');
      expect(copy.status).toBe(201);
      expect(copy.body.owner_id).toBe('editor');
      expect(copy.body.snapshot.sheets[0].cells).toMatchObject({ A1: '21', B1: '=A1*2' });
      expect((await request(`/${copy.body.id}`, 'GET')).status).toBe(404);
      expect((await request(route, 'POST', { published: false, row_version: 2 })).body).toMatchObject({ published: false, row_version: 3 });
      expect(await list('editor')).toBeUndefined();
      expect((await request('', 'POST', { name: 'Withdrawn', template_id: saved.id }, 'editor')).status).toBe(404);
      expect((await request(`/${copy.body.id}`, 'GET', undefined, 'editor')).body.snapshot.sheets[0].cells.B1).toBe('=A1*2');
      expect((await request('', 'POST', { name: 'Owner reuse', template_id: saved.id })).status).toBe(201);
    } finally { db.close(); }
  }, 15000);
  test('creates private independent workbooks from authorized YAML templates', async () => {
    const definition = config();
    definition.templates!.restricted = { ...definition.templates!.budget, permission: 'restricted.template' };
    const { db, request } = await setup(':memory:', definition);
    try {
      const listed = await request('/templates');
      expect(listed.body.data).toContainEqual({ id: 'budget', name: 'Budget planner', description: expect.any(String) });
      expect(JSON.stringify(listed.body)).not.toContain('snapshot');
      expect(listed.body.data.map((template: any) => template.id)).not.toContain('restricted');
      expect((await request('', 'POST', { name: 'Restricted', template_id: 'restricted' })).status).toBe(404);
      expect((await request('/templates', 'GET', undefined, 'reader')).status).toBe(403);
      expect((await request('', 'POST', { name: 'Denied', template_id: 'budget' }, 'reader')).status).toBe(403);
      expect((await request('', 'POST', { name: 'Missing', template_id: 'missing' })).status).toBe(404);
      expect((await request('', 'POST', { name: 'Conflict', template_id: 'budget', snapshot: {} })).status).toBe(422);
      const first = await request('', 'POST', { name: 'First budget', template_id: 'budget', owner_id: 'editor', company_name: 'Other' });
      expect(first.status).toBe(201);
      expect(first.body.snapshot.sheets[0].cells.D2).toBe('=B2-C2');
      expect((await request(`/${first.body.id}`, 'GET', undefined, 'editor')).status).toBe(404);
      await request(`/${first.body.id}/members`, 'POST', { user_id: 'editor', role: 'reader' });
      expect((await request(`/${first.body.id}/print`, 'GET', undefined, 'editor')).status).toBe(403);
      await request(`/${first.body.id}/revisions`, 'POST', revision('budget-edit', 'START_REVISION', 'Changed'));
      const second = await request('', 'POST', { name: 'Second budget', template_id: 'budget' });
      expect(second.status).toBe(201);
      expect(second.body.id).not.toBe(first.body.id);
      expect(second.body.snapshot.sheets[0].cells.A1).toBe('Category');
      expect(second.body.head_sequence).toBe(0);
    } finally { db.close(); }
  }, 15000);
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
      const template = await state.request(`${route}/template`, 'POST', { name: 'Persistent template', base_revision: 'revision-1' });
      expect(template.status).toBe(201);
      state.runtime.dispose();
      runtimes.delete(state.runtime);
      state.db.close();
      state = await setup(path);
      const restored = await state.request(route);
      expect(restored.body.head_revision_id).toBe('revision-1');
      expect(restored.body.revisions).toHaveLength(1);
      expect(restored.body.revisions[0].commands[0].content).toBe('42');
      expect((await state.request(`${route}/revisions`, 'POST', revision())).body.replayed).toBe(true);
      expect((await state.request('/templates')).body.data.map((entry: any) => entry.id)).toContain(template.body.id);
    } finally {
      state.db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  }, 15000); // Includes disk migration/reopen and engine worker startup; not a performance gate.

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
