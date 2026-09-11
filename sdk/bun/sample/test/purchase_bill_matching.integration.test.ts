import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const source = (id: string) => yaml('api/purchase-bill-matching.yaml').datasources.find((item: any) => item.id === id);
const action = (id: string) => yaml('api/purchase-bill-matching.yaml').actions.find((item: any) => item.id === id);

describe('Purchase bill matching parity', () => {
  test('binds the Odoo action through page-id API/page contracts with permissions', () => {
    const page = yaml('pages/purchase-bill-matching.yaml');
    const api = yaml('api/purchase-bill-matching.yaml');
    const list = page.components[0];
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'purchase-bill-matching' });
    expect(discovered.pageDatasources.get('purchase-bill-matching')).toEqual(expect.arrayContaining(['purchase_bill_line_matches', 'purchase_bill_matching_summary']));
    expect(list).toMatchObject({ source: 'purchase_bill_line_matches', selectable: true, responsive_card: false });
    expect(list.columns.map((item: any) => item.label)).toEqual(['Reference', 'Product Description', 'Quantity', 'Qty to invoice', 'Unit', 'Price', 'Billed', 'Purchased']);
    expect(list.bulk_actions).toEqual([
      expect.objectContaining({ id: 'match_purchase_bill_lines', label: 'Match', permission: 'accounting.write' }),
      expect.objectContaining({ id: 'add_purchase_bill_lines_to_po', label: 'Add to PO', permission: 'purchase.write' }),
    ]);
    expect(action('match_purchase_bill_lines')).toMatchObject({ permission: 'accounting.write', handler: 'yaml_mutation' });
    expect(action('add_purchase_bill_lines_to_po')).toMatchObject({ permission: 'purchase.write', type: 'server_form' });
    expect(yaml('pages/purchase-detail.yaml').components[0].stat_buttons[0]).toMatchObject({ id: 'open_purchase_bill_matching', hide_value: true, permission: 'accounting.write' });
  });

  test('serves populated, empty, and searchable Odoo-shaped rows and totals', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'purchase_bill_matching_read_migrations', ['schema', 'data']);
    const lines = source('purchase_bill_line_matches');
    expect((await repository.querySource(lines, { id: 'po-demo-006', q: null, fixture_state: null }, 0, 50)).data).toHaveLength(6);
    expect((await repository.querySource(lines, { id: 'po-demo-006', q: 'Flipover', fixture_state: null }, 0, 50)).data).toMatchObject([{ reference: 'P00012', product_description: '[FURN_9001] Flipover', purchased_amount: 1200 }]);
    expect((await repository.querySource(lines, { id: 'po-demo-006', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source('purchase_bill_matching_summary'), { id: 'po-demo-006', fixture_state: null }, 0, 1)).data).toMatchObject({ billed_total_display: '$ 0.00', purchased_total_display: '$ 6,936.00' });
    database.close();
  });

  test('guards matching and adding bill lines with stale and permission-ready mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'purchase_bill_matching_write_migrations', ['schema', 'data']);
    const match = action('match_purchase_bill_lines');
    const matchIds = ['purchase-bill-match-005-001', 'purchase-bill-match-005-002'];
    await repository.executeMutation(match.mutation, { purchase_order_id: 'po-demo-005', selectedIds: matchIds });
    await expect(repository.executeMutation(match.mutation, { purchase_order_id: 'po-demo-005', selectedIds: matchIds })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_BILL_MATCHING_LINES_INVALID' });
    const add = action('add_purchase_bill_lines_to_po');
    const addId = 'purchase-bill-match-005-003';
    const added = await repository.executeMutation(add.mutation, { source_purchase_order_id: 'po-demo-005', purchase_order_id: 'po-demo-005', selectedIds: [addId] });
    expect(added).toMatchObject({ order_id: 'po-demo-005' });
    await expect(repository.executeMutation(add.mutation, { source_purchase_order_id: 'po-demo-006', purchase_order_id: 'po-demo-006', selectedIds: ['purchase-bill-match-006-003'] })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_BILL_MATCHING_PO_STALE' });
    database.close();
  });
});
