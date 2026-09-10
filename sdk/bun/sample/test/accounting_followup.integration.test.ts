import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const screens = [
  ['payment-tokens', 'payment-tokens', 'accounting_payment_tokens'],
  ['reconciliation', 'reconciliation', 'accounting_reconciliation'],
  ['invoice-analysis', 'invoice-analysis', 'accounting_invoice_analysis'],
  ['analytic-report', 'analytic-report', 'accounting_analytic_report'],
  ['partner-reports', 'partner-reports', 'accounting_partner_report'],
  ['report-taxes', 'tax-reports', 'accounting_tax_report'],
  ['report-statements', 'statement-reports', 'accounting_statement_report'],
] as const;

describe('Accounting empty, search, and permission parity batch', () => {
  test('keeps the selected screens page-layout-only with page-ID API ownership', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    for (const [pageFile, pageId, sourceId] of screens) {
      const page = yaml(`pages/${pageFile}.yaml`);
      const list = page.components.find((component: any) => component.type === 'ListView');
      const api = yaml(`api/${pageFile}.yaml`);
      const source = api.datasources.find((candidate: any) => candidate.id === sourceId);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.auth.require, pageFile).toEqual(['accounting.read']);
      expect(list.source, pageFile).toBe(sourceId);
      expect(list.search, pageFile).toMatchObject({ label: expect.any(String), placeholder: expect.any(String) });
      expect(list.empty_state, pageFile).toMatchObject({ title: expect.any(String) });
      expect(api.page.id, pageFile).toBe(pageId);
      expect(source.permission, pageFile).toBe('accounting.read');
      expect(String(source.query), pageFile).toContain(':q IS NULL');
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
    }
  });

  test('declares report pivot fields beside the service-owned report queries', () => {
    expect(yaml('api/invoice-analysis.yaml').datasources[0].pivot.fields).toEqual(['invoice_type', 'state', 'invoice_count', 'total', 'outstanding']);
    expect(yaml('api/analytic-report.yaml').datasources[0].pivot.fields).toEqual(['plan', 'account', 'label', 'amount', 'state']);
    expect(yaml('api/partner-reports.yaml').datasources[0].pivot.fields).toEqual(['partner_name', 'document_count', 'total', 'due']);
  });

  test('keeps reconciliation payment errors and write permission server-side', () => {
    const page = yaml('pages/reconciliation.yaml');
    expect(page.components[0].columns.at(-1).actions).toEqual([
      { id: 'reconcile_invoice', label: 'Register payment', permission: 'accounting.write' },
    ]);
    const action = yaml('api/reconciliation.yaml').actions.find((candidate: any) => candidate.id === 'reconcile_invoice');
    expect(action).toMatchObject({ type: 'server_form', permission: 'accounting.write', handler: 'yaml_mutation', operation: 'pay' });
    expect(action.mutation.guards).toEqual([
      expect.objectContaining({ status: 409, message: 'Only posted invoices with a balance can be reconciled' }),
      expect.objectContaining({ status: 422, message: 'Payment must be positive and cannot exceed the amount due' }),
    ]);
    expect(action.mutation.steps).toHaveLength(2);
    expect(String(action.mutation.steps[1].query)).toContain("state = CASE WHEN amount_residual - CAST(:payment_amount AS DECIMAL(18,2)) <= 0 THEN 'Paid'");
  });
});
