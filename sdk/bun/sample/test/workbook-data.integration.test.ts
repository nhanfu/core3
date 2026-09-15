import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { createYamlSourceReader } from '@core3/server/yaml-source-reader';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';
import { readWorkbookXlsx } from '@core3/client/spreadsheet/files';
import { workbookStringLiteral } from '@core3/client/spreadsheet/string-literal';

test('reads the real Orders YAML datasource under each viewer identity without persisting business rows', async () => {
  const db = await DuckDbDatabase.open(':memory:');
  const sourceDb = await DuckDbDatabase.open(':memory:');
  let runtime: WorkbookRuntime | undefined;
  try {
    const repository = new YamlRepository(db), sourceRepository = new YamlRepository(sourceDb);
    const root = join(import.meta.dir, '../services/spreadsheet');
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'binding_test_migrations', ['schema', 'data']);
    await sourceRepository.query(`CREATE TABLE orders (
      id VARCHAR, row_version BIGINT, order_number VARCHAR, customer_name VARCHAR, customer_legal_name VARCHAR,
      order_date DATE, status VARCHAR, shipment_type VARCHAR, route VARCHAR, transport_method VARCHAR,
      trip_count INTEGER, total_amount DOUBLE, created_by VARCHAR, created_at TIMESTAMP, branch_id VARCHAR
    )`, []);
    await sourceRepository.query('CREATE TABLE order_workflow_states (order_id VARCHAR, status VARCHAR)', []);
    await sourceRepository.query(`INSERT INTO orders VALUES
      ('one', 1, 'SO-ONE', 'First customer', 'First', CURRENT_DATE - 1, 'Draft', 'Local', 'Route', 'Road', 1, 42, 'owner', CURRENT_TIMESTAMP, 'owner'),
      ('two', 1, 'SO-TWO', 'Second customer', 'Second', CURRENT_DATE - 1, 'Draft', 'Local', 'Route', 'Road', 1, 99, 'editor', CURRENT_TIMESTAMP, 'editor')`, []);
    const permissions = ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export', 'orders.read'];
    const auth = {
      async getCurrentUser(request: Request) {
        const id = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!['owner', 'editor'].includes(id || '')) throw Object.assign(new Error('Unauthorized'), { status: 401 });
        return { sub: id, company_name: 'Acme', branch_id: id, view_scope: 'own', permissions };
      },
      hasPermission: (user: any, permission: string) => user.permissions.includes(permission),
    };
    let sourceDenied = false;
    const source = (Bun.YAML.parse(readFileSync(join(root, '../order/api/orders.yaml'), 'utf8')) as any).datasources.find((source: any) => source.id === 'orders');
    const api = createYamlApi({
      repository: sourceRepository, authProvider: { ...auth, hasPermission: (user: any, permission: string) => !sourceDenied && auth.hasPermission(user, permission) },
      sources: new Map([['orders', source]]), pageSources: new Map(), pages: new Map(), catalogs: new Map(), menus: new Map(), workflows: new Map([['orders', { permission: 'orders.read', states: [] }]]), workflowFiles: new Map(), permissions: { permissions: ['orders.read'] }, uploadRoot: '', eventStore: {}, topics: {},
    });
    const reader = createYamlSourceReader(api);
    const definition = validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(root, 'workbooks.yaml'), 'utf8')));
    runtime = new WorkbookRuntime(definition, repository, auth, service => {
      expect(service).toBe('order'); return reader;
    });
    const request = async (path: string, method = 'GET', body?: any, actor = 'owner') => {
      const url = new URL(`http://data.test/api/spreadsheet/workbooks${path}`);
      const response = (await runtime!.handle(new Request(url, { method, headers: { Authorization: `Bearer ${actor}` }, ...(body ? { body: JSON.stringify(body) } : {}) }), url))!;
      return { status: response.status, body: await response.json() };
    };
    const created = await request('', 'POST', { name: 'Live data boundary' });
    const path = `/${created.body.id}`;
    await request(`${path}/members`, 'POST', { user_id: 'editor', role: 'reader' });
    const date = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const query = { source: 'sales_orders', filters: { from_date: date(2), to_date: date(0) } };
    const ownerRows = await request(`${path}/data`, 'POST', query);
    expect(ownerRows).toMatchObject({ status: 200 });
    expect(ownerRows.body.data).toEqual([{ order_number: 'SO-ONE', customer_name: 'First customer', order_date: date(1), status: 'Draft', total_amount: 42 }]);
    expect((await request(`${path}/data`, 'POST', query, 'editor')).body.data[0].order_number).toBe('SO-TWO');
    expect((await request(`${path}/data`, 'POST', { ...query, filters: { ...query.filters, current_branch_id: 'editor' } })).status).toBe(422);
    expect((await request(`${path}/data`, 'POST', { ...query, top: 501 })).status).toBe(422);
    expect((await request(`${path}/data`, 'POST', { ...query, filters: {} })).status).toBe(422);
    sourceDenied = true;
    expect((await request(`${path}/data`, 'POST', query)).status).toBe(403);
    sourceDenied = false;
    await sourceRepository.query("UPDATE orders SET total_amount = 73 WHERE id = 'one'", []);
    expect((await request(`${path}/data`, 'POST', query)).body.data[0].total_amount).toBe(73);
    const loaded = (await request(path)).body;
    expect(loaded.head_sequence).toBe(0);
    expect(loaded.snapshot.sheets[0].cells).toEqual({});
    const formula = (field: string, filters: string) => `=CORE3.VALUE("sales_orders","${field}",1,${filters})`;
    const quotedName = 'A "quoted" customer\\';
    await sourceRepository.query('UPDATE orders SET customer_name = ? WHERE id = ?', [quotedName, 'one']);
    const filterLiteral = workbookStringLiteral(JSON.stringify(query.filters));
    const linked = await request('', 'POST', { name: 'Authorized export', snapshot: { sheets: [{ id: 's', name: 'Sheet1', rowNumber: 100, colNumber: 26, cells: {
      A1: formula('total_amount', filterLiteral), B1: '=A1+1',
      C1: formula('order_number', filterLiteral),
      E1: formula('customer_name', filterLiteral),
      D1: formula('total_amount', `LEFT(${filterLiteral},LEN(${filterLiteral})-1)&${workbookStringLiteral(', "q":"')}&C1&${workbookStringLiteral('"}')}`),
    } }] } });
    expect(linked.status).toBe(201);
    const linkedPath = `/${linked.body.id}`;
    await request(`${linkedPath}/members`, 'POST', { user_id: 'editor', role: 'reader' });
    let lastExportParts: Record<string, any> = {};
    const exported = async (actor: string) => {
      const url = new URL(`http://data.test/api/spreadsheet/workbooks${linkedPath}/export`);
      const response = (await runtime!.handle(new Request(url, { headers: { Authorization: `Bearer ${actor}` } }), url))!;
      expect(response.status).toBe(200);
      const parts = readWorkbookXlsx(new Uint8Array(await response.arrayBuffer()), 10000000, 1000);
      lastExportParts = parts;
      return parts['xl/worksheets/sheet0.xml'];
    };
    const ownerExport = await exported('owner');
    expect(ownerExport).toContain('<v>73</v>');
    expect(ownerExport).toContain('<v>74</v>');
    expect(ownerExport).not.toContain('CORE3.VALUE');
    const editorExport = await exported('editor');
    expect(editorExport).toContain('<v>99</v>');
    expect(editorExport).toContain('<v>100</v>');
    expect(editorExport).not.toContain('<v>73</v>');
    const share = await request(`${linkedPath}/shares`, 'POST', { base_revision: 'START_REVISION' });
    expect(share.status).toBe(201);
    const published = (await request(`/public/${share.body.token}`)).body;
    expect(published.snapshot.sheets[0].cells).toMatchObject({ A1: '73', B1: '74', C1: '="SO-ONE"', D1: '73' });
    expect(published.snapshot.sheets[0].cells.E1).toBe(`=${workbookStringLiteral(quotedName)}`);
    const copy = await request('', 'POST', { name: 'Frozen copy', snapshot: published.snapshot });
    const copyShare = await request(`/${copy.body.id}/shares`, 'POST', { base_revision: 'START_REVISION' });
    expect(copyShare.status).toBe(201);
    expect((await request(`/public/${copyShare.body.token}`)).body.snapshot.sheets[0].cells.E1).toBe(published.snapshot.sheets[0].cells.E1);
    sourceDenied = true;
    expect((await request(`${linkedPath}/export`)).status).toBe(403);
    expect((await request(`${linkedPath}/shares`, 'POST', { base_revision: 'START_REVISION' })).status).toBe(403);
    expect((await request(`/public/${share.body.token}`)).body).toEqual(published);
    sourceDenied = false;
    await sourceRepository.query("UPDATE orders SET total_amount = 81 WHERE id = 'one'", []);
    expect(await exported('owner')).toContain('<v>81</v>');
    expect((await request(`/public/${share.body.token}`)).body).toEqual(published);
    definition.max_data_queries = 1;
    expect((await request(`${linkedPath}/export`)).body.code).toBe('WORKBOOK_RENDER_QUERY_LIMIT');
    definition.max_data_queries = 10000;
    expect(await exported('editor')).toContain('<v>99</v>');
    const durable = (await request(linkedPath)).body;
    expect(durable.head_sequence).toBe(0);
    expect(durable.snapshot.sheets[0].cells.A1).toBe(formula('total_amount', filterLiteral));
    await sourceRepository.query(`INSERT INTO orders SELECT 'three', 1, 'SO-THREE', customer_name, customer_legal_name,
      order_date, status, shipment_type, route, transport_method, trip_count, 142, created_by, CURRENT_TIMESTAMP, branch_id
      FROM orders WHERE id = 'one'`, []);
    expect((await request(`${linkedPath}/filters`)).body.fields).toContainEqual({ key: 'search', label: 'Search', type: 'text' });
    expect(await request(`${linkedPath}/filters`, 'POST', { values: { search: 'SO-THREE' } })).toMatchObject({ status: 200 });
    expect((await request(`${linkedPath}/filters`)).body.values).toEqual({ search: 'SO-THREE' });
    expect((await request(`${linkedPath}/filters`, 'GET', undefined, 'editor')).body.values).toEqual({});
    expect((await request(`${linkedPath}/data`, 'POST', query)).body.data.map((row: any) => row.order_number)).toEqual(['SO-THREE']);
    expect(await exported('owner')).toContain('<v>142</v>');
    expect(await exported('editor')).toContain('<v>99</v>');
    const filteredShare = await request(`${linkedPath}/shares`, 'POST', { base_revision: 'START_REVISION' });
    expect(filteredShare.status).toBe(201);
    expect((await request(`/public/${filteredShare.body.token}`)).body.snapshot.sheets[0].cells.A1).toBe('142');
    expect((await request(`${linkedPath}/filters`, 'POST', { values: { current_branch_id: 'editor' } })).status).toBe(422);
    expect((await request(`${linkedPath}/filters`, 'POST', { values: { from_date: '2026-02-30' } })).status).toBe(422);
    expect((await request(`${linkedPath}/filters`, 'POST', { values: {} })).status).toBe(200);
    expect((await request(`${linkedPath}/filters`)).body.values).toEqual({});
    expect((await request(linkedPath)).body.head_sequence).toBe(0);
    const chart = {
      type: 'CREATE_CHART', sheetId: 's', chartId: 'amount-chart', figureId: 'amount-figure', col: 6, row: 2, offset: { x: 0, y: 0 }, size: { width: 600, height: 360 },
      definition: { type: 'bar', dataSets: [{ dataRange: 'A1' }], labelRange: 'C1', dataSetsHaveTitle: false, title: { text: 'Amounts' }, legendPosition: 'none' },
    };
    const client = (await request(linkedPath)).body.client;
    expect(await request(`${linkedPath}/revisions`, 'POST', { type: 'REMOTE_REVISION', version: 1, clientId: client.id, serverRevisionId: 'START_REVISION', nextRevisionId: 'chart-created', commands: [chart] })).toMatchObject({ status: 200 });
    await request(`${linkedPath}/filters`, 'POST', { values: { search: 'SO-THREE' } });
    await exported('owner');
    const chartXml = Object.entries(lastExportParts).filter(([path]) => path.startsWith('xl/charts/') && path.endsWith('.xml')).map(([, xml]) => xml).join('');
    expect(lastExportParts['xl/worksheets/sheet0.xml']).toContain('<v>142</v>');
    expect(chartXml.match(/<c:f>.*?<\/c:f>/g)).toEqual(expect.arrayContaining(['<c:f>Sheet1!A1</c:f>', '<c:f>Sheet1!C1</c:f>']));
    const chartShare = await request(`${linkedPath}/shares`, 'POST', { base_revision: 'chart-created' });
    expect(chartShare.status).toBe(201);
    const frozenChart = (await request(`/public/${chartShare.body.token}`)).body.snapshot;
    expect(frozenChart.sheets[0].cells.A1).toBe('142');
    expect(frozenChart.sheets[0].figures).toHaveLength(1);
    expect(JSON.stringify(frozenChart)).toContain('amount-chart');
  } finally { runtime?.dispose(); sourceDb.close(); db.close(); }
}, 30000);
