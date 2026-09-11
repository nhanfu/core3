import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/scraps.yaml');
const detailApi = () => yaml('api/scrap-detail.yaml');
const action = (id: string) => [...listApi().actions, ...detailApi().actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const migrations = join(serviceRoot, 'migrations');
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_scrap_orders_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_scrap_orders_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Scrap Orders Odoo action parity', () => {
  test('keeps presentation pages separate from page-id-bound API fragments', () => {
    const listPage = yaml('pages/scraps.yaml');
    const detailPage = yaml('pages/scrap-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'manufacturing-scraps', route: '/scraps' });
    expect(detailPage.page).toMatchObject({ id: 'manufacturing-scrap-detail', route: '/scraps/detail' });
    expect(listApi().page.id).toBe('manufacturing-scraps');
    expect(detailApi().page.id).toBe('manufacturing-scrap-detail');
    expect(discovered.pageDatasources.get('manufacturing-scraps')).toEqual(expect.arrayContaining(['stock_scraps']));
    expect(discovered.pageDatasources.get('manufacturing-scrap-detail')).toEqual(['stock_scrap_detail']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/scraps', page: 'manufacturing-scraps', module: 'manufacturing' }),
      expect.objectContaining({ path: '/scraps/detail', page: 'manufacturing-scrap-detail', module: 'manufacturing' }),
    ]));
  });

  test('matches Odoo action 537, menu, modes, fields, and visible labels', () => {
    const manifest = yaml('manifest.yaml');
    const operations = manifest.menu.groups.find((group: any) => group.id === 'operations');
    expect(operations.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/scraps', label: 'Scrap', permission: 'manufacturing.read' }),
    ]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['manufacturing.read', 'manufacturing.write', 'manufacturing.manage']));

    const list = yaml('pages/scraps.yaml').components[0];
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'stock_scraps', create_action: 'create_stock_scrap', row_open_action: 'view_stock_scrap', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'form', 'kanban', 'card', 'pivot', 'graph']);
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({ label: 'Kanban', mobile: false, group_by: 'state' });
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Kanban', mobile: true });
    expect(list.views.find((view: any) => view.id === 'pivot')).toMatchObject({ label: 'Pivot' });
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ label: 'Graph', category_field: 'product_name', measure_field: 'scrap_qty' });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Reference', 'Date', 'Product', 'Quantity', 'Unit', 'Company', 'Status', ' ']);
    expect(list.form_view.page).toBe('apps/services/manufacturing/pages/scrap-detail.yaml');

    const detail = yaml('pages/scrap-detail.yaml').components[0];
    expect(detail).toMatchObject({ type: 'OdooFormView', source: 'stock_scrap_detail', editable: true, title_field: 'name', status_field: 'state' });
    expect(detail.statusbar.map((state: any) => state.label)).toEqual(['Draft', 'Done']);
    expect(detail.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(expect.arrayContaining([
      'Reference', 'Date', 'Product', 'Quantity', 'Unit', 'Replenish Quantities', 'Source Location',
      'Scrap Location', 'Company', 'Source Document', 'Manufacturing Order', 'Lot/Serial Number',
    ]));
    expect(listApi().datasources.find((source: any) => source.id === 'stock_scraps').error_states).toMatchObject({
      unauthorized: { status: 401, code: 'STOCK_SCRAP_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'STOCK_SCRAP_FORBIDDEN' },
      transport_error: { status: 503, code: 'STOCK_SCRAP_UNAVAILABLE' },
    });
    expect(detailApi().datasources[0].error_states).toMatchObject({ missing_record: { status: 404, code: 'STOCK_SCRAP_NOT_FOUND' } });
    expect(action('validate_stock_scrap')).toMatchObject({ permission: 'manufacturing.write', action: 'manufacturing.scraps.validate' });
    expect(action('validate_stock_scrap').mutation.guards[1].query).toContain('row_version = :expected_row_version');
    expect(action('validate_stock_scrap').mutation.steps[0]).toMatchObject({ expect_changed: true, code: 'STALE_RECORD' });
  });

  test('serves deterministic default/search/filter/empty/detail/error fixtures', async () => {
    const { database, repository } = await repositoryForTest();
    const list = listApi().datasources.find((source: any) => source.id === 'stock_scraps');
    const params = { q: null, state: null, product_name: null, source_location: null, scrap_location: null, company_name: null, fixture_state: null };

    const defaultRows = (await repository.querySource(list, params, 0, 50)).data;
    expect(defaultRows).toHaveLength(6);
    expect(defaultRows.map((row: any) => row.state)).toEqual(expect.arrayContaining(['Draft', 'Done']));
    expect(defaultRows[0]).toMatchObject({ name: 'SCRAP/2026/0001', product_name: '[FURN_9666] Table', state: 'Done' });
    expect((await repository.querySource(list, { ...params, q: 'Drawer' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['SCRAP/2026/0003', 'SCRAP/2026/0005']);
    expect((await repository.querySource(list, { ...params, state: 'Done' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(list, { ...params, company_name: 'Core3 Vietnam' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['SCRAP/2026/0005']);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'STOCK_SCRAP_UNAVAILABLE' });

    const detail = detailApi().datasources[0];
    expect((await repository.querySource(detail, { id: 'scrap-panel-draft', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'SCRAP/2026/0002', scrap_qty: 3, state: 'Draft' });
    expect((await repository.querySource(detail, { id: 'missing-scrap', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'scrap-panel-draft', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'STOCK_SCRAP_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('supports create, edit, validate, stale, and done-delete guards', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_stock_scrap');
    const edit = action('edit_stock_scrap');
    const validate = action('validate_stock_scrap');
    const remove = action('delete_stock_scrap');
    const values = {
      name: 'SCRAP/2026/0099', date_done: '2026-01-21', product_id: 'product-furn-9666', product_name: '[FURN_9666] Table',
      scrap_qty: 1, product_uom: 'Units', source_location: 'WH/Stock', scrap_location: 'Virtual Locations/Scrap',
      company_name: 'My Company (San Francisco)', state: 'Draft', origin: 'MO/2026/0005', production_name: 'MO/2026/0005',
      lot_name: 'LOT-TABLE-001', should_replenish: false, note: 'QA fixture',
    };

    const created = await repository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ id: 'scrap-scrap-2026-0099', name: 'SCRAP/2026/0099', row_version: 1, state: 'Draft' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'scrap/2026/0099' } })).rejects.toMatchObject({ status: 409, code: 'STOCK_SCRAP_REFERENCE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'SCRAP/2026/0100', scrap_qty: 0 } })).rejects.toMatchObject({ status: 422, code: 'STOCK_SCRAP_REQUIRED_FIELDS' });

    const updated = await repository.executeMutation(edit.mutation, { id: 'scrap-scrap-2026-0099', expected_row_version: 1, values: { ...values, name: 'SCRAP/2026/0099-EDITED', scrap_qty: 2 } });
    expect(updated).toMatchObject({ name: 'SCRAP/2026/0099-EDITED', row_version: 2, scrap_qty: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'scrap-scrap-2026-0099', expected_row_version: 1, values: { ...values, name: 'Stale Scrap' } })).rejects.toMatchObject({ status: 409 });

    const completed = await repository.executeMutation(validate.mutation, { id: 'scrap-panel-draft', expected_row_version: 1, values: { state: 'Done' } });
    expect(completed).toMatchObject({ id: 'scrap-panel-draft', state: 'Done', row_version: 2 });
    await expect(repository.executeMutation(validate.mutation, { id: 'scrap-panel-draft', expected_row_version: 1, values: { state: 'Done' } })).rejects.toMatchObject({ status: 409, code: 'STOCK_SCRAP_NOT_DRAFT' });
    await expect(repository.executeMutation(edit.mutation, { id: 'scrap-table-done', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'STOCK_SCRAP_DONE_EDIT' });
    await expect(repository.executeMutation(remove.mutation, { id: 'scrap-table-done', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'STOCK_SCRAP_DONE_DELETE' });

    await repository.executeMutation(remove.mutation, { id: 'scrap-scrap-2026-0099', expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: 'scrap-scrap-2026-0099', expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'STOCK_SCRAP_NOT_FOUND' });
    database.close();
  });
});
