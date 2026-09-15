import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { createYamlSourceReader } from '@core3/server/yaml-source-reader';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';

test('links Documents through its own API without granting access and follows document workflow changes', async () => {
  const root = join(import.meta.dir, '../services');
  const yaml = (path: string) => Bun.YAML.parse(readFileSync(join(root, path), 'utf8')) as any;
  const db = await DuckDbDatabase.open(':memory:'), documentsDb = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(db), documentsRepository = new YamlRepository(documentsDb);
  let runtime: WorkbookRuntime | undefined;
  try {
    await migrateDatabase(repository, join(root, 'spreadsheet/migrations'), undefined, 'workbook_documents_test', ['schema', 'data']);
    await migrateDatabase(documentsRepository, join(root, 'documents/migrations'), undefined, 'documents_test', ['schema', 'data']);
    await documentsRepository.query("INSERT INTO documents (id, name) VALUES ('doc-one', 'Budget approval'), ('doc-two', 'Second document')", []);
    const workbookPermissions = ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export'];
    const documentPermissions = ['documents.read', 'documents.write', 'documents.manage'];
    const users: Record<string, any> = {
      owner: { sub: 'owner', company_name: 'Acme', permissions: [...workbookPermissions, ...documentPermissions] },
      editor: { sub: 'editor', company_name: 'Acme', permissions: [...workbookPermissions, 'documents.read'] },
      nodocs: { sub: 'nodocs', company_name: 'Acme', permissions: workbookPermissions },
      wrong: { sub: 'owner', company_name: 'Other', permissions: [...workbookPermissions, ...documentPermissions] },
    };
    const auth = {
      async getCurrentUser(request: Request) { const user = users[request.headers.get('authorization')?.replace('Bearer ', '') || '']; if (!user) throw new Error('Unauthorized'); return user; },
      hasPermission: (user: any, permission: string) => user.permissions.includes(permission),
    };
    const page = yaml('documents/pages/documents.yaml');
    let denied = false;
    const documentsApi = createYamlApi({ repository: documentsRepository,
      authProvider: { ...auth, hasPermission: (user: any, permission: string) => !denied && auth.hasPermission(user, permission) },
      sources: new Map(page.datasources.map((source: any) => [source.id, source])), pageSources: new Map(), pages: new Map([['documents', page]]),
      workflows: new Map([['documents', yaml('documents/pages/document-workflow.yaml').workflow]]), workflowFiles: new Map(),
      catalogs: new Map(), menus: new Map(), permissions: yaml('documents/permissions.yaml'), uploadRoot: '', eventStore: {}, topics: {},
    });
    const reader = createYamlSourceReader(documentsApi);
    const definition = validateWorkbookRuntime(yaml('spreadsheet/workbooks.yaml'));
    definition.documents!.max_links = 1;
    runtime = new WorkbookRuntime(definition, repository, auth, service => { expect(service).toBe('documents'); return reader; });
    const request = async (path = '', method = 'GET', body?: any, actor = 'owner') => {
      const url = new URL(`http://documents.test${definition.endpoint}${path}`);
      const response = (await runtime!.handle(new Request(url, { method, headers: { Authorization: `Bearer ${actor}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), url))!;
      return { status: response.status, body: await response.json() };
    };
    const transition = async (operation: string, version: number, actor = 'owner') => {
      const url = new URL(`http://documents.test/api/actions/documents.${operation}`);
      return documentsApi(new Request(url, { method: 'POST', headers: { Authorization: `Bearer ${actor}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'doc-one', expected_row_version: version }) }), url);
    };
    const book = (await request('', 'POST', { name: 'Private budget' })).body;
    const path = `/${book.id}`;
    expect((await request(`${path}/documents?candidates=true&q=Budget`)).body.data).toEqual([{ id: 'doc-one', name: 'Budget approval', state: 'Draft' }]);
    expect((await request(`${path}/documents`, 'POST', { document_id: 'missing' })).status).toBe(404);
    expect((await request(`${path}/documents`, 'POST', { document_id: 'doc-one', owner_id: 'editor' })).status).toBe(200);
    expect((await repository.query('SELECT created_by FROM spreadsheet_workbook_documents WHERE workbook_id = ?', [book.id]))[0].created_by).toBe('owner');
    const editorBook = await request('', 'POST', { name: 'Editor-owned workbook' }, 'editor');
    expect(editorBook.status).toBe(201);
    expect((await request(`/${editorBook.body.id}/documents`, 'POST', { document_id: 'doc-one' }, 'editor')).status).toBe(403);
    expect((await request(`${path}/documents`, 'POST', { document_id: 'doc-one' })).status).toBe(200);
    expect((await request(`${path}/documents`, 'POST', { document_id: 'doc-two' })).body.code).toBe('WORKBOOK_DOCUMENT_LIMIT');
    expect((await request('?document_id=doc-one')).body.data.map((row: any) => row.id)).toEqual([book.id]);
    expect((await request('?document_id=doc-one', 'GET', undefined, 'editor')).body.data).toEqual([]);
    expect((await request('?document_id=doc-one', 'GET', undefined, 'wrong')).body.data).toEqual([]);
    await request(`${path}/members`, 'POST', { user_id: 'editor', role: 'editor' });
    await request(`${path}/members`, 'POST', { user_id: 'nodocs', role: 'reader' });
    expect((await request(`${path}/documents`, 'GET', undefined, 'editor')).body.data[0].name).toBe('Budget approval');
    expect((await request(`${path}/documents`, 'POST', { document_id: 'doc-two' }, 'editor')).status).toBe(403);
    expect((await request(`${path}/documents`, 'DELETE', { document_id: 'doc-one' }, 'editor')).status).toBe(403);
    expect((await request(`${path}/documents`, 'GET', undefined, 'nodocs')).status).toBe(403);
    expect((await request('?document_id=doc-one', 'GET', undefined, 'nodocs')).status).toBe(403);
    expect((await request('?document_id=doc-one', 'GET', undefined, 'editor')).body.data.map((row: any) => row.id)).toEqual([book.id]);
    expect(await (await transition('submit', 1))!.json()).toMatchObject({ state: 'Submitted', row_version: 2 });
    await expect(transition('approve', 2, 'editor')).rejects.toMatchObject({ status: 403 });
    expect(await (await transition('approve', 2))!.json()).toMatchObject({ state: 'Approved', row_version: 3 });
    await expect(transition('archive', 2)).rejects.toMatchObject({ status: 409 });
    expect((await request(`${path}/documents`)).body.data[0].state).toBe('Approved');
    denied = true;
    expect((await request(`${path}/documents`)).status).toBe(403);
    expect((await request('?document_id=doc-one')).status).toBe(403);
    denied = false;
    expect(await (await transition('archive', 3))!.json()).toMatchObject({ state: 'Archived', row_version: 4 });
    expect((await request('?document_id=doc-one')).status).toBe(404);
    expect((await request(`${path}/documents`)).body.data).toEqual([{ id: 'doc-one', name: 'Unavailable document', available: false }]);
    expect((await request(`${path}/documents`, 'GET', undefined, 'editor')).body.data).toEqual([]);
    expect((await request(`${path}/documents`, 'POST', { document_id: 'doc-one' })).status).toBe(404);
    expect((await request(path)).body.head_sequence).toBe(0);
    expect((await request(`${path}/documents`, 'DELETE', { document_id: 'doc-one' })).status).toBe(200);
    expect((await request(`${path}/documents`)).body.data).toEqual([]);
    expect((await documentsRepository.query("SELECT state FROM documents WHERE id = 'doc-one'", []))[0].state).toBe('Archived');
  } finally { runtime?.dispose(); db.close(); documentsDb.close(); }
}, 15000);
