import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting Payment Tokens Odoo action parity', () => {
  test('keeps list and read-only form layouts joined to page-ID API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/payment-tokens.yaml');
    const listApi = yaml('api/payment-tokens.yaml');
    const detailPage = yaml('pages/payment-token-detail.yaml');
    const detailApi = yaml('api/payment-token-detail.yaml');
    const list = listPage.components[0];
    const form = detailPage.components[0];

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(listPage.page.auth.require).toEqual(['accounting.read']);
    expect(list.source).toBe('accounting_payment_tokens');
    expect(list.filters).toEqual([{ field: 'active', label: 'Status', options: [{ id: 'active', label: 'Active' }, { id: 'archived', label: 'Archived' }] }]);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Payment Details', 'Partner', 'Payment Method', 'Provider', 'Provider Reference', 'Company']);
    expect(list.row_open_action).toBe('view_accounting_payment_token');
    expect(list.row_double_click_action).toBe('view_accounting_payment_token');
    expect(form.editable).toBe(false);
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual([
      'Payment Details', 'Payment Method', 'Partner', 'Provider', 'Provider Reference', 'Company',
    ]);
    expect(form.notebook).toBeUndefined();
    expect(detailPage.page.auth.require).toEqual(['accounting.read']);
    expect(listApi.page.id).toBe('payment-tokens');
    expect(detailApi.page.id).toBe('payment-token-detail');
    expect(discovered.pageDatasources.get('payment-tokens')).toContain('accounting_payment_tokens');
    expect(discovered.pageDatasources.get('payment-token-detail')).toContain('accounting_payment_token_detail');
  });

  test('returns deterministic active, archived, search, empty, missing, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'accounting_payment_tokens_parity_schema_migrations', ['schema', 'data']);
    const listSource = yaml('api/payment-tokens.yaml').datasources[0];
    const detailSource = yaml('api/payment-token-detail.yaml').datasources[0];

    const active = await repository.querySource(listSource, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(active.data.map((row: any) => row.id)).toEqual([
      'payment-token-acme-sepa', 'payment-token-azure-card', 'payment-token-gemini-card',
    ]);
    expect((await repository.querySource(listSource, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'payment-token-deco-archived', 'payment-token-inactive-provider',
    ]);
    expect((await repository.querySource(listSource, { q: 'Azure', active: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(listSource, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detailSource, { id: 'payment-token-azure-card', fixture_state: null }, 0, 1)).toMatchObject({
      data: { payment_details: '•••• 1111', partner: 'Azure Interior', provider: 'Stripe', transaction_count: 2 },
    });
    expect((await repository.querySource(detailSource, { id: 'missing-payment-token', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(detailSource, { id: 'payment-token-azure-card', fixture_state: 'empty' }, 0, 1)).data).toEqual({});

    let failure: unknown;
    try {
      await repository.querySource(listSource, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50);
    } catch (error) {
      failure = error;
    }
    expect(String((failure as any)?.message || failure)).toContain('Accounting data service is temporarily unavailable');
  });

  test('keeps Odoo read-only creation/editing semantics while guarding writes', () => {
    const listActions = yaml('api/payment-tokens.yaml').actions;
    const names = listActions.map((action: any) => action.id);
    expect(names).toEqual([
      'view_accounting_payment_token',
      'archive_accounting_payment_token',
      'restore_accounting_payment_token',
      'delete_accounting_payment_token',
    ]);
    expect(listActions.find((action: any) => action.id === 'view_accounting_payment_token')).toMatchObject({ type: 'navigate', permission: 'accounting.read' });
    expect(listActions.some((action: any) => action.operation === 'create')).toBe(false);
    expect(listActions.some((action: any) => action.action?.endsWith('.update'))).toBe(false);
    for (const id of ['archive_accounting_payment_token', 'restore_accounting_payment_token', 'delete_accounting_payment_token']) {
      const action = listActions.find((candidate: any) => candidate.id === id);
      expect(action.permission, id).toBe('accounting.write');
      expect(action.mutation.concurrency, id).toEqual({ required: true });
    }
    const restore = listActions.find((action: any) => action.id === 'restore_accounting_payment_token');
    expect(restore.mutation.guards).toEqual([
      expect.objectContaining({ status: 404, code: 'ACCOUNTING_PAYMENT_TOKEN_NOT_FOUND' }),
      expect.objectContaining({ status: 409, code: 'ACCOUNTING_PAYMENT_TOKEN_RESTORE_FORBIDDEN' }),
    ]);
    expect(yaml('api/payment-token-detail.yaml').datasources[0].permission).toBe('accounting.read');
  });
});
