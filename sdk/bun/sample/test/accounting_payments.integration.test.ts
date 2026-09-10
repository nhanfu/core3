import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting customer payments parity', () => {
  test('matches the Odoo Payments view family and navigation contract', () => {
    const page = yaml('pages/payments.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'graph', 'activity']);
    expect(list.row_open_action).toBe('view_accounting_payment');
    expect(list.row_double_click_action).toBe('view_accounting_payment');
    expect(list.form_view).toEqual({ page: 'apps/services/accounting/pages/payment-detail.yaml', side_panel: false });
    expect(yaml('api/payments.yaml').actions).toContainEqual(expect.objectContaining({
      id: 'view_accounting_payment',
      navigate_to: '/accounting/payment-detail',
    }));
  });

  test('keeps payment detail and list API fragments joined by page ids', () => {
    const detail = yaml('pages/payment-detail.yaml');
    const api = yaml('api/payment-detail.yaml');
    const detailSource = api.datasources.find((source: any) => source.id === 'accounting_payment_detail');
    expect(detail.page.id).toBe('payment-detail');
    expect(api.page.id).toBe(detail.page.id);
    expect(detailSource.single).toBe(true);
    expect(detailSource.query).toContain('WHERE id = :id');
    expect(detail.components[0].source).toBe(detailSource.id);
  });

  test('adds deterministic journal and currency defaults for every payment view', () => {
    const migration = yaml('migrations/20260910190000-010-accounting-payment-views.yaml');
    const query = yaml('api/payments.yaml').datasources.find((source: any) => source.id === 'accounting_payments').query;
    expect(migration.kind).toBe('data');
    expect(migration.type.postgres.up).toContain('ADD COLUMN IF NOT EXISTS journal');
    expect(migration.type.postgres.up).toContain("DEFAULT 'USD'");
    expect(query).toContain('amount_display');
    expect(query).toContain('activity_summary');
  });
});
