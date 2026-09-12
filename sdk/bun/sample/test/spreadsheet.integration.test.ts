import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import SpreadsheetModule from '../services/spreadsheet/module';

const serviceRoot = join(import.meta.dir, '../services/spreadsheet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiSource = (file: string, id: string) => yaml(`api/${file}`).datasources.find((source: any) => source.id === id);

describe('Spreadsheet dashboard configuration parity', () => {
  test('defines the authenticated Dashboards client action with page-id API ownership', () => {
    const page = yaml('pages/dashboards.yaml');
    const api = yaml('api/dashboards.yaml');
    const action = page.components[0];
    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('dashboards');
    expect(page.page.auth.require).toEqual(['spreadsheet.read']);
    expect(action).toMatchObject({
      type: 'SpreadsheetDashboardClientAction',
      read_only: true,
      default_dashboard_id: 'sdb-sales',
    });
    expect(action.groups_source).toBe('spreadsheet_dashboard_groups_landing');
    expect(action.favorite_action).toBe('toggle_dashboard_favorite');
    expect(action.workbooks_source).toBe('spreadsheet_dashboard_workbooks');
    expect(api.page.id).toBe('dashboards');
    expect(api.datasources.map((source: any) => source.id)).toEqual([
      'spreadsheet_dashboard_groups_landing',
      'spreadsheet_dashboards_landing',
      'spreadsheet_dashboard_workbooks',
      'spreadsheet_dashboard_summaries_landing',
      'spreadsheet_dashboard_chart_landing',
      'spreadsheet_dashboard_rows_landing',
    ]);
    expect(api.datasources.every((source: any) => source.permission === 'spreadsheet.read')).toBe(true);
  });

  test('returns deterministic client-action dashboard, workbook, figure, and stable error fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'spreadsheet_client_action_migrations', ['schema', 'data']);

    const dashboards = apiSource('dashboards.yaml', 'spreadsheet_dashboards_landing');
    const workbooks = apiSource('dashboards.yaml', 'spreadsheet_dashboard_workbooks');
    const chart = apiSource('dashboards.yaml', 'spreadsheet_dashboard_chart_landing');
    const table = apiSource('dashboards.yaml', 'spreadsheet_dashboard_rows_landing');
    const dashboardRows = await repository.querySource(dashboards, { q: null, state: null, favorite: null }, 0, 50);
    expect(dashboardRows.data.map((row: any) => row.name)).toEqual(['Empty workbook', 'Invoicing', 'Sales', 'Warehouse Metrics', 'Product', 'Unreadable source example']);
    expect((await repository.querySource(workbooks, {}, 0, 50)).data.find((row: any) => row.id === 'sdb-sales')).toMatchObject({
      snapshot_status: 'ready',
      workbook_snapshot: expect.stringContaining('Sheet1'),
    });
    expect((await repository.querySource(chart, {}, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(table, {}, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(dashboards, { q: 'not-found', state: null, favorite: null }, 0, 50)).data).toEqual([]);
    expect(yaml('api/dashboards.yaml').datasources.find((source: any) => source.id === 'spreadsheet_dashboard_workbooks').error_states.transport_error).toMatchObject({
      status: 503,
      code: 'SPREADSHEET_DASHBOARD_WORKBOOKS_UNAVAILABLE',
    });
    expect(yaml('api/dashboards.yaml').actions).toContainEqual(expect.objectContaining({
      id: 'toggle_dashboard_favorite', permission: 'spreadsheet.read', action: 'spreadsheet.dashboard.toggle_favorite', operation: 'toggle_favorite',
    }));
    const favoriteAction = yaml('api/dashboards.yaml').actions.find((candidate: any) => candidate.id === 'toggle_dashboard_favorite');
    const toggled = await repository.executeMutation(favoriteAction.mutation, { id: 'sdb-sales', expected_row_version: 1 });
    expect(toggled).toMatchObject({ id: 'sdb-sales', favorite: false, row_version: 2 });
    await expect(repository.executeMutation(favoriteAction.mutation, { id: 'sdb-sales', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'SPREADSHEET_DASHBOARD_FAVORITE_STALE' });
    await expect(repository.executeMutation(favoriteAction.mutation, { id: 'sdb-error', expected_row_version: 1 })).rejects.toMatchObject({ status: 503, code: 'SPREADSHEET_DASHBOARD_FAVORITE_UNAVAILABLE' });
  });

  test('keeps configuration pages layout-only and API-owned by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const pages = [
      ['pages/dashboard-groups.yaml', 'spreadsheet-dashboard-groups', 'dashboard-groups.yaml', 'spreadsheet_dashboard_groups_configuration'],
      ['pages/dashboard-group.yaml', 'spreadsheet-dashboard-group', 'dashboard-group.yaml', 'spreadsheet_dashboard_group'],
    ] as const;

    for (const [pageFile, pageId, apiFile, sourceId] of pages) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.id, pageFile).toBe(pageId);
      expect(page.page.auth.require, pageFile).toEqual(['spreadsheet.manage']);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
      expect(yaml(`api/${apiFile}`).page.id, apiFile).toBe(pageId);
    }

    const manifest = yaml('manifest.yaml');
    expect(manifest.menu.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'configuration',
        items: [expect.objectContaining({ path: '/spreadsheet/dashboard-groups', label: 'Dashboards' })],
      }),
    ]));
  });

  test('matches Odoo list/form columns and visible view structure', () => {
    const list = yaml('pages/dashboard-groups.yaml').components[0];
    expect(list).toMatchObject({
      variant: 'odoo',
      source: 'spreadsheet_dashboard_groups_configuration',
      create_label: 'New',
      selectable: true,
      column_chooser: true,
    });
    expect(list.columns).toEqual([
      { field: 'sequence', label: '', type: 'HandleCell', sortable: false },
      { field: 'name', label: 'Name', type: 'PrimaryEntityCell' },
    ]);

    const formPage = yaml('pages/dashboard-group.yaml');
    const form = formPage.components[0];
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Spreadsheets']);
    expect(form.notebook.tabs[0].content_slot).toBe(true);
    const nested = formPage.components[1];
    expect(nested).toMatchObject({
      mount_in: 'previous-panel',
      create_action: 'add_spreadsheet_dashboard',
      create_label: 'Add Dashboard',
      create_mobile_only: true,
      search: false,
      show_pager: false,
      breadcrumbs: [],
    });
    expect(nested.columns.map((column: any) => column.field)).toEqual([
      'sequence', 'name', 'group_name', 'company_name', 'published',
    ]);
    expect(nested.columns.at(-1)).toMatchObject({ type: 'BooleanToggle', label: 'Is Published', mobile: false });
    expect(nested.row_open_action).toBe('view_spreadsheet_dashboard');
    const addAction = yaml('api/dashboard-group.yaml').actions.find((action: any) => action.id === 'add_spreadsheet_dashboard');
    expect(addAction).toMatchObject({
      type: 'server_form',
      permission: 'spreadsheet.manage',
      action: 'spreadsheet.dashboard.create',
      operation: 'create',
    });
    expect(addAction.mutation).toMatchObject({ generated: ['id'] });
    expect(addAction.mutation.before_steps[0].query).toContain(':group_id');
  });

  test('maps the nested dashboard form and workbook entry action', async () => {
    const page = yaml('pages/dashboard.yaml');
    const api = yaml('api/dashboard.yaml');
    expect(page.page).toMatchObject({ id: 'spreadsheet-dashboard', route: '/spreadsheet/dashboard' });
    expect(page.page.auth.require).toEqual(['spreadsheet.manage']);
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'spreadsheet_dashboard', editable: true });
    expect(page.components[0].groups[0].fields.map((field: any) => field.label)).toEqual(['Name', 'Dashboard Group', 'Companies', 'Groups', 'Data']);
    expect(api.datasources[0].permission).toBe('spreadsheet.manage');
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'open_spreadsheet_dashboard', navigate_to: '/dashboards', params: { dashboard_id: '{state.id}' } }));
    const update = api.actions.find((action: any) => action.id === 'edit_spreadsheet_dashboard');
    expect(update).toMatchObject({ operation: 'update', permission: 'spreadsheet.manage', mutation: { concurrency: { required: true } } });
    expect(update.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'SPREADSHEET_DASHBOARD_STALE' }),
      expect.objectContaining({ status: 422, code: 'SPREADSHEET_DASHBOARD_NAME_REQUIRED' }),
    ]));
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'spreadsheet_dashboard_detail_migrations', ['schema', 'data']);
    const source = apiSource('dashboard.yaml', 'spreadsheet_dashboard');
    expect((await repository.querySource(source, { id: 'sdb-sales', fixture_state: null }, 0, 1)).data).toMatchObject({
      name: 'Sales', dashboard_group_name: 'Sales', workbook_status: 'Data available',
    });
    expect((await repository.querySource(source, { id: 'sdb-sales', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { id: 'sdb-sales', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'SPREADSHEET_DASHBOARD_UNAVAILABLE' });
  });

  test('returns fixed group fixtures, search, empty, nested rows, and stable errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationTable = 'spreadsheet_parity_test_schema_migrations';
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationTable, ['schema', 'data']);

    const groups = apiSource('dashboard-groups.yaml', 'spreadsheet_dashboard_groups_configuration');
    const defaultRows = await repository.querySource(groups, { q: null, fixture_state: null }, 0, 50);
    expect(defaultRows.data.map((row: any) => row.name)).toEqual([
      'Sales', 'Finance', 'Logistics', 'Services', 'Marketing', 'Website', 'Human Resources',
    ]);
    expect((await repository.querySource(groups, { q: null, fixture_state: 'all' }, 0, 50)).data.map((row: any) => row.name)).toEqual([
      'Sales', 'Finance', 'Logistics', 'Services', 'Marketing', 'Website', 'Human Resources', 'Unpopulated', 'Custom dashboards',
    ]);
    expect((await repository.querySource(groups, { q: 'Finance', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Finance']);
    expect((await repository.querySource(groups, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const nested = apiSource('dashboard-group.yaml', 'spreadsheet_group_dashboards');
    expect((await repository.querySource(nested, { id: 'sdg-sales', fixture_state: null }, 0, 50)).data).toMatchObject([
      { id: 'sdb-sales', name: 'Sales', group_name: 'Sales', company_name: 'Global', published: true },
    ]);
    expect((await repository.querySource(nested, { id: 'sdg-empty', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const addAction = yaml('api/dashboard-group.yaml').actions.find((action: any) => action.id === 'add_spreadsheet_dashboard');
    const created = await repository.executeMutation(addAction.mutation, {
      group_id: 'sdg-sales',
      values: { name: 'Quarterly Sales' },
    });
    expect(created).toMatchObject({ name: 'Quarterly Sales', group_id: 'sdg-sales', published: false });

    const group = apiSource('dashboard-group.yaml', 'spreadsheet_dashboard_group');
    expect((await repository.querySource(group, { id: 'does-not-exist', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});

    expect(groups.error_states.transport_error).toMatchObject({ status: 503, code: 'SPREADSHEET_DASHBOARD_GROUPS_UNAVAILABLE' });
    expect(group.error_states.transport_error).toMatchObject({ status: 503, code: 'SPREADSHEET_DASHBOARD_GROUP_UNAVAILABLE' });
    expect(nested.error_states.transport_error).toMatchObject({ status: 503, code: 'SPREADSHEET_DASHBOARD_GROUP_SPREADSHEETS_UNAVAILABLE' });
    await expect(repository.querySource(groups, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'SPREADSHEET_DASHBOARD_GROUPS_UNAVAILABLE' });
    await expect(repository.querySource(nested, { id: 'sdg-sales', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'SPREADSHEET_DASHBOARD_GROUP_SPREADSHEETS_UNAVAILABLE' });
  });

  test('keeps Spreadsheet migrations deterministic and permission-bound', () => {
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['spreadsheet.read', 'spreadsheet.manage']));
    const parityMigration = readFileSync(join(serviceRoot, 'migrations', '20260910130000-002-spreadsheet-dashboard-parity.yaml'), 'utf8');
    expect(parityMigration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    for (const file of ['dashboard-groups.yaml', 'dashboard-group.yaml']) {
      for (const source of yaml(`api/${file}`).datasources) expect(source.permission, file).toBe('spreadsheet.manage');
    }
  });

  test('declares the dashboard Share action with deterministic active and revoked link fixtures', async () => {
    const page = yaml('pages/dashboard-detail.yaml');
    const api = yaml('api/dashboard-detail.yaml');
    expect(page.components.find((component: any) => component.type === 'ListView').actions).toContainEqual(expect.objectContaining({
      id: 'share_dashboard', label: 'Share', permission: 'spreadsheet.read',
    }));
    expect(api.page.id).toBe('dashboard-detail');
    const share = api.datasources.find((source: any) => source.id === 'spreadsheet_dashboard_share');
    expect(share).toMatchObject({ single: true, permission: 'spreadsheet.read' });
    expect(share.query).toContain("'/dashboard/share/' || s.dashboard_id || '/'");
    const action = api.actions.find((candidate: any) => candidate.id === 'share_dashboard');
    expect(action).toMatchObject({ type: 'server_form', action: 'spreadsheet.dashboard.share', operation: 'update' });
    expect(action.params).toMatchObject({ dashboard_id: '{row.dashboard_id}', id: '{row.share_id}' });
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'SPREADSHEET_DASHBOARD_SHARE_STALE' }),
      expect.objectContaining({ status: 422, code: 'SPREADSHEET_DASHBOARD_SHARE_UNAVAILABLE' }),
    ]));

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'spreadsheet_share_migrations', ['schema', 'data']);
    expect((await repository.querySource(share, { id: 'sdb-sales', fixture_state: null }, 0, 1)).data).toMatchObject({
      dashboard_id: 'sdb-sales', revoked: false, share_link: '/dashboard/share/sdb-sales/sales-dashboard-share-2026',
    });
    expect((await repository.querySource(share, { id: 'sdb-product', fixture_state: null }, 0, 1)).data).toMatchObject({
      dashboard_id: 'sdb-product', revoked: true, share_link: null,
    });
    expect((await repository.querySource(share, { id: 'sdb-sales', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(share, { id: 'sdb-sales', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({
      status: 503, code: 'SPREADSHEET_DASHBOARD_SHARE_UNAVAILABLE',
    });
    const result = await repository.executeMutation(action.mutation, {
      dashboard_id: 'sdb-sales', id: 'share-sales-2026', expected_row_version: 1, values: { revoked: false },
    });
    expect(result).toMatchObject({ dashboard_id: 'sdb-sales', revoked: false, share_link: '/dashboard/share/sdb-sales/sales-dashboard-share-2026' });
    await expect(repository.executeMutation(action.mutation, {
      dashboard_id: 'sdb-sales', id: 'share-sales-2026', expected_row_version: 0, values: { revoked: false },
    })).rejects.toMatchObject({ status: 409, code: 'SPREADSHEET_DASHBOARD_SHARE_STALE' });
    await expect(repository.executeMutation(action.mutation, {
      dashboard_id: 'sdb-product', id: 'share-product-revoked-2026', expected_row_version: 1, values: { revoked: false },
    })).resolves.toMatchObject({ dashboard_id: 'sdb-product', revoked: false });
  });

  test('matches Odoo public share/data/download routes and access boundaries', async () => {
    const module = new SpreadsheetModule();
    const calls: any[] = [];
    const service = { call: async (operation: string, params: any) => {
      calls.push({ operation, params });
      if (params.share_id === 'missing') return { share: [] };
      return { share: [{ id: params.share_id, dashboard_id: 'sdb-sales', token: params.token, dashboard_name: 'Sales', published: true, revoked: params.token === 'revoked', snapshot_status: 'ready', workbook_snapshot: '{"sheets":[{"name":"Sheet1"}]}' }] };
    } };
    const valid = (path: string, init?: RequestInit) => module.handleShareRoute(new Request(`http://core3.test${path}`, init), new URL(`http://core3.test${path}`), service);
    expect(await valid('/dashboard/data/share-sales-2026/sales-dashboard-share-2026')).toMatchObject({ status: 200 });
    const payload = await (await valid('/dashboard/data/share-sales-2026/sales-dashboard-share-2026'))!.json();
    expect(payload).toMatchObject({ is_frozen: true, dashboard_name: 'Sales', snapshot: { sheets: [{ name: 'Sheet1' }] } });
    expect(await valid('/dashboard/data/share-sales-2026/revoked')).toMatchObject({ status: 404 });
    expect(await valid('/dashboard/data/missing/sales-dashboard-share-2026')).toMatchObject({ status: 404 });
    expect(await valid('/dashboard/download/share-sales-2026/sales-dashboard-share-2026')).toMatchObject({ status: 401 });
    const download = await valid('/dashboard/download/share-sales-2026/sales-dashboard-share-2026', { headers: { Authorization: 'Bearer export-user' } });
    expect(download).toMatchObject({ status: 200 });
    expect(download!.headers.get('content-disposition')).toContain('Sales.xlsx');
    const restrictedModule = new SpreadsheetModule() as any;
    restrictedModule.authAdapter = {
      getCurrentUser: async () => ({ id: 'viewer' }),
      hasPermission: (_user: any, permission: string) => permission === 'spreadsheet.read',
    };
    expect(await restrictedModule.handleShareRoute(new Request('http://core3.test/dashboard/download/share-sales-2026/sales-dashboard-share-2026', { headers: { Authorization: 'Bearer viewer' } }), new URL('http://core3.test/dashboard/download/share-sales-2026/sales-dashboard-share-2026'), service)).toMatchObject({ status: 403 });
    expect(calls.map((call) => call.operation)).toEqual([
      'spreadsheet.public.share', 'spreadsheet.public.share', 'spreadsheet.public.share',
      'spreadsheet.public.share', 'spreadsheet.public.export', 'spreadsheet.public.export', 'spreadsheet.public.export',
    ]);
  });
});
