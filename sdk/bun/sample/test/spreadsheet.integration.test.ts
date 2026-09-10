import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/spreadsheet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiSource = (file: string, id: string) => yaml(`api/${file}`).datasources.find((source: any) => source.id === id);

describe('Spreadsheet dashboard configuration parity', () => {
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
});
