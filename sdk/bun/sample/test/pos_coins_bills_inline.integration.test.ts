import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS Coins/Bills inline list parity', () => {
  test('joins the Odoo-shaped page and API contracts', () => {
    const page = yaml('pages/pos-coins-bills.yaml');
    const api = yaml('api/pos-coins-bills.yaml');
    const list = page.components[0];

    expect(page.title).toBe('Coins/Bills');
    expect(page.page.id).toBe('pos-coins-bills');
    expect(api.page.id).toBe(page.page.id);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Name', 'Value', 'Point of Sales']);
    expect(list).toMatchObject({ selectable: true, column_chooser: true });
    expect(list.inline_edit).toMatchObject({
      create_action: 'create_pos_cash_denomination_inline',
      update_action: 'update_pos_cash_denomination_inline',
      save_label: 'Save',
      discard_label: 'Discard',
    });
    expect(api.datasources[0].query).toContain("For all point of sale.");
  });

  test('seeds the thirteen Odoo reference denominations and persists guarded edits', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_coins_bills_inline_migrations', ['schema', 'data']);

    const api = yaml('api/pos-coins-bills.yaml');
    const source = api.datasources[0];
    const rows = await repository.querySource(source, { q: null }, 0, 50);
    expect(rows.data).toHaveLength(13);
    expect(rows.data.map((row: any) => row.name)).toEqual([
      '0.05', '0.10', '0.20', '0.25', '0.50', '1.00', '2.00', '5.00',
      '10.00', '20.00', '50.00', '100.00', '200.00',
    ]);
    expect(rows.data[0]).toMatchObject({ value: '0.0500', pos_config_ids: 'For all point of sale.', row_version: 1 });

    const page = yaml('pages/pos-coins-bills.yaml');
    const create = page.actions.find((action: any) => action.id === 'create_pos_cash_denomination_inline');
    const update = page.actions.find((action: any) => action.id === 'update_pos_cash_denomination_inline');
    expect(create.permission).toBe('pos.manage');
    expect(update.permission).toBe('pos.manage');

    await expect(repository.executeMutation(update.mutation, {
      id: 'pos-cash-001', expected_row_version: 1, values: { name: '', value: '0.10', pos_config_ids: 'For all point of sale.' },
    })).rejects.toThrow('name is required');
    const edited = await repository.executeMutation(update.mutation, {
      id: 'pos-cash-001', expected_row_version: 1, values: { name: '0.05', value: '0.0500', pos_config_ids: 'Furniture Shop' },
    });
    expect(edited).toMatchObject({ id: 'pos-cash-001', name: '0.05', value: 0.05, pos_config_ids: 'Furniture Shop' });
    await expect(repository.executeMutation(update.mutation, {
      id: 'pos-cash-001', expected_row_version: 1, values: { name: 'Stale', value: '0.10' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const created = await repository.executeMutation(create.mutation, {
      values: { name: '500.00', value: '500.0000', pos_config_ids: 'For all point of sale.' },
    });
    expect(created).toMatchObject({ name: '500.00', value: 500, pos_config_ids: 'For all point of sale.' });
    database.close();
  });
});
