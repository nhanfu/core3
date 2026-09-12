import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

function action(page: any, id: string) {
  return page.actions.find((candidate: any) => candidate.id === id);
}

describe('POS session parity batch', () => {
  test('exposes the Sessions menu and registered detail route', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/sessions', label: 'Sessions' }));
    expect(yaml('pages/sessions.yaml').page.route).toBe('/point-of-sale/sessions');
    expect(yaml('api/sessions.yaml').actions.find((action: any) => action.id === 'view_pos_session').navigate_to).toBe('/point-of-sale/session-detail');
  });

  test('covers all Odoo session lifecycle states with guarded controls', () => {
    const workflow = yaml('pages/pos-workflow.yaml').workflow;
    expect(workflow.states.map((state: any) => state.id)).toEqual(['Opening Control', 'In Progress', 'Closing Control', 'Closed & Posted']);
    expect(workflow.transitions.map((transition: any) => transition.id)).toEqual(['open', 'start_closing', 'close']);
    const detail = yaml('pages/pos-session-detail.yaml').components.find((component: any) => component.type === 'OdooFormView');
    expect(detail.statusbar.map((state: any) => state.value)).toEqual(workflow.states.map((state: any) => state.id));
    expect(detail.header_actions.map((action: any) => action.id)).toEqual(expect.arrayContaining(['open_session_detail', 'start_closing_session_detail', 'close_session_detail']));
  });

  test('keeps lifecycle fixture data service-owned and deterministic', () => {
    const fixture = yaml('migrations/20260910120000-012-pos-session-parity.yaml');
    expect(fixture.kind).toBe('data');
    expect(fixture.type.postgres.up).toContain("'pos-session-demo-opening'");
    expect(fixture.type.postgres.up).toContain("'pos-session-demo-closing'");
    expect(fixture.type.postgres.up).toContain("'pos-session-demo-closed'");
  });
});

describe('POS Orders Analysis parity', () => {
  test('registers the distinct Reporting Orders action and joins page/API by id', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    const page = yaml('pages/pos-orders-analysis.yaml');
    const api = yaml('api/pos-orders-analysis.yaml');
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/orders-analysis', label: 'Orders', permission: 'pos.read' }));
    expect(page.page.id).toBe('pos-orders-analysis');
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.route).toBe('/point-of-sale/orders-analysis');
  });

  test('matches Odoo graph/pivot fields and keeps the default cancelled exclusion service-owned', () => {
    const page = yaml('pages/pos-orders-analysis.yaml');
    const api = yaml('api/pos-orders-analysis.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(list.views[0]).toMatchObject({ category_field: 'category', measure_field: 'total_price', measure_label: 'Total Price', type: 'bar' });
    expect(list.views[1].pivot.default).toMatchObject({ rows: ['category'], columns: ['state'] });
    expect(list.views[1].show_leaf_rows).toBe(false);
    expect(list.views[1].pivot.default.measures).toEqual(expect.arrayContaining([
      { field: 'order_count', aggregate: 'sum', column: 'Orders' },
      { field: 'total_price', aggregate: 'sum', column: 'Total Price' },
    ]));
    expect(api.datasources[0]).toMatchObject({ id: 'pos_orders_analysis', permission: 'pos.read' });
    expect(api.datasources[0].query).toContain("WHERE state <> 'Cancelled'");
    expect(api.datasources[0].pivot.fields).toEqual(['category', 'state', 'order_count', 'total_price']);
  });

  test('seeds deterministic grouped analysis values for graph and pivot states', () => {
    const migration = yaml('migrations/20260911093000-021-pos-orders-analysis.yaml');
    expect(migration.kind).toBe('data');
    expect(migration.type.postgres.up).toContain("'pos-analysis-demo-001'");
    expect(migration.type.postgres.up).toContain("'Furniture / Office'");
    expect(migration.type.postgres.up).toContain("'Goods', 'Cancelled'");
    expect(migration.type.postgres.up).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration.type.postgres.up).not.toContain('CURRENT_TIMESTAMP');
  });
});

