import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS Payment Methods action 479 parity', () => {
  test('matches the Odoo action, menu visibility, modes, grouping, and fields', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_payment_method_views.xml', 'utf8');
    const page = yaml('pages/pos-payment-methods.yaml');
    const api = yaml('api/pos-payment-methods.yaml');
    const list = page.components[0];
    expect(source).toContain('<field name="view_mode">list,kanban,form</field>');
    expect(source).toContain('groups="group_pos_manager,group_pos_user"');
    expect(source).toContain("search_default_group_by_account");
    expect(page.page.id).toBe(api.page.id);
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(list.views[1]).toMatchObject({ label: 'Kanban', mobile: true, card: { title: 'name', subtitle: 'journal' } });
    expect(list.default_group_by).toBe('account');
    expect(list.filters).toContainEqual({ field: 'active', label: 'Status', options_source: 'pos_payment_method_active' });
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Payment method', 'Sequence', 'Split Transactions', 'Journal', 'Account', 'Company', 'Point of Sale', 'Active',
    ]);
    expect(api.datasources[0].error_states).toMatchObject({ forbidden: { status: 403 }, transport_error: { status: 503 } });
  });

  test('seeds ordered service-owned methods and supports normal, search, archived, empty, and missing states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_payment_method_action_read', ['schema', 'data']);
    const api = yaml('api/pos-payment-methods.yaml');
    const source = api.datasources[0];
    const rows = (await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data;
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ name: 'Card', account: 'Bank', sequence: 2, active: 'Active' });
    expect(rows.find((row: any) => row.name === 'Cash')).toMatchObject({ account: 'Cash', sequence: 1, active: 'Active' });
    expect((await repository.querySource(source, { q: 'Bank', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Card']);
    expect((await repository.querySource(source, { q: null, active: false, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(api.datasources[1]).toMatchObject({ id: 'pos_payment_method_active', permission: 'pos.read' });
    const detail = yaml('api/pos-payment-method-detail.yaml').datasources[0];
    await expect(repository.querySource(detail, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'POS_PAYMENT_METHOD_NOT_FOUND' });
    database.close();
  });

  test('keeps manager CRUD validation and stale protection on the existing detail action', async () => {
    const detail = yaml('api/pos-payment-method-detail.yaml');
    const edit = detail.actions.find((action: any) => action.id === 'edit_pos_payment_method');
    expect(edit.permission).toBe('pos.manage');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining(['sequence', 'split_transactions', 'account', 'receivable_account', 'payment_method_type']));
    expect(edit.fields).toContainEqual(expect.objectContaining({ field: 'name', required: true }));
    expect(edit.mutation.concurrency).toEqual({ required: true });
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_payment_method_action_crud', ['schema', 'data']);
    const updated = await repository.executeMutation(edit.mutation, { id: 'pos-method-card', expected_row_version: 1, values: { name: 'Card terminal', sequence: 2 } });
    expect(updated).toMatchObject({ id: 'pos-method-card', name: 'Card terminal', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'pos-method-card', expected_row_version: 1, values: { name: 'Stale card' } })).rejects.toMatchObject({ status: 409 });
    database.close();
    expect(yaml('pages/pos-payment-method-detail.yaml').page.id).toBe(detail.page.id);
  });
});
