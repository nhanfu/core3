import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';

const serviceRoot = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('POS Sales Details wizard action 703 parity', () => {
  test('binds the visible Sales Details action and joins page/API by page.id', () => {
    const page = yaml('pages/pos-sales-details-wizard.yaml');
    const api = yaml('api/pos-sales-details-wizard.yaml');
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    expect(page.page).toMatchObject({ id: 'pos-sales-details-wizard', route: '/point-of-sale/sales-details' });
    expect(api.page.id).toBe(page.page.id);
    expect(menu).toContainEqual(expect.objectContaining({ path: page.page.route, label: 'Sales Details', permission: 'pos.read' }));
    expect(yaml('pages/pos-sales-details.yaml').page.route).toBe('/point-of-sale/sales-details-lines');
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'pos_sales_details_wizard', initial_editing: true });
    expect(page.components[1]).toMatchObject({ type: 'LineItemGrid', source: 'pos_sales_details_wizard_lines', parent_source: 'pos_sales_details_wizard' });
  });

  test('matches the Odoo wizard actions and declares safe empty/error/search states', () => {
    const page = yaml('pages/pos-sales-details-wizard.yaml');
    const api = yaml('api/pos-sales-details-wizard.yaml');
    expect(page.components[0].header_actions.map((candidate: any) => candidate.id)).toEqual([
      'print_pos_sales_details', 'cancel_pos_sales_details', 'edit_pos_sales_details',
    ]);
    expect(action(api, 'print_pos_sales_details')).toMatchObject({ type: 'client', permission: 'pos.read' });
    expect(action(api, 'edit_pos_sales_details')).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'update' });
    expect(action(api, 'add_pos_sales_details_line')).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'create' });
    expect(action(api, 'delete_pos_sales_details_line')).toMatchObject({ type: 'server', permission: 'pos.manage', operation: 'delete' });
    expect(api.datasources[0].error_states.transport_error.status).toBe(503);
    expect(api.datasources[1].query).toContain(':q IS NULL');
    expect(page.components[1].empty_state.title).toBe('No point of sale lines');
    expect(yaml('migrations/20260911103000-022-pos-sales-details-wizard.yaml').type.postgres.up).not.toContain('CURRENT_');
  });

  test('returns deterministic wizard data, search, empty, and unknown-id states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'pos_sales_details_wizard_contract', ['schema', 'data']);
    const api = yaml('api/pos-sales-details-wizard.yaml');
    const wizard = await repository.querySource(api.datasources[0], { id: null, fixture_state: null }, 0, 1);
    expect(wizard.data).toMatchObject({ id: 'pos-sales-wizard-demo-001', name: 'Sales Details', start_date: '2026-01-01 00:00:00' });
    const lines = await repository.querySource(api.datasources[1], { id: 'pos-sales-wizard-demo-001', q: null, fixture_state: null }, 0, 50);
    expect(lines.data).toHaveLength(3);
    expect((await repository.querySource(api.datasources[1], { id: 'pos-sales-wizard-demo-001', q: 'Furniture', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(api.datasources[1], { id: 'pos-sales-wizard-demo-001', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(api.datasources[0], { id: 'missing-wizard', fixture_state: null }, 0, 1)).data).toEqual({});
  });

  test('guards wizard and line CRUD with permissions, validation, and row versions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'pos_sales_details_wizard_mutations', ['schema', 'data']);
    const api = yaml('api/pos-sales-details-wizard.yaml');
    const edit = action(api, 'edit_pos_sales_details');
    await expect(repository.executeMutation(edit.mutation, {
      id: 'pos-sales-wizard-demo-001', expected_row_version: 1,
      start_date: '2026-02-01 00:00:00', end_date: '2026-01-01 00:00:00',
    })).rejects.toMatchObject({ status: 422, code: 'POS_SALES_DETAILS_DATE_RANGE' });

    const add = action(api, 'add_pos_sales_details_line');
    const created = await repository.executeMutation(add.mutation, {
      id: 'pos-sales-wizard-demo-001', point_of_sale: 'Airport Shop', company: 'My Company (San Francisco)', closing: '', balance: 12.5,
    });
    expect(created).toMatchObject({ point_of_sale: 'Airport Shop', balance: 12.5 });

    const update = action(api, 'edit_pos_sales_details_line');
    const updated = await repository.executeMutation(update.mutation, {
      id: 'pos-sales-wizard-demo-001', line_id: created.id, expected_row_version: 1,
      point_of_sale: 'Airport Shop 2', company: 'My Company (San Francisco)', closing: '', balance: 15,
    });
    expect(updated).toMatchObject({ point_of_sale: 'Airport Shop 2', row_version: 2 });

    const remove = action(api, 'delete_pos_sales_details_line');
    await expect(repository.executeMutation(remove.mutation, {
      id: 'pos-sales-wizard-demo-001', line_id: created.id, expected_row_version: 1,
    })).rejects.toMatchObject({ status: 409, code: 'POS_SALES_DETAILS_LINE_STALE' });
    await repository.executeMutation(remove.mutation, {
      id: 'pos-sales-wizard-demo-001', line_id: created.id, expected_row_version: 2,
    });
    expect((await repository.query('SELECT id FROM pos_sales_details_wizard_lines WHERE id = ?', [created.id]))).toEqual([]);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('pos-sales-details-wizard')).toEqual([
      'pos_sales_details_wizard', 'pos_sales_details_wizard_lines',
    ]);
  });
});