describe('POS payments list/detail parity', () => {
  test('keeps the payment list read-only and opens the Odoo payment form', () => {
    const page = yaml('pages/pos-payments.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(list.default_group_by).toBe('method');
    expect(list.group_by).toEqual([{ field: 'method', label: 'Payment Method' }]);
    expect(list.row_open_action).toBe('view_pos_payment');
    expect(list.row_double_click_action).toBe('view_pos_payment');
    expect(list.form_view).toEqual({ page: 'apps/services/point_of_sale/pages/pos-payment-detail.yaml', side_panel: false });
    expect(yaml('api/pos-payments.yaml').actions).toContainEqual(expect.objectContaining({
      id: 'view_pos_payment',
      navigate_to: '/point-of-sale/payment-detail',
    }));
  });

  test('owns the read-only payment detail fields in a page-id API fragment', () => {
    const page = yaml('pages/pos-payment-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(page.page.id).toBe('pos-payment-detail');
    expect(yaml('api/pos-payment-detail.yaml').page.id).toBe(page.page.id);
    expect(form.groups[0].fields.map((field: any) => field.field)).toEqual([
      'session_name', 'order_name', 'amount', 'currency', 'method', 'payment_date', 'state',
    ]);
    expect(yaml('api/pos-payment-detail.yaml').datasources[0].query).toContain('WHERE p.id = :id');
  });

  test('seeds a second tender so the default payment-method grouping is visible', () => {
    const migration = yaml('migrations/20260910190000-018-pos-payment-detail.yaml');
    expect(migration.kind).toBe('data');
    expect(migration.type.postgres.up).toContain("'pos-payment-demo-002'");
    expect(migration.type.postgres.up).toContain("'Cash'");
  });
});

describe('POS payment method detail parity', () => {
  test('matches Odoo edit state, labels, and POS-owned update contract', () => {
    const page = yaml('pages/pos-payment-method-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const api = yaml('api/pos-payment-method-detail.yaml');
    const edit = action(api, 'edit_pos_payment_method');

    expect(form).toMatchObject({
      title_field: 'name',
      editable: true,
      header_actions: [{ id: 'edit_pos_payment_method', label: 'Edit', permission: 'pos.manage' }],
    });
    expect(form.groups[0].fields).toEqual([
      { field: 'name', label: 'Method' }, { field: 'sequence', label: 'Sequence' },
      { field: 'split_transactions', label: 'Split Transactions' }, { field: 'journal', label: 'Journal' },
      { field: 'account', label: 'Account' }, { field: 'receivable_account', label: 'Receivable Account' },
      { field: 'company', label: 'Company' }, { field: 'point_of_sale', label: 'Point of Sale' },
      { field: 'payment_method_type', label: 'Payment Method Type' }, { field: 'use_payment_terminal', label: 'Integrate with' },
      { field: 'active', label: 'Active' },
    ]);
    expect(edit).toMatchObject({
      type: 'server_form', permission: 'pos.manage', operation: 'update',
      action: 'pos.payment_methods.update',
    });
    expect(edit.mutation).toMatchObject({
      operation: 'update', table: 'pos_payment_methods',
      fields: expect.arrayContaining(['name', 'journal', 'point_of_sale', 'active', 'sequence', 'account']),
    });
    expect(edit.fields).toContainEqual({ field: 'active', label: 'Active', type: 'checkbox' });
  });
});

describe('POS preset detail parity batch', () => {
  test('keeps the preset page and API contracts joined by page.id', () => {
    const listPage = yaml('pages/pos-presets.yaml');
    const listApi = yaml('api/pos-presets.yaml');
    const detailPage = yaml('pages/pos-preset-detail.yaml');
    const detailApi = yaml('api/pos-preset-detail.yaml');

    expect(listPage.page.id).toBe('pos-presets');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailPage.page.id).toBe('pos-preset-detail');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0]).toMatchObject({
      row_open_action: 'view_pos_order_preset',
      row_double_click_action: 'view_pos_order_preset',
      empty_state: expect.objectContaining({ title: 'No presets' }),
    });
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual(['Label', 'Manage orders by time', 'Identification', 'Color']);
    expect(listPage.components[0].selectable).toBe(true);
    expect(listPage.components[0].column_chooser).toBe(true);
    expect(action(listApi, 'view_pos_order_preset')).toMatchObject({
      navigate_to: '/point-of-sale/preset-detail',
      params: { id: '{row.id}' },
      permission: 'pos.read',
    });
    expect(action(detailApi, 'edit_pos_order_preset')).toMatchObject({
      type: 'server_form', permission: 'pos.manage', operation: 'update',
    });
    expect(action(detailApi, 'edit_pos_order_preset').fields.find((field: any) => field.field === 'service_mode').options)
      .toEqual(['Takeout', 'Dine In', 'Delivery']);
    expect(detailPage.components[0]).toMatchObject({
      editable: true,
      header_actions: [{ id: 'edit_pos_order_preset', label: 'Edit', permission: 'pos.manage' }],
    });
    expect(detailPage.components[0].groups.flatMap((group: any) => group.fields.map((field: any) => field.field)))
      .toEqual(expect.arrayContaining(['use_timing', 'identification', 'is_return', 'available_in_self', 'email_confirmation']));
    expect(detailPage.components[0].stat_buttons.map((button: any) => button.label)).toEqual(['Order(s)', 'PoS Config']);
  });

  test('creates and updates presets with required fields and stale-write protection', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE pos_order_presets(
        id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, name VARCHAR, service_mode VARCHAR,
        pricelist VARCHAR, fiscal_position VARCHAR, use_timing BOOLEAN DEFAULT false, schedule VARCHAR,
        slots_per_interval INTEGER DEFAULT 5, interval_time INTEGER DEFAULT 20,
        identification VARCHAR DEFAULT 'Not required', is_return BOOLEAN DEFAULT false,
        color INTEGER DEFAULT 0, available_in_self BOOLEAN DEFAULT false, service_at VARCHAR DEFAULT 'Table',
        email_confirmation BOOLEAN DEFAULT false, preparation_minutes INTEGER DEFAULT 0,
        guest_count INTEGER DEFAULT 1, note VARCHAR, active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO pos_order_presets(id, name, service_mode) VALUES ('preset-1', 'Dine In', 'Dine in');
    `);

    const listApi = yaml('api/pos-presets.yaml');
    const detailApi = yaml('api/pos-preset-detail.yaml');
    const create = action(listApi, 'create_pos_order_preset');
    const edit = action(detailApi, 'edit_pos_order_preset');

    await expect(repository.executeMutation(create.mutation, { values: { service_mode: 'Takeaway' } }))
      .rejects.toThrow('name is required');
    const created = await repository.executeMutation(create.mutation, {
      id: 'preset-new', values: { name: 'Counter pickup', service_mode: 'Takeaway', identification: 'Name' },
    });
    expect(created).toMatchObject({ id: 'preset-new', name: 'Counter pickup', service_mode: 'Takeaway' });

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'preset-1', expected_row_version: 1,
      values: { name: 'Dine in express', service_mode: 'Dine in', use_timing: true, slots_per_interval: 8 },
    });
    expect(updated).toMatchObject({ id: 'preset-1', name: 'Dine in express', use_timing: true, slots_per_interval: 8, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'preset-1', expected_row_version: 1, values: { name: 'Stale edit', service_mode: 'Dine in' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });
});
