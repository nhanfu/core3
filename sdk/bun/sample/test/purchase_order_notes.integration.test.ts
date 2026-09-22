import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/purchase-detail.yaml');
const api = yaml('api/purchase-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_order_notes_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Purchase order note-line parity', () => {
  test('binds the Odoo Add a note control through the purchase-detail page/API pair', () => {
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid');
    const lineActions = grid.children.find((child: any) => child.type === 'LineItemActions');

    expect(page.page).toMatchObject({ id: 'purchase-detail', route: '/purchase/detail' });
    expect(api.page).toEqual({ id: 'purchase-detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((item: any) => item.id)).toEqual(expect.arrayContaining(['purchase_order_detail', 'purchase_order_lines']));
    expect(grid.actions.map((item: any) => item.label)).toEqual(['Add a product', 'Add a section', 'Add a note', 'Catalog']);
    expect(action('add_purchase_order_note')).toMatchObject({
      permission: 'purchase.write', handler: 'line_item', operation: 'create',
      action: 'purchase.orders.lines.note.create',
    });
    expect(action('add_purchase_order_note').fields).toEqual([
      expect.objectContaining({ field: 'description', label: 'Note', type: 'text', required: true }),
    ]);
    expect(lineActions.actions.map((item: any) => item.id)).toEqual([
      'edit_purchase_order_line', 'edit_purchase_order_section', 'edit_purchase_order_note',
      'delete_purchase_order_line', 'delete_purchase_order_section', 'delete_purchase_order_note',
    ]);
    expect(source('purchase_order_lines').query).toContain('l.display_type');
  });

  test('creates, edits, and deletes a durable zero-total note without changing the order total', async () => {
    const { database, repository } = await repositoryForTest();
    const before = (await repository.query("SELECT row_version, total_amount FROM purchase_orders WHERE id = 'po-demo-001'"))[0] as any;
    const create = action('add_purchase_order_note');
    const note = await repository.executeMutation(create.mutation, {
      id: 'po-demo-001', parent_expected_row_version: before.row_version,
      values: { description: 'Confirm delivery window with the vendor' },
    }) as any;
    expect(note).toMatchObject({ order_id: 'po-demo-001', display_type: 'line_note', description: 'Confirm delivery window with the vendor', quantity: 0, line_total: 0, row_version: 1 });
    expect(await repository.query("SELECT row_version, total_amount FROM purchase_orders WHERE id = 'po-demo-001'"))
      .toEqual([{ row_version: Number(before.row_version) + 1, total_amount: before.total_amount }]);

    const edited = await repository.executeMutation(action('edit_purchase_order_note').mutation, {
      id: 'po-demo-001', line_id: note.id, parent_expected_row_version: Number(before.row_version) + 1,
      expected_row_version: 1, values: { description: 'Vendor must confirm delivery window' },
    }) as any;
    expect(edited).toMatchObject({ id: note.id, display_type: 'line_note', description: 'Vendor must confirm delivery window', row_version: 2 });

    const deleted = await repository.executeMutation(action('delete_purchase_order_note').mutation, {
      id: 'po-demo-001', line_id: note.id, parent_expected_row_version: Number(before.row_version) + 2,
      expected_row_version: 2,
    }) as any;
    expect(deleted).toEqual({ deleted: true, id: note.id });
    expect(await repository.query('SELECT id FROM purchase_order_lines WHERE id = ?', [note.id])).toEqual([]);
    await database.close();
  });

  test('serves the seeded note and rejects invalid, stale, locked, and non-note writes', async () => {
    const { database, repository } = await repositoryForTest();
    expect(await repository.querySource(source('purchase_order_lines'), { id: 'po-demo-008', fixture_state: null }, 0, 50)).toMatchObject({
      data: expect.arrayContaining([expect.objectContaining({ id: 'purchase-note-demo-008-20', display_type: 'line_note', description: 'Confirm delivery window with the vendor' })]),
    });
    const create = action('add_purchase_order_note');
    const before = (await repository.query("SELECT row_version FROM purchase_orders WHERE id = 'po-demo-001'"))[0] as any;
    await expect(repository.executeMutation(create.mutation, { id: 'po-demo-001', parent_expected_row_version: before.row_version, values: { description: ' ' } }))
      .rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_NOTE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'po-demo-001', parent_expected_row_version: Number(before.row_version) - 1, values: { description: 'Stale note' } }))
      .rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_NOTE_STALE' });
    await expect(repository.executeMutation(create.mutation, { id: 'po-demo-005', parent_expected_row_version: 1, values: { description: 'Confirmed orders cannot add notes' } }))
      .rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_NOTE_STALE' });
    const product = (await repository.query("SELECT id, row_version FROM purchase_order_lines WHERE order_id = 'po-demo-001' AND display_type = 'product' ORDER BY id LIMIT 1"))[0] as any;
    await expect(repository.executeMutation(action('edit_purchase_order_note').mutation, {
      id: 'po-demo-001', line_id: product.id, parent_expected_row_version: before.row_version, expected_row_version: product.row_version,
      values: { description: 'Must remain a product action' },
    })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_NOTE_LINE_STALE' });
    await database.close();
  });

  test('replays the note migration and preserves note data across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-purchase-notes-'));
    const databasePath = join(directory, 'purchase.duckdb');
    try {
      const first = await repositoryForTest(databasePath);
      await first.database.close();
      const second = await repositoryForTest(databasePath);
      expect(await second.repository.query("SELECT display_type, description FROM purchase_order_lines WHERE id = 'purchase-note-demo-008-20'"))
        .toEqual([{ display_type: 'line_note', description: 'Confirm delivery window with the vendor' }]);
      expect(await second.repository.query("SELECT COUNT(*) AS count FROM purchase_order_notes_test_migrations WHERE version = '0.0.34'"))
        .toEqual([{ count: 1 }]);
      await second.database.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
