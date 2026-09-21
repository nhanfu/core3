import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/sale-order-detail.yaml');
const api = yaml('api/sale-order-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);
const linesSource = api.datasources.find((source: any) => source.id === 'sale_order_lines');

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_order_display_lines_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_order_display_lines_test_migrations', ['schema', 'data']);
  return { database, repository };
}

const actor = {
  view_scope: 'all',
  current_branch_id: 'branch-hcm',
  current_user_id: 'user-admin',
  current_user_name: 'Admin User',
};

describe('Sales order section and note line parity', () => {
  test('keeps the page/API binding and Odoo x2many controls explicit', () => {
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid');
    const lineActions = grid.children.find((child: any) => child.type === 'LineItemActions');

    expect(page.page).toMatchObject({ id: 'sale-order-detail', route: '/order/sale-order' });
    expect(api.page).toEqual({ id: 'sale-order-detail' });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('sale-order-detail'))
      .toEqual(expect.arrayContaining(['sale_order_detail', 'sale_order_lines']));
    expect(grid.actions.map((item: any) => item.label)).toEqual(['Add a product', 'Add a section', 'Add a note']);
    expect(action('add_sale_order_section')).toMatchObject({ permission: 'orders.write', handler: 'line_item', operation: 'create' });
    expect(action('add_sale_order_note')).toMatchObject({ permission: 'orders.write', handler: 'line_item', operation: 'create' });
    expect(lineActions.actions.map((item: any) => item.id)).toEqual(['edit_sale_order_display_line', 'delete_sale_order_display_line']);
    expect(api.datasources.find((source: any) => source.id === 'sale_order_lines').query).toContain("COALESCE(l.display_type, 'product') AS display_type");
    expect(action('add_sale_order_section').fields).toEqual([{ field: 'description', label: 'Section', type: 'text', required: true }]);
    expect(action('add_sale_order_note').fields).toEqual([{ field: 'description', label: 'Note', type: 'text', required: true }]);
  });

  test('creates, edits, and deletes durable zero-total display lines without changing order totals', async () => {
    const { database, repository } = await repositoryForTest();
    const before = (await repository.query("SELECT row_version, total_amount FROM orders WHERE id = 'order-demo-01'"))[0];
    const createSection = action('add_sale_order_section');
    const createNote = action('add_sale_order_note');
    const edit = action('edit_sale_order_display_line');
    const remove = action('delete_sale_order_display_line');

    const section = await repository.executeMutation(createSection.mutation, {
      id: 'order-demo-01', parent_expected_row_version: before.row_version, ...actor,
      values: { description: 'Implementation services' },
    }) as any;
    expect(section).toMatchObject({ order_id: 'order-demo-01', display_type: 'line_section', description: 'Implementation services', quantity: 0, unit_price: 0, line_total: 0, row_version: 1 });

    const note = await repository.executeMutation(createNote.mutation, {
      id: 'order-demo-01', parent_expected_row_version: Number(before.row_version) + 1, ...actor,
      values: { description: 'Delivery scheduled after customer approval.' },
    }) as any;
    expect(note).toMatchObject({ order_id: 'order-demo-01', display_type: 'line_note', description: 'Delivery scheduled after customer approval.', quantity: 0, unit_price: 0, line_total: 0, row_version: 1 });

    const listed = (await repository.querySource(linesSource, { id: 'order-demo-01', ...actor }, 0, 50)).data as any[];
    expect(listed.filter((row) => row.display_type !== 'product').map((row) => row.description)).toEqual([
      'Implementation services',
      'Delivery scheduled after customer approval.',
    ]);
    expect(await repository.query("SELECT row_version, total_amount FROM orders WHERE id = 'order-demo-01'"))
      .toEqual([{ row_version: Number(before.row_version) + 2, total_amount: before.total_amount }]);

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'order-demo-01', line_id: section.id, parent_expected_row_version: Number(before.row_version) + 2,
      expected_row_version: 1, ...actor, values: { description: 'Implementation and support services' },
    }) as any;
    expect(updated).toMatchObject({ id: section.id, display_type: 'line_section', description: 'Implementation and support services', row_version: 2 });

    await repository.executeMutation(remove.mutation, {
      id: 'order-demo-01', line_id: note.id, parent_expected_row_version: Number(before.row_version) + 3,
      expected_row_version: 1, ...actor,
    });
    expect(await repository.query("SELECT display_type, description FROM order_lines WHERE id = ?", [note.id])).toEqual([]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM system_activity WHERE resource_id = 'order-demo-01' AND action IN ('orders.lines.section.create', 'orders.lines.note.create', 'orders.lines.display.update', 'orders.lines.display.delete')"))
      .toEqual([{ count: 4 }]);
    await database.close();
  }, 30000);

  test('rejects invalid, stale, out-of-scope, and locked display-line writes', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('add_sale_order_section');
    const before = (await repository.query("SELECT row_version FROM orders WHERE id = 'order-demo-01'"))[0].row_version;
    const params = { id: 'order-demo-01', parent_expected_row_version: before, ...actor };

    await expect(repository.executeMutation(create.mutation, { ...params, values: { description: ' ' } }))
      .rejects.toMatchObject({ status: 422, code: 'SALE_ORDER_DISPLAY_LINE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { ...params, parent_expected_row_version: Number(before) - 1, values: { description: 'Stale section' } }))
      .rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_DISPLAY_LINE_STALE' });
    await expect(repository.executeMutation(create.mutation, { ...params, view_scope: 'branch', current_branch_id: 'branch-da-nang', values: { description: 'Foreign section' } }))
      .rejects.toMatchObject({ status: 403 });

    await repository.run("UPDATE orders SET status = 'Approved' WHERE id = 'order-demo-01'");
    await expect(repository.executeMutation(create.mutation, { ...params, values: { description: 'Locked section' } }))
      .rejects.toMatchObject({ status: 409, code: 'SALE_ORDER_DISPLAY_LINE_STALE' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM order_lines WHERE order_id = 'order-demo-01' AND display_type IS NOT NULL"))
      .toEqual([{ count: 0 }]);
    await database.close();
  }, 30000);

  test('retains display lines after file-backed restart and migration replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-sales-display-lines-'));
    const databasePath = join(directory, 'sales.duckdb');
    try {
      const first = await repositoryForTest(databasePath);
      const before = (await first.repository.query("SELECT row_version FROM orders WHERE id = 'order-demo-01'"))[0].row_version;
      const created = await first.repository.executeMutation(action('add_sale_order_note').mutation, {
        id: 'order-demo-01', parent_expected_row_version: before, ...actor,
        values: { description: 'Restart-safe customer note' },
      }) as any;
      await first.database.close();

      const reopened = await repositoryForTest(databasePath);
      expect(await reopened.repository.query("SELECT display_type, description, quantity, unit_price FROM order_lines WHERE id = ?", [created.id]))
        .toEqual([{ display_type: 'line_note', description: 'Restart-safe customer note', quantity: 0, unit_price: 0 }]);
      expect(await reopened.repository.query("SELECT COUNT(*) AS count FROM sales_order_display_lines_test_migrations WHERE version = '0.0.22'"))
        .toEqual([{ count: 1 }]);
      await reopened.database.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 30000);
});
