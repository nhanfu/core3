import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((candidate: any) => candidate.id === id);

const reportAndCatalogScreens = [
  ['payment-tokens', 'payment-tokens', 'payment-tokens.yaml', 'accounting_payment_tokens'],
  ['reconciliation', 'reconciliation', 'reconciliation.yaml', 'accounting_reconciliation'],
  ['invoice-analysis', 'invoice-analysis', 'invoice-analysis.yaml', 'accounting_invoice_analysis'],
  ['analytic-report', 'analytic-report', 'analytic-report.yaml', 'accounting_analytic_report'],
  ['partner-reports', 'partner-reports', 'partner-reports.yaml', 'accounting_partner_report'],
  ['report-taxes', 'tax-reports', 'report-taxes.yaml', 'accounting_tax_report'],
  ['report-statements', 'statement-reports', 'report-statements.yaml', 'accounting_statement_report'],
  ['chart-of-accounts', 'chart-of-accounts', 'config-accounts.yaml', 'accounting_chart_of_accounts'],
  ['journals', 'journals', 'config-journals.yaml', 'accounting_journals'],
  ['taxes', 'taxes', 'config-taxes.yaml', 'accounting_taxes'],
  ['payment-terms', 'payment-terms', 'config-payment-terms.yaml', 'accounting_payment_terms'],
  ['payment-methods', 'payment-methods', 'config-payment-methods.yaml', 'accounting_payment_methods'],
] as const;

describe('Accounting resilient report/configuration states', () => {
  test('keeps every bounded route layout-only with a page-ID API fragment', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    for (const [pageFile, pageId, apiFile, sourceId] of reportAndCatalogScreens) {
      const page = yaml(`pages/${pageFile}.yaml`);
      const list = page.components.find((component: any) => component.type === 'ListView');
      const api = yaml(`api/${apiFile}`);
      const readSource = api.datasources.find((candidate: any) => candidate.id === sourceId);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.auth.require, pageFile).toEqual(['accounting.read']);
      expect(list.source, pageFile).toBe(sourceId);
      expect(list.empty_state, pageFile).toMatchObject({ title: expect.any(String) });
      expect(api.page.id, apiFile).toBe(pageId);
      expect(readSource.permission, apiFile).toBe('accounting.read');
      expect(readSource.error_states?.transport_error, apiFile).toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
      expect(String(readSource.query), apiFile).toContain(":fixture_state <> 'empty'");
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
    }
  });

  test('returns deterministic default and empty data, and a stable transport error', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_errors_next_schema_migrations', ['schema', 'data']);

    for (const [, , apiFile, sourceId] of reportAndCatalogScreens) {
      const definition = source(apiFile, sourceId);
      const initial = await repository.querySource(definition, { q: null, fixture_state: null }, 0, 50);
      expect(initial).toHaveProperty('data');
      const empty = await repository.querySource(definition, { q: null, fixture_state: 'empty' }, 0, 50);
      expect(empty.data).toEqual([]);
      let failure: unknown;
      try {
        await repository.querySource(definition, { q: null, fixture_state: 'transport_error' }, 0, 50);
      } catch (error) {
        failure = error;
      }
      expect(String((failure as any)?.message || failure)).toContain('Accounting data service is temporarily unavailable');
    }
  });

  test('adds invoice form tabs, a partner relation control, and the same source states', async () => {
    const page = yaml('pages/invoice-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const api = yaml('api/invoice-detail.yaml');
    const detail = api.datasources.find((candidate: any) => candidate.id === 'accounting_invoice_detail');
    const edit = api.actions.find((candidate: any) => candidate.id === 'edit_accounting_invoice');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe('invoice-detail');
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Invoice Lines', 'Other Info']);
    expect(form.groups.flatMap((group: any) => group.fields).find((field: any) => field.field === 'partner_name')).toMatchObject({ type: 'select' });
    expect(edit.fields.find((field: any) => field.field === 'partner_name')).toMatchObject({ type: 'select' });
    expect(detail.error_states?.transport_error).toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
    expect(String(detail.query)).toContain('line_count');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_invoice_detail_errors_schema_migrations', ['schema', 'data']);
    const initial = await repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1);
    expect(initial.data).toMatchObject({ partner_name: 'Gemini Furniture', line_count: 2 });
    const empty = await repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: 'empty' }, 0, 1);
    expect(empty.data).toEqual({});
    let failure: unknown;
    try {
      await repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: 'transport_error' }, 0, 1);
    } catch (error) {
      failure = error;
    }
    expect(String((failure as any)?.message || failure)).toContain('Accounting data service is temporarily unavailable');
  });
});
