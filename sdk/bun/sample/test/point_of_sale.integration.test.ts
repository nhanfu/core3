import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

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
