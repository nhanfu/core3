import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('POS Pricelists action 2 form parity', () => {
  test('joins the Odoo list/form page and API contracts', () => {
    const list = yaml('pages/pos-pricelists.yaml');
    const detail = yaml('pages/pos-pricelist-detail.yaml');
    const api = yaml('api/pos-pricelist-detail.yaml');
    expect(list.components[0]).toMatchObject({ row_open_action: 'view_pos_pricelist', row_double_click_action: 'view_pos_pricelist' });
    expect(list.actions[0]).toMatchObject({ navigate_to: '/point-of-sale/pricelist-detail', permission: 'pos.read' });
    expect(detail.page).toMatchObject({ id: 'pos-pricelist-detail', route: '/point-of-sale/pricelist-detail' });
    expect(api.page.id).toBe(detail.page.id);
    expect(detail.components[1]).toMatchObject({ source: 'pos_pricelist_rules', variant: 'odoo_x2many' });
    expect(detail.components[1].title).toBe('Sales Prices');
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, not_found: { status: 404 }, transport_error: { status: 503 } });
    expect(action(api, 'edit_pos_pricelist').permission).toBe('pos.manage');
    expect(action(api, 'add_pos_pricelist_rule').permission).toBe('pos.manage');
  });

  test('seeds stable rules and enforces CRUD, invalid, stale, missing, empty, and permission contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_pricelist_detail', ['schema', 'data']);
    const api = yaml('api/pos-pricelist-detail.yaml');
    const detail = api.datasources[0];
    const rules = api.datasources[1];
    expect((await repository.querySource(detail, { id: 'pos-pricelist-public', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'Public Pricelist', row_version: 1 });
    expect((await repository.querySource(rules, { id: 'pos-pricelist-public' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(rules, { id: 'pos-pricelist-public', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const update = action(api, 'edit_pos_pricelist');
    const add = action(api, 'add_pos_pricelist_rule');
    const editRule = action(api, 'edit_pos_pricelist_rule');
    const removeRule = action(api, 'delete_pos_pricelist_rule');
    const edited = await repository.executeMutation(update.mutation, { id: 'pos-pricelist-public', expected_row_version: 1, values: { name: 'Public Retail', country_groups: 'All countries', company: 'My Company (San Francisco)', currency: 'USD', active: true } });
    expect(edited).toMatchObject({ id: 'pos-pricelist-public', name: 'Public Retail', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: 'pos-pricelist-public', expected_row_version: 1, values: { name: 'Stale', company: 'My Company (San Francisco)', currency: 'USD' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(update.mutation, { id: 'pos-pricelist-public', expected_row_version: 2, values: { name: '', company: 'My Company (San Francisco)', currency: 'USD' } })).rejects.toMatchObject({ status: 422, code: 'POS_PRICELIST_NAME_REQUIRED' });
    const created = await repository.executeMutation(add.mutation, { id: 'pos-pricelist-public', values: { rule_name: 'Espresso', price: 2.75, min_quantity: 1, date_start: '2026-01-15', date_end: '' } });
    expect(created).toMatchObject({ pricelist_id: 'pos-pricelist-public', rule_name: 'Espresso', price: 2.75 });
    await expect(repository.executeMutation(add.mutation, { id: 'pos-pricelist-public', values: { rule_name: '', price: -1, min_quantity: 0 } })).rejects.toMatchObject({ status: 422, code: 'POS_PRICELIST_RULE_INVALID' });
    const ruleId = created.id;
    const changed = await repository.executeMutation(editRule.mutation, { id: 'pos-pricelist-public', line_id: ruleId, expected_row_version: 1, values: { rule_name: 'Espresso Large', price: 3.25, min_quantity: 1, date_start: '2026-01-15', date_end: '' } });
    expect(changed).toMatchObject({ id: ruleId, rule_name: 'Espresso Large', row_version: 2 });
    await expect(repository.executeMutation(removeRule.mutation, { id: 'pos-pricelist-public', line_id: ruleId, expected_row_version: 1 })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(removeRule.mutation, { id: 'pos-pricelist-public', line_id: 'missing-rule', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'POS_PRICELIST_RULE_NOT_FOUND' });
    database.close();
  });
});
